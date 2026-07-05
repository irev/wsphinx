import { json, type RequestHandler } from "@sveltejs/kit";
import { z } from "zod";
import { getDb } from "$lib/server/db/index.js";
import { classifyMessage } from "$lib/server/classifier/index.js";

const classifySchema = z.object({
  messageId: z.string().min(1).optional(),
  body: z.string().max(10000).optional(),
  fromName: z.string().max(200).optional(),
  previousMessages: z.array(z.string().max(500)).max(10).optional(),
});

export const POST: RequestHandler = async ({ request, locals }) => {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = classifySchema.safeParse(raw);
  if (!parsed.success) {
    return json({ error: "Validasi gagal", detail: parsed.error.flatten() }, { status: 400 });
  }

  const body = parsed.data;
  const db = getDb();

  if (body.messageId) {
    const msg = await db.whatsAppMessage.findUnique({ where: { id: body.messageId } });
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
          userId: locals.user?.id || null,
        },
      });
    }

    return json({ data: result });
  }

  if (!body.body) {
    return json({ error: "messageId atau body required" }, { status: 400 });
  }

  const result = await classifyMessage({
    body: body.body,
    fromName: body.fromName || "Unknown",
    previousMessages: body.previousMessages || [],
  });

  return json({ data: result });
};
