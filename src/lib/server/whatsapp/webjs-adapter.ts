import { Client, LocalAuth } from "whatsapp-web.js";
import type { Message } from "whatsapp-web.js";
import type {
  WhatsAppReader,
  WhatsAppMessage,
  ConnectionState,
  ConnectionStatus,
  MessageHandler,
  StatusChangeHandler,
} from "./adapter.js";
import { getDb } from "../db/index.js";
import * as crypto from "node:crypto";

export class WebJSAdapter implements WhatsAppReader {
  readonly name = "whatsapp-web.js";
  private client: Client;
  private status: ConnectionStatus = "disconnected";
  private qrCode: string | undefined;
  private messageHandlers: MessageHandler[] = [];
  private statusHandlers: StatusChangeHandler[] = [];
  private sourceId: string;

  constructor(sourceId: string) {
    this.sourceId = sourceId;
    this.client = new Client({
      authStrategy: new LocalAuth({
        clientId: sourceId,
        dataPath: "./.session-data",
      }),
      puppeteer: {
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      },
    });
    this.setupListeners();
  }

  private setupListeners() {
    this.client.on("qr", (qr: string) => {
      this.qrCode = qr;
      this.status = "scanning_qr";
      this.emitStatus({ status: "scanning_qr", qrCode: qr });
    });

    this.client.on("ready", () => {
      this.status = "connected";
      this.qrCode = undefined;
      this.emitStatus({ status: "connected" });
    });

    this.client.on("disconnected", () => {
      this.status = "disconnected";
      this.emitStatus({ status: "disconnected" });
    });

    this.client.on("auth_failure", () => {
      this.status = "expired";
      this.emitStatus({ status: "expired" });
    });

    this.client.on("message", async (msg: Message) => {
      if (msg.fromMe || !msg.body) return;

      const waMsg: WhatsAppMessage = {
        id: crypto.randomUUID(),
        sourceId: this.sourceId,
        fromPhone: (msg.author || msg.from).replace("@c.us", "").replace("@g.us", ""),
        fromName: (msg as any)._data?.notifyName || (msg as any)._data?.pushname || null,
        body: msg.body,
        timestamp: new Date(msg.timestamp * 1000),
        rawData: JSON.stringify((msg as any)._data || {}),
      };

      await this.saveMessage(waMsg);

      for (const handler of this.messageHandlers) {
        await handler(waMsg);
      }
    });
  }

  private async saveMessage(msg: WhatsAppMessage) {
    try {
      const db = getDb();
      await db.whatsAppMessage.create({
        data: {
          id: msg.id,
          sourceId: msg.sourceId,
          fromPhone: msg.fromPhone,
          fromName: msg.fromName,
          body: msg.body,
          timestamp: msg.timestamp,
          rawData: msg.rawData,
        },
      });
    } catch (e) {
      console.error("Failed to save message:", e);
    }
  }

  async connect() {
    await this.client.initialize();
  }

  async disconnect() {
    await this.client.destroy();
    this.status = "disconnected";
    this.emitStatus({ status: "disconnected" });
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
