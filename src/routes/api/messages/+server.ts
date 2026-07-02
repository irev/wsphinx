import { json, type RequestHandler } from "@sveltejs/kit";
import { getDb } from "$lib/server/db/index.js";
import { classifyMessage } from "$lib/server/classifier/index.js";

export const GET: RequestHandler = async ({ url }) => {
  const db = getDb();
  const isSupport = url.searchParams.get("support") === "true";
  const sourceId = url.searchParams.get("sourceId");
  const limit = parseInt(url.searchParams.get("limit") || "50");
  const offset = parseInt(url.searchParams.get("offset") || "0");

  const where: Record<string, unknown> = {};
  if (isSupport) where.isSupportRelated = true;
  if (sourceId) where.sourceId = sourceId;

  const [messages, total] = await Promise.all([
    db.whatsAppMessage.findMany({
      where,
      include: { source: true, ticket: { include: { ticket: true } } },
      orderBy: { timestamp: "desc" },
      take: limit,
      skip: offset,
    }),
    db.whatsAppMessage.count({ where }),
  ]);

  return json({ data: messages, total, limit, offset });
};

export const POST: RequestHandler = async ({ request }) => {
  const db = getDb();
  const body = await request.json();

  if (!body.body || !body.sourceId || !body.fromPhone) {
    return json({ error: "Missing required fields: body, sourceId, fromPhone" }, { status: 400 });
  }

  const source = await db.whatsAppSource.findUnique({ where: { id: body.sourceId } });
  if (!source) return json({ error: "Source not found" }, { status: 404 });

  const msg = await db.whatsAppMessage.create({
    data: {
      sourceId: body.sourceId,
      fromPhone: body.fromPhone,
      fromName: body.fromName || null,
      body: body.body,
      timestamp: body.timestamp ? new Date(body.timestamp) : new Date(),
      rawData: body.rawData || "{}",
    },
  });

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
  }

  return json({ data: msg, classification }, { status: 201 });
};
