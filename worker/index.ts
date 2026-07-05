import "dotenv/config";
import { createRequire } from "node:module";
import { writeFileSync, mkdirSync, existsSync, unlinkSync } from "node:fs";
import path from "node:path";
import http from "node:http";
import { WebJSAdapter } from "../src/lib/server/whatsapp/webjs-adapter.js";
import { findChromeExecutable } from "../src/lib/server/whatsapp/chrome-helper.js";
import { PORTS } from "../src/lib/server/ports.js";
import { getDb } from "../src/lib/server/db/index.js";
import { classifyMessage } from "../src/lib/server/classifier/index.js";
import { maybeAutoReply } from "../src/lib/server/auto-reply/index.js";
import { processNextOutgoing, enqueueOutgoing, getOutboxStats } from "../src/lib/server/whatsapp/outbox.js";
import { isBusinessHour } from "../src/lib/server/whatsapp/business-hours.js";
import { checkContactPolicy, getOrCreatePolicy } from "../src/lib/server/whatsapp/contact-policy.js";

const require = createRequire(import.meta.url);
const QRCodeTerminal = require("qrcode-terminal");
import QRCode from "qrcode";

const STATUS_FILE = path.resolve(".whatsapp-status.json");
const QR_DIR = path.resolve(".qr-temp");
const QR_FILE = path.join(QR_DIR, "qr.png");

function writeStatus(status: string, qrCode?: string) {
  try {
    writeFileSync(STATUS_FILE, JSON.stringify({ status, qrCode, updatedAt: new Date().toISOString() }));
  } catch {}
}

const SOURCE_NAME = process.env.WHATSAPP_SOURCE_NAME || "Grup Support IT";
const WORKER_START_TIME = Date.now();

