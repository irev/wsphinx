import { json, type RequestHandler } from "@sveltejs/kit";
import { z } from "zod";
import { getDb } from "$lib/server/db/index.js";
import { classifyMessage } from "$lib/server/classifier/index.js";

const batchSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(100),
  action: z.enum(["classify", "markRead", "markUnread", "archive"]),
});

export const POST: RequestHandler = async ({ request }) => {
  let raw: unknown;
  try { raw = await request.json(); }
  catch { return json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = batchSchema.safeParse(raw);
  if (!parsed.success) return json({ error: "Validasi gagal", detail: parsed.error.flatten() }, { status: 400 });

  const { ids, action } = parsed.data;
  const db = getDb();

  switch (action) {
    case "markRead":
    case "markUnread": {
      await db.whatsAppMessage.updateMany({
        where: { id: { in: ids } },
        data: { isRead: action === "markRead" },
      });
      return json({ success: true, updated: ids.length });
    }

    case "archive": {
      await db.whatsAppMessage.updateMany({
        where: { id: { in: ids } },
        data: { isActive: false },
      });
      return json({ success: true, archived: ids.length });
    }

    case "classify": {
      const messages = await db.whatsAppMessage.findMany({
        where: { id: { in: ids } },
        orderBy: { timestamp: "desc" },
      });

      const results: { id: string; status: string }[] = [];

      for (const msg of messages) {
        try {
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
          }

          await db.auditLog.create({
            data: {
              action: "message.classify",
              entity: "message",
              entityId: msg.id,
              detail: JSON.stringify(result),
            },
          });

          results.push({ id: msg.id, status: "ok" });
        } catch {
          results.push({ id: msg.id, status: "error" });
        }
      }

      return json({ success: true, results });
    }
  }
};
