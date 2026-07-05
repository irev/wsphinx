import "dotenv/config";
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
import http from "node:http";
import { WebJSAdapter } from "../src/lib/server/whatsapp/webjs-adapter.js";
import { findChromeExecutable } from "../src/lib/server/whatsapp/chrome-helper.js";
import { getDb } from "../src/lib/server/db/index.js";
import { classifyMessage } from "../src/lib/server/classifier/index.js";
import { maybeAutoReply } from "../src/lib/server/auto-reply/index.js";

const require = createRequire(import.meta.url);
const QRCode = require("qrcode");

const STATUS_FILE = "./.whatsapp-status.json";

function writeStatus(status: string, qrCode?: string) {
  try {
    writeFileSync(STATUS_FILE, JSON.stringify({ status, qrCode, updatedAt: new Date().toISOString() }));
  } catch {}
}

const SOURCE_NAME = process.env.WHATSAPP_SOURCE_NAME || "Grup Support IT";
const WORKER_START_TIME = Date.now();

function renderCompactQR(text: string): string {
  try {
    const qrData = QRCode.create(text);
    const size = qrData.modules.size;
    const data = qrData.modules.data;
    const black = "\x1b[40m \x1b[0m";
    const white = "\x1b[47m \x1b[0m";
    const margin = Array(size + 1).join(white);
    let out = margin + "\n";
    for (let y = 0; y < size; y++) {
      out += white;
      for (let x = 0; x < size; x++) {
        out += data[y * size + x] ? black : white;
      }
      out += "\n";
    }
    out += margin;
    return out;
  } catch {
    return text;
  }
}

async function main() {
  const db = getDb();

  let source = await db.whatsAppSource.findFirst({ where: { name: SOURCE_NAME } });
  if (!source) {
    source = await db.whatsAppSource.create({
      data: {
        name: SOURCE_NAME,
        type: "group",
        phone: process.env.WHATSAPP_PHONE || "6281111111111",
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
    if (state.status === "connected") {
      console.log(`[${new Date().toISOString()}] WhatsApp terhubung. Worker berjalan di background. Tekan Ctrl+C untuk stop.`);
    } else {
      console.log(`[${new Date().toISOString()}] Status: ${state.status}`);
    }
    if (state.qrCode) {
      console.log("\nScan QR code below with WhatsApp to authenticate:\n");
      console.log(renderCompactQR(state.qrCode));
      console.log("");
    }
    if (state.status === "expired") {
      console.log(" Sesi expired. Restart otomatis dalam 3 detik oleh adapter...");
      writeStatus("restarting");
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

  const API_PORT = parseInt(process.env.WORKER_API_PORT || "3457");
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
          const { chatId, text } = JSON.parse(body);
          if (!chatId || !text) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: "Missing chatId or text" }));
            return;
          }
          await adapter.sendMessage(chatId, text);
          res.end(JSON.stringify({ ok: true }));
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

  await adapter.connect();
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
