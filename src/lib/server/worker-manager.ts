import { spawn, execSync, type ChildProcess } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import net from "node:net";
import { getDb } from "./db/index.js";

const PROJECT_ROOT = process.cwd();
const WORKER_SCRIPT = path.resolve(PROJECT_ROOT, "worker/index.ts");
const LOG_DIR = path.resolve(PROJECT_ROOT, "worker/logs");
const WORKER_PORT = parseInt(process.env.WORKER_API_PORT || "9494");

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
}

function logFile(): string {
  const date = new Date().toISOString().slice(0, 10);
  return path.join(LOG_DIR, `${date}.log`);
}

const PHONE_RE = /(\+?62|0?8)[0-9]{7,14}/g;
const QR_RE = /qr|qrcode|scan|2fa|otp|whatsapp.*code/i;

function sanitize(line: string): string {
  let s = line.replace(PHONE_RE, (m) => m.slice(0, 4) + "****" + m.slice(-3));
  if (QR_RE.test(s)) s = "[SANITIZED: potential QR/sensitive data]";
  return s;
}

function writeLog(level: string, text: string) {
  try {
    ensureLogDir();
    const ts = new Date().toISOString();
    const lines = text.split("\n").filter(Boolean);
    const entry = lines.map((l) => `${ts} [${level}] ${sanitize(l)}`).join("\n") + "\n";
    fs.appendFileSync(logFile(), entry, "utf-8");
  } catch { /* best-effort */ }
}

interface LatencyPoint {
  ts: number;
  latency: number;
  status: string;
}

function checkPort(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close();
      resolve(true);
    });
    server.listen(port, "127.0.0.1");
  });
}

function killProcessOnPort(port: number): void {
  try {
    if (process.platform === "win32") {
      const r = execSync(`netstat -ano | findstr :${port}`, { encoding: "utf8", timeout: 3000 });
      for (const line of r.split("\n")) {
        const m = line.trim().match(/(\d+)$/);
        if (m) {
          try { execSync(`taskkill /F /PID ${m[1]}`, { timeout: 3000 }); } catch {}
        }
      }
    } else {
      const r = execSync(`lsof -ti:${port} 2>/dev/null`, { encoding: "utf8", timeout: 3000 });
      if (r.trim()) {
        for (const pid of r.trim().split("\n")) {
          try { execSync(`kill -9 ${pid}`, { timeout: 3000 }); } catch {}
        }
      }
    }
  } catch { /* best-effort */ }
}

class WorkerManager {
  private process: ChildProcess | null = null;
  private startTime: number = 0;
  private stopping: boolean = false;
  private lastKnownStatus: string = "stopped";
  private latencyHistory: LatencyPoint[] = [];
  private latencyInterval: ReturnType<typeof setInterval> | null = null;
  private crashTimestamps: number[] = [];
  private crashLoopDisabled: boolean = false;
  private static readonly CRASH_WINDOW = 30_000;
  private static readonly CRASH_THRESHOLD = 3;

  get running(): boolean {
    return this.process !== null && !this.process.killed;
  }

  get pid(): number | null {
    return this.process?.pid ?? null;
  }

  get uptime(): number {
    return this.running ? Date.now() - this.startTime : 0;
  }

  private async shouldAutoRestart(): Promise<boolean> {
    try {
      const db = getDb();
      const setting = await db.appSetting.findUnique({ where: { key: "wa_worker_auto_restart" } });
      return setting?.value !== "false";
    } catch {
      return true;
    }
  }

  async recordLatency(point: { latency: number; status: string }) {
    this.latencyHistory.push({ ts: Date.now(), ...point });
    const cutoff = Date.now() - 25 * 60 * 60 * 1000;
    this.latencyHistory = this.latencyHistory.filter((p) => p.ts > cutoff);
  }

  getLatencyHistory(): LatencyPoint[] {
    return this.latencyHistory;
  }

  private isCrashLoop(): boolean {
    const now = Date.now();
    this.crashTimestamps = this.crashTimestamps.filter((t) => now - t < WorkerManager.CRASH_WINDOW);
    return this.crashTimestamps.length >= WorkerManager.CRASH_THRESHOLD;
  }

