import { json, type RequestHandler } from "@sveltejs/kit";
import { getDb } from "$lib/server/db/index.js";

export const PUT: RequestHandler = async ({ params, request }) => {
  const db = getDb();
  const { id } = params;
  const body = await request.json();

  const existing = await db.supportCategory.findUnique({ where: { id } });
  if (!existing) {
    return json({ error: "Kategori tidak ditemukan" }, { status: 404 });
  }

  if (body.name && body.name !== existing.name) {
    const dup = await db.supportCategory.findFirst({ where: { name: body.name } });
    if (dup) return json({ error: `Kategori "${body.name}" sudah ada` }, { status: 409 });
  }

  const data = await db.supportCategory.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
      ...(body.active !== undefined && { active: body.active }),
    },
  });

  return json({ data });
};

export const DELETE: RequestHandler = async ({ params }) => {
  const db = getDb();
  const { id } = params;

  const existing = await db.supportCategory.findUnique({ where: { id } });
  if (!existing) {
    return json({ error: "Kategori tidak ditemukan" }, { status: 404 });
  }

  await db.supportCategory.delete({ where: { id } });
  return json({ data: { id } });
};
