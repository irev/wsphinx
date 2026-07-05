import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types.js";
import { getDb } from "$lib/server/db/index.js";
import { classifyMessage } from "$lib/server/classifier/index.js";
import { isAdminOrPic } from "$lib/server/auth/guard.js";

export const POST: RequestHandler = async (event) => {
  const guard = isAdminOrPic(event);
  if (guard) return guard;
  const { request } = event;
  const { sourceId, messageIds, body: directBody } = await request.json();

  const db = getDb();

  let bodyText = "";
  let fromName = "";

  if (messageIds && messageIds.length > 0) {
    const msgs = await db.whatsAppMessage.findMany({
      where: { id: { in: messageIds }, sourceId },
      orderBy: { timestamp: "asc" },
    });
    bodyText = msgs.map((m) => `[${m.fromName || m.fromPhone}]: ${m.body}`).join("\n");
    fromName = msgs[0]?.fromName || msgs[0]?.fromPhone || "";
  } else if (directBody) {
    bodyText = directBody;
  } else {
    return json({ error: "Provide messageIds or body" }, { status: 400 });
  }

  const result = await classifyMessage({
    body: bodyText,
    fromName,
    previousMessages: [],
  });

  return json({ data: result });
};
