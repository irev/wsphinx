import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
const require = createRequire(import.meta.url);

// Stealth plugin — override puppeteer require cache before whatsapp-web.js loads it
const puppeteerExtra = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
puppeteerExtra.use(StealthPlugin());
const puppeteerPath = require.resolve("puppeteer");
if (require.cache?.[puppeteerPath]) {
  require.cache[puppeteerPath].exports = puppeteerExtra;
}

const { Client, LocalAuth } = require("whatsapp-web.js");
type Message = import("whatsapp-web.js").Message;
import type {
  WhatsAppReader,
  WhatsAppMessage,
  ConnectionState,
  ConnectionStatus,
  MessageHandler,
  StatusChangeHandler,
} from "./adapter.js";
import { findChromeExecutable } from "./chrome-helper.js";
import { getDb } from "../db/index.js";

export class WebJSAdapter implements WhatsAppReader {
  readonly name = "whatsapp-web.js";
  private client: InstanceType<typeof Client>;
  private status: ConnectionStatus = "initializing";
  private qrCode: string | undefined;
  private messageHandlers: MessageHandler[] = [];
  private statusHandlers: StatusChangeHandler[] = [];
  private sourceId: string;
  private chromePath: string | undefined;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private disconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private restarting = false;
  private restartTimeout: ReturnType<typeof setTimeout> | null = null;
  private messageQueue: WhatsAppMessage[] = [];
  private processing = false;

