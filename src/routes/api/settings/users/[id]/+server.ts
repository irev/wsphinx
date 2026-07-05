import { json, type RequestHandler } from "@sveltejs/kit";
import { getDb } from "$lib/server/db/index.js";

export const PUT: RequestHandler = async ({ params, request }) => {
  const db = getDb();
  const { id } = params;
  const body = await request.json();

  const existing = await db.user.findUnique({ where: { id } });
  if (!existing) {
    return json({ error: "User tidak ditemukan" }, { status: 404 });
  }

  if (body.phone && body.phone !== existing.phone) {
    const dup = await db.user.findUnique({ where: { phone: body.phone } });
    if (dup) return json({ error: `Nomor ${body.phone} sudah terdaftar` }, { status: 409 });
  }

  const data = await db.user.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.phone !== undefined && { phone: body.phone }),
      ...(body.email !== undefined && { email: body.email || null }),
      ...(body.role !== undefined && { role: body.role }),
      ...(body.active !== undefined && { active: body.active }),
    },
  });

  return json({ data });
};

export const DELETE: RequestHandler = async ({ params }) => {
  const db = getDb();
  const { id } = params;

  const existing = await db.user.findUnique({ where: { id } });
  if (!existing) {
    return json({ error: "User tidak ditemukan" }, { status: 404 });
  }

  await db.user.delete({ where: { id } });
  return json({ data: { id } });
};
