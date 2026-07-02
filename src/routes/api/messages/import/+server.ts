import { json, type RequestHandler } from "@sveltejs/kit";
import { getDb } from "$lib/server/db/index.js";

export const POST: RequestHandler = async ({ request }) => {
  const db = getDb();
  const body = await request.json();

  if (!Array.isArray(body.messages)) {
    return json({ error: "Body must contain 'messages' array" }, { status: 400 });
  }

  const sourceId = body.sourceId;
  if (!sourceId) return json({ error: "sourceId is required" }, { status: 400 });

  const source = await db.whatsAppSource.findUnique({ where: { id: sourceId } });
  if (!source) return json({ error: "Source not found" }, { status: 404 });

  let imported = 0;
  for (const msg of body.messages) {
    if (!msg.body || !msg.fromPhone) continue;
    await db.whatsAppMessage.create({
      data: {
        sourceId,
        fromPhone: msg.fromPhone,
        fromName: msg.fromName || null,
        body: msg.body,
        timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
        rawData: JSON.stringify(msg.rawData || {}),
      },
    });
    imported++;
  }

  return json({ imported, total: body.messages.length }, { status: 201 });
};
