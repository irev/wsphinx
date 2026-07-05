import { json, type RequestHandler } from "@sveltejs/kit";
import { getDb } from "$lib/server/db/index.js";

export const GET: RequestHandler = async ({ url }) => {
  const db = getDb();
  const skip = parseInt(url.searchParams.get("skip") || "0");
  const take = parseInt(url.searchParams.get("take") || "20");
  const q = url.searchParams.get("q") || "";

  const where: Record<string, unknown> = {};
  if (q.length >= 2) {
    where.OR = [
      { name: { contains: q } },
      { phone: { contains: q } },
    ];
  }

  const [data, total] = await Promise.all([
    db.whatsAppSource.findMany({ where, skip, take, orderBy: { name: "asc" } }),
    db.whatsAppSource.count({ where }),
  ]);

  return json({ data, total, skip, take });
};

export const POST: RequestHandler = async ({ request }) => {
  const db = getDb();
  const body = await request.json();

  if (!body.name || !body.type || !body.phone) {
    return json({ error: "name, type, dan phone wajib diisi" }, { status: 400 });
  }

  const source = await db.whatsAppSource.create({
    data: {
      name: body.name,
      type: body.type,
      phone: body.phone,
      chatId: body.chatId || null,
      active: body.active !== undefined ? body.active : true,
      autoReply: body.autoReply !== undefined ? body.autoReply : false,
      replyTemplate: body.replyTemplate || null,
      description: body.description || null,
    },
  });

  return json({ data: source }, { status: 201 });
};
