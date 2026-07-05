import { describe, it, expect, vi, beforeEach } from "vitest";
import { EventEmitter } from "node:events";

function createMockProcess() {
  const p = new EventEmitter() as any;
  p.pid = 12345;
  p.killed = false;
  p.stdout = new EventEmitter();
  p.stderr = new EventEmitter();
  p.kill = vi.fn();
  return p;
}

const mockProcess = createMockProcess();

vi.mock("node:child_process", () => ({
  spawn: vi.fn(() => mockProcess),
}));

vi.mock("../src/lib/server/db/index.js", () => ({
  getDb: vi.fn(() => ({
    appSetting: {
      findUnique: vi.fn().mockResolvedValue({ key: "wa_worker_auto_restart", value: "true" }),
    },
  })),
}));

vi.mock("node:fs", () => ({
  existsSync: vi.fn(() => true),
  mkdirSync: vi.fn(),
  appendFileSync: vi.fn(),
}));

describe("WorkerManager", () => {
  let manager: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("starts with stopped state", async () => {
    const { workerManager } = await import("../src/lib/server/worker-manager.js");
    expect(workerManager.running).toBe(false);
    expect(workerManager.pid).toBeNull();
    expect(workerManager.uptime).toBe(0);
  });

  it("start() returns ok and sets running state", async () => {
    const { workerManager } = await import("../src/lib/server/worker-manager.js");
    const result = await workerManager.start();

    expect(result.ok).toBe(true);
    expect(result.pid).toBe(12345);
    expect(workerManager.running).toBe(true);
  });

  it("start() returns ok=false if already running", async () => {
    const { workerManager } = await import("../src/lib/server/worker-manager.js");
    await workerManager.start();
    const result = await workerManager.start();
    expect(result.ok).toBe(false);
  });

  it("getInfo() returns state details", async () => {
    const { workerManager } = await import("../src/lib/server/worker-manager.js");
    await workerManager.start();
    const info = workerManager.getInfo();
    expect(info.running).toBe(true);
    expect(info.pid).toBe(12345);
    expect(typeof info.uptime).toBe("number");
    expect(info.startTime).toBeGreaterThan(0);
  });

  it("stop() sends SIGTERM and resolves", async () => {
    const { workerManager } = await import("../src/lib/server/worker-manager.js");
    await workerManager.start();

    const result = await workerManager.stop();
    expect(result.ok).toBe(true);

    const { spawn } = await import("node:child_process");
    const calledProcess = (spawn as any).mock.results[0]?.value;
    expect(calledProcess?.kill).toHaveBeenCalledWith("SIGTERM");
  });

  it("stop() returns ok=false when not running", async () => {
    const { workerManager } = await import("../src/lib/server/worker-manager.js");
    // Clear the test's workerManager reference - resetModules handles this
    const result = await workerManager.stop();
    expect(result.ok).toBe(false);
  });

  it("lastStatus returns initial status", async () => {
    const { workerManager } = await import("../src/lib/server/worker-manager.js");
    expect(workerManager.lastStatus()).toBe("stopped");
  });
});
