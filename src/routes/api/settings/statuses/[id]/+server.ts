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

  const existing = await db.supportStatus.findUnique({ where: { id } });
  if (!existing) {
    return json({ error: "Status tidak ditemukan" }, { status: 404 });
  }

  if (body.name && body.name !== existing.name) {
    const dup = await db.supportStatus.findFirst({ where: { name: body.name } });
    if (dup) return json({ error: `Status "${body.name}" sudah ada` }, { status: 409 });
  }

  const data = await db.supportStatus.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
      ...(body.isClosed !== undefined && { isClosed: body.isClosed }),
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

  const existing = await db.supportStatus.findUnique({ where: { id } });
  if (!existing) {
    return json({ error: "Status tidak ditemukan" }, { status: 404 });
  }

  await db.supportStatus.update({ where: { id }, data: { active: false } });
  return json({ data: { id } });
};
