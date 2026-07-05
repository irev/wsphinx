import { json, type RequestHandler } from "@sveltejs/kit";
import { getDb } from "$lib/server/db/index.js";
import { isAdmin } from "$lib/server/auth/guard.js";

export const PUT: RequestHandler = async (event) => {
  const guard = isAdmin(event);
  if (guard) return guard;
  const { params, request } = event;
  const db = getDb();
  const { id } = params;
  const body = await request.json();

  const existing = await db.supportPriority.findUnique({ where: { id } });
  if (!existing) {
    return json({ error: "Prioritas tidak ditemukan" }, { status: 404 });
  }

  if (body.name || body.level) {
    const dup = await db.supportPriority.findFirst({
      where: {
        OR: [
          ...(body.name ? [{ name: body.name }] : []),
          ...(body.level ? [{ level: body.level }] : []),
        ],
        NOT: { id },
      },
    });
    if (dup) {
      return json({ error: "Nama atau level sudah digunakan prioritas lain" }, { status: 409 });
    }
  }

  const data = await db.supportPriority.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.level !== undefined && { level: body.level }),
      ...(body.color !== undefined && { color: body.color }),
      ...(body.description !== undefined && { description: body.description }),
    },
  });

  return json({ data });
};

export const DELETE: RequestHandler = async (event) => {
  const guard = isAdmin(event);
  if (guard) return guard;
  const { params } = event;
  const db = getDb();
  const { id } = params;

  const existing = await db.supportPriority.findUnique({ where: { id } });
  if (!existing) {
    return json({ error: "Prioritas tidak ditemukan" }, { status: 404 });
  }

  await db.supportPriority.update({ where: { id }, data: { active: false } });
  return json({ data: { id } });
};