async function main() {
  const db = getDb();

  let source = await db.whatsAppSource.findFirst({ where: { name: SOURCE_NAME } });
  if (!source) {
    const waPhone = process.env.WHATSAPP_PHONE;
    if (!waPhone) {
      console.error("");
      console.error(" Env WHATSAPP_PHONE tidak diset.");
      console.error(" Set WHATSAPP_PHONE di .env file sebelum menjalankan worker.");
      console.error("");
      process.exit(1);
    }
    source = await db.whatsAppSource.create({
      data: {
        name: SOURCE_NAME,
        type: "group",
        phone: waPhone,
        active: true,
        description: "Auto-created by worker",
      },
    });
    console.log(`[Worker] Source "${SOURCE_NAME}" dibuat otomatis.`);
  }

  const chromePath = findChromeExecutable();
  if (!chromePath) {
    console.error("");
    console.error(" Chrome/Chromium tidak ditemukan.");
    console.error(" Jalankan perintah berikut untuk menginstall:");
    console.error("   npx puppeteer browsers install chrome");
    console.error("");
    process.exit(1);
  }

  console.log(`Starting WhatsApp reader for: ${source.name}`);
  const adapter = new WebJSAdapter(source.id, chromePath);

  adapter.onStatusChange((state) => {
    writeStatus(state.status, state.qrCode);

    if (state.qrCode) {
      if (!existsSync(QR_DIR)) mkdirSync(QR_DIR, { recursive: true });
      QRCode.toFile(QR_FILE, state.qrCode, { type: "png", width: 300, margin: 2, color: { dark: "#111827", light: "#ffffff" } }).catch(() => {});
      // Hapus QR setelah 30 detik jika tidak ter-scan
      setTimeout(() => {
        if (adapter.getStatus().status !== "connected") {
          try { if (existsSync(QR_FILE)) unlinkSync(QR_FILE); } catch {}
        }
      }, 30_000);
    }

    if (state.status === "connected") {
      console.log(`[${new Date().toISOString()}] WhatsApp terhubung. Worker berjalan di background. Tekan Ctrl+C untuk stop.`);
      try { if (existsSync(QR_FILE)) unlinkSync(QR_FILE); } catch {}
    } else if (state.status === "expired") {
      console.log(" Sesi expired. Restart otomatis dalam 3 detik oleh adapter...");
      writeStatus("restarting");
    } else {
      console.log(`[${new Date().toISOString()}] Status: ${state.status}`);
    }

    if (state.qrCode) {
      console.log("\nScan QR code below with WhatsApp to authenticate:\n");
      QRCodeTerminal.generate(state.qrCode, { small: true });
      console.log("");
    }
  });

  adapter.onMessage(async (msg) => {
    try {
      const classification = await classifyMessage({
        body: msg.body,
        fromName: msg.fromName || msg.fromPhone,
        previousMessages: [],
      });

      if (classification.is_support_related) {
        await db.whatsAppMessage.update({
          where: { id: msg.id },
          data: {
            isSupportRelated: true,
            messageType: classification.message_type,
            category: classification.category,
            priority: classification.priority,
            confidence: classification.confidence,
            evidence: JSON.stringify(classification.evidence),
            uncertainty: JSON.stringify(classification.uncertainty),
            summary: classification.summary,
            isProcessed: true,
          },
        });

        await db.auditLog.create({
          data: {
            action: "message.classify",
            entity: "message",
            entityId: msg.id,
            detail: JSON.stringify(classification),
          },
        });

        await maybeAutoReply(adapter, msg, {
          summary: classification.summary || undefined,
        });
      }
    } catch (e) {
      console.error("Error processing message:", e);
    }
  });

  const API_PORT = parseInt(process.env.WORKER_API_PORT || String(PORTS.worker));
  const apiServer = http.createServer(async (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      res.end();
      return;
    }

    try {
      const url = req.url || "";
      const parsedUrl = new URL(url, `http://localhost:${API_PORT}`);
      const path = parsedUrl.pathname;

      if (req.method === "GET" && path === "/api/groups") {
        const groups = await adapter.getGroups();
        res.end(JSON.stringify({ data: groups }));
      } else if (req.method === "GET" && path === "/api/contacts") {
        const contacts = await adapter.getContacts();
        res.end(JSON.stringify({ data: contacts }));
      } else if (req.method === "GET" && path.startsWith("/api/chat/")) {
        const chatId = decodeURIComponent(path.replace("/api/chat/", ""));
        const limit = parseInt(parsedUrl.searchParams.get("limit") || "200");
        const messages = await adapter.getMessages(chatId, limit);
        res.end(JSON.stringify({ data: messages }));
      } else if (req.method === "GET" && path.startsWith("/api/profile-pic/")) {
        const chatId = decodeURIComponent(path.replace("/api/profile-pic/", ""));
        const pic = await adapter.getProfilePic(chatId);
        res.end(JSON.stringify({ data: pic }));
      } else if (req.method === "POST" && path === "/api/send") {
        let body = "";
        req.on("data", (chunk: string) => (body += chunk));
        req.on("end", async () => {
          const { chatId, text, phone } = JSON.parse(body);
          if (!chatId || !text) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: "Missing chatId or text" }));
            return;
          }
          const result = await enqueueOutgoing({
            chatId,
            phone: phone || chatId.replace(/@[cg]\.us$/, ""),
            message: text,
            source: "manual_api",
          });
          if (!result.success) {
            res.statusCode = 429;
            res.end(JSON.stringify({ error: result.error, blockedReason: result.blockedReason }));
            return;
          }
          res.end(JSON.stringify({ ok: true, outboxId: result.outboxId }));
        });
        return;
      } else if (req.method === "GET" && path === "/api/me") {
        const me = adapter.getMe();
        res.end(JSON.stringify({ data: me }));
      } else if (req.method === "GET" && path === "/api/status") {
        const state = adapter.getStatus();
        res.end(JSON.stringify({ data: { status: state.status, qrCode: state.qrCode } }));
      } else if (req.method === "POST" && path === "/api/disconnect") {
        await adapter.disconnect();
        writeStatus("disconnected");
        res.end(JSON.stringify({ ok: true }));
      } else if (req.method === "POST" && path === "/api/reconnect") {
        await adapter.restart();
        const state = adapter.getStatus();
        writeStatus(state.status, state.qrCode);
        res.end(JSON.stringify({ data: { status: state.status, qrCode: state.qrCode } }));
      } else if (req.method === "GET" && path === "/api/session/info") {
        const info = adapter.getSessionInfo();
        res.end(JSON.stringify({ data: info }));
      } else if (req.method === "POST" && path === "/api/session/clear") {
        await adapter.clearSession();
        const state = adapter.getStatus();
        res.end(JSON.stringify({ data: { status: state.status } }));
      } else if (req.method === "GET" && path === "/api/outbox") {
        const stats = await getOutboxStats();
        const statusFilter = parsedUrl.searchParams.get("status") || "pending";
        const limit = parseInt(parsedUrl.searchParams.get("limit") || "50");
        const db = getDb();
        const items = await db.whatsAppOutbox.findMany({
          where: statusFilter === "all" ? {} : { status: statusFilter },
          orderBy: { createdAt: "desc" },
          take: limit,
        });
        res.end(JSON.stringify({ data: { stats, items } }));
      } else if (req.method === "GET" && path === "/api/contacts/policy") {
        const db = getDb();
        const policies = await db.whatsAppContactPolicy.findMany({
          orderBy: { updatedAt: "desc" },
          take: 100,
        });
        res.end(JSON.stringify({ data: policies }));
      } else if (req.method === "POST" && path === "/api/outbox/retry") {
        let body = "";
        req.on("data", (chunk: string) => (body += chunk));
        req.on("end", async () => {
          const { id } = JSON.parse(body);
          if (!id) { res.statusCode = 400; res.end(JSON.stringify({ error: "Missing id" })); return; }
          const db = getDb();
          await db.whatsAppOutbox.update({
            where: { id },
            data: { status: "pending", retryCount: 0, errorMessage: null },
          });
          res.end(JSON.stringify({ ok: true }));
        });
        return;
      } else if (req.method === "GET" && path === "/api/health") {
        const state = adapter.getStatus();
        const info = adapter.getReconnectInfo();
        res.end(JSON.stringify({
          data: {
            status: state.status,
            qrCode: state.qrCode,
            sourceName: SOURCE_NAME,
            uptime: Date.now() - WORKER_START_TIME,
            reconnectAttempts: info.reconnectAttempts,
            maxReconnectAttempts: info.maxReconnectAttempts,
          },
        }));
      } else {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: "Not found" }));
      }
    } catch (e) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: (e as Error).message }));
    }
  });

  apiServer.listen(API_PORT, "127.0.0.1", () => {
    console.log(`Worker API listening on http://127.0.0.1:${API_PORT}`);
  });

  let lastDisconnectedTime = 0;
  let sessionLogoutAlertSent = false;
  let consecutiveFailLogSent = false;

  async function processOutboxLoop() {
    while (true) {
      try {
        if (adapter.getStatus().status === "connected") {
          await processNextOutgoing((chatId, text) => adapter.sendMessage(chatId, text));
        }
      } catch (e) {
        console.error("[Outbox] Process error:", (e as Error).message);
      }
      await new Promise((r) => setTimeout(r, 5000 + Math.random() * 5000));
    }
  }
  processOutboxLoop().catch((e) => console.error("[Outbox] Loop fatal:", e));

  async function monitorAlerts() {
    while (true) {
      try {
        const status = adapter.getStatus().status;
        if (status === "disconnected" || status === "expired") {
          if (lastDisconnectedTime === 0) lastDisconnectedTime = Date.now();
          if (Date.now() - lastDisconnectedTime > 300_000 && !sessionLogoutAlertSent) {
            console.error("[ALERT] Session WhatsApp terputus >5 menit — butuh intervensi manual!");
            sessionLogoutAlertSent = true;
            const db = getDb();
            await db.auditLog.create({
              data: { action: "connection.stuck", entity: "worker", detail: JSON.stringify({ status, durationMs: Date.now() - lastDisconnectedTime }) },
            }).catch(() => {});
          }
        } else {
          lastDisconnectedTime = 0;
          sessionLogoutAlertSent = false;
        }

        if (status === "connected") {
          const db = getDb();
          const recentFailed = await db.whatsAppOutbox.count({
            where: { status: "failed", updatedAt: { gte: new Date(Date.now() - 3600_000) } },
          }).catch(() => 0);
          if (recentFailed >= 5 && !consecutiveFailLogSent) {
            console.error("[ALERT] %d pesan gagal dalam 1 jam terakhir — kemungkinan ada masalah teknis!", recentFailed);
            consecutiveFailLogSent = true;
            await db.auditLog.create({
              data: { action: "outbox.failure_spike", entity: "outbox", detail: JSON.stringify({ recentFailed, windowMinutes: 60 }) },
            }).catch(() => {});
          } else if (recentFailed < 5) {
            consecutiveFailLogSent = false;
          }
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 30_000));
    }
  }
  monitorAlerts().catch((e) => console.error("[Monitor] Fatal:", e));

  try {
    await adapter.connect();
  } catch (e) {
    console.error(`[Worker] Failed to connect WhatsApp: ${(e as Error).message}`);
    console.log("Worker will stay running — QR/retry flow handles reconnection.");
  }
  if (adapter.getStatus().status !== "connected") {
    console.log("Worker running. Menunggu scan QR...");
  }

  process.on("SIGINT", async () => {
    console.log("Shutting down...");
    apiServer.close();
    await adapter.disconnect();
    process.exit(0);
  });
}

main().catch((e) => {
  const msg = (e as Error).message || "";
  if (msg.includes("Failed to launch the browser process") || msg.includes("Cannot find") || msg.includes("Chrome")) {
    console.error("");
    console.error(" Gagal menjalankan Chrome/Puppeteer.");
    console.error(" Pastikan Chrome terinstall, atau jalankan:");
    console.error("   npx puppeteer browsers install chrome");
    console.error("");
  } else {
    console.error("Worker failed:", e);
  }
  process.exit(1);
});
