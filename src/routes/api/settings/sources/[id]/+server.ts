import { json, type RequestHandler } from "@sveltejs/kit";
import { getDb } from "$lib/server/db/index.js";
import { isAdminOrPic } from "$lib/server/auth/guard.js";

export const PUT: RequestHandler = async (event) => {
  const guard = isAdminOrPic(event);
  if (guard) return guard;
  const { params, request } = event;
  const db = getDb();
  const { id } = params;
  const body = await request.json();

  const existing = await db.whatsAppSource.findUnique({ where: { id } });
  if (!existing) {
    return json({ error: "Source tidak ditemukan" }, { status: 404 });
  }

  const source = await db.whatsAppSource.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.type !== undefined && { type: body.type }),
      ...(body.phone !== undefined && { phone: body.phone }),
      ...(body.chatId !== undefined && { chatId: body.chatId }),
      ...(body.active !== undefined && { active: body.active }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.autoReply !== undefined && { autoReply: body.autoReply }),
      ...(body.replyTemplate !== undefined && { replyTemplate: body.replyTemplate }),
    },
  });

  return json({ data: source });
};

export const DELETE: RequestHandler = async (event) => {
  const guard = isAdminOrPic(event);
  if (guard) return guard;
  const { params } = event;
  const db = getDb();
  const { id } = params;

  const existing = await db.whatsAppSource.findUnique({ where: { id } });
  if (!existing) {
    return json({ error: "Source tidak ditemukan" }, { status: 404 });
  }

  await db.whatsAppSource.update({ where: { id }, data: { active: false } });

  return json({ data: { id } });
};