  async start(): Promise<{ ok: boolean; pid: number | null; error?: string }> {
    if (this.running) {
      return { ok: false, pid: this.pid, error: "Worker sudah berjalan" };
    }

    if (this.crashLoopDisabled) {
      return { ok: false, pid: null, error: "Auto-restart dinonaktifkan karena crash loop. Stop & start manual required." };
    }

    const portFree = await checkPort(WORKER_PORT);
    if (!portFree) {
      writeLog("WARN", `Port ${WORKER_PORT} sudah terpakai, mencoba kill occupying process`);
      console.log(`[WorkerManager] Port ${WORKER_PORT} already in use. Attempting to kill occupying process...`);
      killProcessOnPort(WORKER_PORT);
      await new Promise((r) => setTimeout(r, 2000));
      const retryFree = await checkPort(WORKER_PORT);
      if (!retryFree) {
        writeLog("ERROR", `Port ${WORKER_PORT} masih terpakai setelah kill attempt`);
        return { ok: false, pid: null, error: `Port ${WORKER_PORT} masih terpakai. Matikan proses lain secara manual.` };
      }
    }

    this.stopping = false;
    this.startTime = Date.now();
    this.lastKnownStatus = "starting";

    const tsxCli = path.resolve(PROJECT_ROOT, "node_modules/tsx/dist/cli.mjs");

    this.process = spawn(
      process.execPath,
      [tsxCli, WORKER_SCRIPT],
      {
        stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env },
        cwd: PROJECT_ROOT,
      }
    );

    this.process.stdout?.on("data", (data: Buffer) => {
      const text = data.toString().trim();
      if (text) {
        writeLog("INFO", text);
        console.log(`[Worker] ${text}`);
      }
    });

    this.process.stderr?.on("data", (data: Buffer) => {
      const text = data.toString().trim();
      if (text) {
        writeLog("ERROR", text);
        console.error(`[Worker:err] ${text}`);
      }
    });

    this.process.on("exit", async (code, signal) => {
      const pid = this.process?.pid;
      this.process = null;
      this.startTime = 0;
      this.lastKnownStatus = code === 0 ? "stopped" : "crashed";

      writeLog("INFO", `Worker exited (pid=${pid}, code=${code}, signal=${signal})`);

      if (!this.stopping && code !== 0) {
        this.crashTimestamps.push(Date.now());
        if (this.isCrashLoop()) {
          this.crashLoopDisabled = true;
          writeLog("ERROR", `Crash loop detected (${WorkerManager.CRASH_THRESHOLD}+ crashes in ${WorkerManager.CRASH_WINDOW / 1000}s). Auto-restart disabled.`);
          console.log(`[WorkerManager] Crash loop detected. Auto-restart disabled. Manual restart required.`);
          this.lastKnownStatus = "crashed";
          return;
        }

        const autoRestart = await this.shouldAutoRestart();
        if (autoRestart) {
          this.lastKnownStatus = "restarting";
          writeLog("INFO", "Auto-restarting in 3s...");
          console.log(`[WorkerManager] Worker exited (pid=${pid}, code=${code}, signal=${signal}). Auto-restarting in 3s...`);
          await new Promise((r) => setTimeout(r, 3000));
          this.start();
        } else {
          console.log(`[WorkerManager] Worker exited (pid=${pid}, code=${code}). Auto-restart disabled.`);
        }
      } else if (!this.stopping && code === 0) {
        this.crashTimestamps = [];
        this.crashLoopDisabled = false;
      }
    });

    this.process.on("error", (err) => {
      writeLog("ERROR", `Failed to start worker: ${err.message}`);
      console.error(`[WorkerManager] Failed to start worker: ${err.message}`);
      this.process = null;
      this.startTime = 0;
      this.lastKnownStatus = "error";
    });

    return { ok: true, pid: this.pid };
  }

  async stop(): Promise<{ ok: boolean }> {
    if (!this.running || !this.process) {
      if (!this.running) {
        this.crashTimestamps = [];
        this.crashLoopDisabled = false;
        this.lastKnownStatus = "stopped";
      }
      return { ok: false, error: "Worker tidak berjalan" };
    }

    this.stopping = true;
    this.lastKnownStatus = "stopping";

    return new Promise((resolve) => {
      const killTimer = setTimeout(() => {
        if (this.process && !this.process.killed) {
          writeLog("WARN", "SIGTERM timeout, sending SIGKILL");
          this.process.kill("SIGKILL");
        }
        resolve({ ok: true });
      }, 5000);

      this.process!.once("exit", () => {
        clearTimeout(killTimer);
        this.process = null;
        this.startTime = 0;
        this.crashTimestamps = [];
        this.crashLoopDisabled = false;
        this.lastKnownStatus = "stopped";
        resolve({ ok: true });
      });

      this.process!.kill("SIGTERM");
    });
  }

  getInfo(): { running: boolean; pid: number | null; uptime: number; startTime: number } {
    return {
      running: this.running,
      pid: this.pid,
      uptime: this.uptime,
      startTime: this.startTime,
    };
  }

  lastStatus(): string {
    return this.lastKnownStatus;
  }
}

export const workerManager = new WorkerManager();
