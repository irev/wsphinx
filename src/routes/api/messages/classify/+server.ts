import { json, type RequestHandler } from "@sveltejs/kit";
import { getDb } from "$lib/server/db/index.js";
import { classifyMessage } from "$lib/server/classifier/index.js";

export const POST: RequestHandler = async ({ request }) => {
  const db = getDb();
  const body = await request.json();
  const messageId = body.messageId;

  if (messageId) {
    const msg = await db.whatsAppMessage.findUnique({ where: { id: messageId } });
    if (!msg) return json({ error: "Message not found" }, { status: 404 });

    const prevMessages = await db.whatsAppMessage.findMany({
      where: {
        sourceId: msg.sourceId,
        fromPhone: msg.fromPhone,
        timestamp: { lt: msg.timestamp },
      },
      orderBy: { timestamp: "desc" },
      take: 5,
    });

    const result = await classifyMessage({
      body: msg.body,
      fromName: msg.fromName || msg.fromPhone,
      previousMessages: prevMessages.map((m) => `${m.fromName || m.fromPhone}: ${m.body}`),
    });

    if (result.is_support_related) {
      await db.whatsAppMessage.update({
        where: { id: msg.id },
        data: {
          isSupportRelated: true,
          messageType: result.message_type,
          category: result.category,
          priority: result.priority,
          confidence: result.confidence,
          evidence: JSON.stringify(result.evidence),
          uncertainty: JSON.stringify(result.uncertainty),
          summary: result.summary,
          isProcessed: true,
        },
      });

      await db.auditLog.create({
        data: {
          action: "message.classify",
          entity: "message",
          entityId: msg.id,
          detail: JSON.stringify(result),
        },
      });
    }

    return json({ data: result });
  }

  const result = await classifyMessage({
    body: body.body || "",
    fromName: body.fromName || "Unknown",
    previousMessages: body.previousMessages || [],
  });

  return json({ data: result });
};
