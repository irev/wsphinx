import { WebJSAdapter } from "../src/lib/server/whatsapp/webjs-adapter.js";
import { getDb } from "../src/lib/server/db/index.js";
import { classifyMessage } from "../src/lib/server/classifier/index.js";

const SOURCE_ID = process.env.WHATSAPP_SOURCE_ID || "default";

async function main() {
  const db = getDb();

  const source = await db.whatsAppSource.findFirst({ where: { id: SOURCE_ID } });
  if (!source) {
    console.error(`WhatsApp source "${SOURCE_ID}" not found. Run seed first.`);
    process.exit(1);
  }

  console.log(`Starting WhatsApp reader for: ${source.name}`);
  const adapter = new WebJSAdapter(source.id);

  adapter.onStatusChange((state) => {
    console.log(`[${new Date().toISOString()}] Status: ${state.status}`);
    if (state.qrCode) {
      console.log("QR code received. Scan to authenticate.");
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
      }
    } catch (e) {
      console.error("Error processing message:", e);
    }
  });

  await adapter.connect();
  console.log("Worker running. Press Ctrl+C to stop.");

  process.on("SIGINT", async () => {
    console.log("Shutting down...");
    await adapter.disconnect();
    process.exit(0);
  });
}

main().catch((e) => {
  console.error("Worker failed:", e);
  process.exit(1);
});
