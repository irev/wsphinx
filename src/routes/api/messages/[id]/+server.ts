import { json, type RequestHandler } from "@sveltejs/kit";
import { getDb } from "$lib/server/db/index.js";

export const GET: RequestHandler = async ({ params }) => {
  const db = getDb();
  const msg = await db.whatsAppMessage.findUnique({
    where: { id: params.id },
    include: { source: true, ticket: { include: { ticket: true } } },
  });
  if (!msg) return json({ error: "Message not found" }, { status: 404 });
  return json({ data: msg });
};