  private static USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0",
  ];

  private static VIEWPORTS = [
    { width: 1280, height: 720 },
    { width: 1366, height: 768 },
    { width: 1440, height: 900 },
    { width: 1920, height: 1080 },
  ];

  private static pickRandom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  constructor(sourceId: string, chromePath?: string) {
    this.sourceId = sourceId;
    this.chromePath = chromePath || findChromeExecutable() || undefined;
    this.client = this.createClient();
    this.setupListeners();
  }

  private createClient() {
    const ua = WebJSAdapter.pickRandom(WebJSAdapter.USER_AGENTS);
    const vp = WebJSAdapter.pickRandom(WebJSAdapter.VIEWPORTS);
    const puppeteerOpts: Record<string, unknown> = {
      headless: "new",
      protocolTimeout: 180_000,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-gpu",
        "--disable-blink-features=AutomationControlled",
        `--user-agent=${ua}`,
        `--window-size=${vp.width},${vp.height}`,
      ],
    };
    if (this.chromePath) {
      puppeteerOpts.executablePath = this.chromePath;
    }
    return new Client({
      authStrategy: new LocalAuth({
        clientId: this.sourceId,
        dataPath: "./.session-data",
      }),
      puppeteer: puppeteerOpts,
    });
  }

  private setupListeners() {
    this.client.on("qr", (qr: string) => {
      this.reconnectAttempts = 0;
      this.qrCode = qr;
      this.status = "scanning_qr";
      this.emitStatus({ status: "scanning_qr", qrCode: qr });
    });

    this.client.on("ready", async () => {
      this.reconnectAttempts = 0;
      this.status = "connected";
      this.qrCode = undefined;
      this.emitStatus({ status: "connected" });
      await this.syncGroupSources();
    });

    this.client.on("disconnected", async (reason: any) => {
      this.status = "disconnected";
      this.emitStatus({ status: "disconnected" });
      console.error(`WhatsApp disconnected (${reason}). Auto-reconnect in 5s...`);
      await this.scheduleReconnect();
    });

    this.client.on("auth_failure", (msg: any) => {
      if (this.restarting) return;
      this.status = "expired";
      this.emitStatus({ status: "expired" });
      console.error(`WhatsApp auth failure: ${msg}. Akan restart dalam 3 detik...`);
      if (this.disconnectTimeout) clearTimeout(this.disconnectTimeout);
      this.restartTimeout = setTimeout(() => {
        this.restart().catch((e) => console.error("Gagal restart auth:", e.message));
      }, 3000);
    });

    this.client.on("message", async (msg: Message) => {
      if (msg.fromMe) return;

      const chatId = msg.from;

      const db = getDb();
      let source = await db.whatsAppSource.findFirst({ where: { chatId } });

      if (!source) {
        let chatName = chatId;
        try {
          const chat = await msg.getChat();
          chatName = chat.name || chatId;
        } catch {}

        source = await db.whatsAppSource.create({
          data: {
            name: chatName,
            type: chatId.endsWith("@g.us") ? "group" : "contact",
            phone: chatId.split("@")[0],
            chatId,
            active: false,
          },
        });
        console.log(`[WA] Auto-created source: "${source.name}" (${source.active ? "aktif" : "nonaktif"})`);
      }

      let chatName: string | null = null;
      try {
        const chat = await msg.getChat();
        chatName = chat.name || null;
      } catch {}

      const waId = msg.id._serialized || `${msg.timestamp}-${msg.from}-${Math.random().toString(36).slice(2, 8)}`;

      const fromPhone = (msg.author || msg.from)
        .replace("@c.us", "")
        .replace("@g.us", "");

      let fromName: string | null = null;
      try {
        const contact = await msg.getContact();
        fromName = contact.pushname || contact.name || null;
      } catch {}

      // --- Media handling ---
      let mediaPath: string | null = null;
      let mediaType: string | null = null;
      let mediaSize: number | null = null;
      let fileName: string | null = null;
      let body = msg.body;

      if (msg.hasMedia) {
        const saved = await this.saveMediaFile(msg, source.id, waId);
        if (saved) {
          mediaPath = saved.mediaPath;
          mediaType = saved.mediaType;
          mediaSize = saved.mediaSize;
          fileName = saved.fileName;
          const caption = (msg as unknown as { caption?: string }).caption;
          if (caption) {
            body = caption;
          } else if (!body && msg.type) {
            const labels: Record<string, string> = {
              image: "[Gambar]",
              video: "[Video]",
              audio: "[Audio]",
              document: "[Dokumen]",
              sticker: "[Stiker]",
              ptt: "[Pesan Suara]",
              gif: "[GIF]",
            };
            body = labels[msg.type] || `[${msg.type}]`;
          }
        }
      }
      // --- end media handling ---

      const waMsg: WhatsAppMessage = {
        id: waId,
        sourceId: source.id,
        chatId,
        chatName,
        fromPhone,
        fromName,
        body,
        mediaPath,
        mediaType,
        mediaSize,
        fileName,
        timestamp: new Date(msg.timestamp * 1000),
        rawData: JSON.stringify({
          id: msg.id._serialized,
          from: msg.from,
          author: msg.author,
          to: msg.to,
          hasMedia: msg.hasMedia,
          type: msg.type,
        }),
      };

      await this.saveMessage(waMsg);

      if (source.active) {
        this.enqueueMessage(waMsg);
      }
    });
  }

  private async syncGroupSources() {
    try {
      const chats = await this.client.getChats();
      const db = getDb();
      let created = 0;

      for (const chat of chats) {
        if (!chat.isGroup) continue;

        const chatId = chat.id._serialized;
        const exists = await db.whatsAppSource.findFirst({ where: { chatId } });
        if (!exists) {
          await db.whatsAppSource.create({
            data: {
              name: chat.name || chatId,
              type: "group",
              phone: chatId.split("@")[0],
              chatId,
              active: false,
            },
          });
          created++;
        }
      }

      if (created > 0) {
        console.log(`[WA] Sinkronisasi grup selesai: ${created} grup baru ditambahkan (nonaktif)`);
      }
    } catch (e) {
      console.error("[WA] Gagal sinkronisasi grup:", e);
    }
  }

  private async scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("Max reconnect attempts reached. Give up.");
      return;
    }

    const delay = Math.min(5000 * Math.pow(1.5, this.reconnectAttempts), 60000);
    this.reconnectAttempts++;

    console.log(`Reconnecting in ${Math.round(delay / 1000)}s (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    this.disconnectTimeout = setTimeout(async () => {
      if (this.status === "connected") return;
      this.status = "reconnecting";
      this.emitStatus({ status: "reconnecting" });
      try {
        await this.client.destroy().catch(() => {});
        this.client = this.createClient();
        this.setupListeners();
        await this.client.initialize();
      } catch (e) {
        console.error("Reconnect failed:", (e as Error).message);
        await this.scheduleReconnect();
      }
    }, delay);
  }

  private mimeToExt(mime: string): string {
    const map: Record<string, string> = {
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp",
      "image/gif": ".gif",
      "video/mp4": ".mp4",
      "video/webm": ".webm",
      "audio/ogg": ".oga",
      "audio/mp3": ".mp3",
      "audio/mpeg": ".mp3",
      "application/pdf": ".pdf",
      "application/msword": ".doc",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
      "application/vnd.ms-excel": ".xls",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
      "text/plain": ".txt",
      "application/zip": ".zip",
      "application/x-rar-compressed": ".rar",
    };
    return map[mime] || ".bin";
  }

  private async saveMediaFile(msg: Message, sourceId: string, waId: string) {
    try {
      const media = await msg.downloadMedia();
      if (!media || !media.data) return null;

      const ext = this.mimeToExt(media.mimetype);
      const dir = path.join("media", sourceId);
      fs.mkdirSync(dir, { recursive: true });

      let filename = media.filename || `${waId}${ext}`;
      let mediaPath = `${sourceId}/${waId}${ext}`;

      // Documents: preserve original filename
      if (media.filename) {
        const safeName = media.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
        mediaPath = `${sourceId}/${waId}_${safeName}`;
        filename = safeName;
      }

      const fullPath = path.join("media", mediaPath);
      const buffer = Buffer.from(media.data, "base64");
      fs.writeFileSync(fullPath, buffer);

      return {
        mediaPath,
        mediaType: media.mimetype,
        mediaSize: fs.statSync(fullPath).size,
        fileName: filename,
      };
    } catch (e) {
      console.error("[WA] Gagal simpan media:", e);
      return null;
    }
  }

  private enqueueMessage(msg: WhatsAppMessage) {
    this.messageQueue.push(msg);
    if (!this.processing) {
      this.processQueue();
    }
  }

  private async processQueue() {
    this.processing = true;
    while (this.messageQueue.length > 0) {
      const msg = this.messageQueue.shift()!;
      for (const handler of this.messageHandlers) {
        try {
          await handler(msg);
        } catch (e) {
          console.error("[WA] Handler error:", e);
        }
      }
      const delay = 800 + Math.random() * 1700;
      await new Promise((r) => setTimeout(r, delay));
    }
    this.processing = false;
  }

  private async saveMessage(msg: WhatsAppMessage) {
    try {
      const db = getDb();
      await db.whatsAppMessage.upsert({
        where: { id: msg.id },
        create: {
          id: msg.id,
          sourceId: msg.sourceId,
          chatId: msg.chatId,
          chatName: msg.chatName,
          fromPhone: msg.fromPhone,
          fromName: msg.fromName,
          body: msg.body,
          mediaPath: msg.mediaPath,
          mediaType: msg.mediaType,
          mediaSize: msg.mediaSize,
          fileName: msg.fileName,
          timestamp: msg.timestamp,
          rawData: msg.rawData,
        },
        update: {},
      });
    } catch (e) {
      console.error("Failed to save message:", e);
    }
  }

  async connect() {
    await this.client.initialize();
  }

  async disconnect() {
    this.restarting = false;
    if (this.disconnectTimeout) clearTimeout(this.disconnectTimeout);
    if (this.restartTimeout) clearTimeout(this.restartTimeout);
    await this.client.destroy();
    this.status = "disconnected";
    this.emitStatus({ status: "disconnected" });
  }

  async restart() {
    if (this.restarting) return;
    this.restarting = true;
    if (this.disconnectTimeout) clearTimeout(this.disconnectTimeout);
    if (this.restartTimeout) clearTimeout(this.restartTimeout);
    this.reconnectAttempts = 0;
    try {
      await this.client.destroy().catch(() => {});
    } catch {}
    this.client = this.createClient();
    this.setupListeners();
    try {
      await this.client.initialize();
    } catch (e) {
      console.error("Restart initialize gagal:", (e as Error).message);
    }
    this.restarting = false;
  }

  async getGroups(): Promise<import("./adapter.js").GroupInfo[]> {
    const chats = await this.client.getChats();
    const groups = chats.filter((c: any) => c.isGroup);
    return groups.map((g: any) => ({
      chatId: g.id._serialized,
      name: g.name || "Unknown Group",
      description: g.description || null,
      participants: g.participants?.length || 0,
      unreadCount: g.unreadCount || 0,
      lastMessage: g.lastMessage?.body || null,
      timestamp: g.lastMessage?.timestamp ? new Date(g.lastMessage.timestamp * 1000) : null,
    }));
  }

  async getContacts(): Promise<import("./adapter.js").ContactInfo[]> {
    const chats = await this.client.getChats();
    const contacts = chats.filter((c: any) => !c.isGroup);
    return contacts.map((c: any) => ({
      chatId: c.id._serialized,
      name: c.name || null,
      pushname: c.pushname || null,
      phone: c.id._serialized.replace("@c.us", "").replace("@g.us", ""),
      about: c.about || null,
      isBusiness: c.isBusiness || false,
      unreadCount: c.unreadCount || 0,
      lastMessage: c.lastMessage?.body || null,
      timestamp: c.lastMessage?.timestamp ? new Date(c.lastMessage.timestamp * 1000) : null,
    }));
  }

  async getMessages(chatId: string, limit = 100): Promise<import("./adapter.js").WhatsAppMessage[]> {
    const chat = await this.client.getChatById(chatId);
    const msgs: any[] = await chat.fetchMessages({ limit });
    return msgs
      .filter((m: any) => !m.fromMe)
      .map((m: any) => ({
        id: m.id._serialized,
        sourceId: this.sourceId,
        chatId: m.from,
        chatName: chat.name || null,
        fromPhone: (m.author || m.from).replace("@c.us", "").replace("@g.us", ""),
        fromName: null,
        body: m.body || "",
        mediaPath: null,
        mediaType: null,
        mediaSize: null,
        fileName: null,
        timestamp: new Date(m.timestamp * 1000),
        rawData: JSON.stringify({ id: m.id._serialized, from: m.from, author: m.author, type: m.type }),
      }));
  }

  async getProfilePic(chatId: string): Promise<string | null> {
    try {
      const url = await this.client.getProfilePicUrl(chatId);
      if (!url) return null;
      const response = await fetch(url);
      const buffer = await response.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      const mime = response.headers.get("content-type") || "image/jpeg";
      return `data:${mime};base64,${base64}`;
    } catch {
      return null;
    }
  }

  async sendMessage(chatId: string, text: string): Promise<void> {
    try {
      const chat = await this.client.getChatById(chatId);
      await chat.sendStateTyping();
      await new Promise((r) => setTimeout(r, 2000 + Math.random() * 4000));
      await chat.sendMessage(text);
      await chat.clearState();
    } catch (e) {
      console.error("[WA] Gagal kirim pesan:", e);
    }
  }

  getStatus(): ConnectionState {
    return { status: this.status, qrCode: this.qrCode };
  }

  onMessage(handler: MessageHandler) {
    this.messageHandlers.push(handler);
  }

  onStatusChange(handler: StatusChangeHandler) {
    this.statusHandlers.push(handler);
  }

  private emitStatus(state: ConnectionState) {
    for (const handler of this.statusHandlers) {
      handler(state);
    }
  }
}
