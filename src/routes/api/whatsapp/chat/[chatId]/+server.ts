import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types.js";
import { getDb } from "$lib/server/db/index.js";
import { getWorkerUrl } from "$lib/server/whatsapp/worker-url.js";

export const GET: RequestHandler = async ({ params, url }) => {
  const chatId = decodeURIComponent(params.chatId);
  const sourceId = url.searchParams.get("sourceId");
  const limit = parseInt(url.searchParams.get("limit") || "200");

  if (!sourceId) {
    return json({ error: "Missing sourceId query param" }, { status: 400 });
  }

  try {
    const WORKER_URL = await getWorkerUrl();
    const res = await fetch(`${WORKER_URL}/api/chat/${encodeURIComponent(chatId)}?limit=${limit}`);
    if (!res.ok) {
      return json({ error: "Worker unavailable" }, { status: 502 });
    }
    const result: { data: any[] } = await res.json();

    const db = getDb();
    let upserted = 0;

    for (const msg of result.data) {
      const exists = await db.whatsAppMessage.findUnique({ where: { id: msg.id } });
      if (!exists) {
        await db.whatsAppMessage.create({
          data: {
            id: msg.id,
            sourceId,
            chatId: msg.chatId,
            chatName: msg.chatName,
            fromPhone: msg.fromPhone,
            fromName: msg.fromName,
            body: msg.body,
            mediaPath: msg.mediaPath,
            mediaType: msg.mediaType,
            mediaSize: msg.mediaSize,
            fileName: msg.fileName,
            timestamp: new Date(msg.timestamp),
            rawData: msg.rawData || "{}",
          },
        });
        upserted++;
      }
    }

    const messages = await db.whatsAppMessage.findMany({
      where: { sourceId, isActive: true },
      orderBy: { timestamp: "asc" },
    });

    return json({ data: messages, total: messages.length, upserted, fromWorker: result.data.length });
  } catch (e) {
    return json({ error: (e as Error).message }, { status: 502 });
  }
};
