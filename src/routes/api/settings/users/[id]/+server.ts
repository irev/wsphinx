import { json, type RequestHandler } from "@sveltejs/kit";
import { getDb } from "$lib/server/db/index.js";
import bcrypt from "bcryptjs";
import { isAdmin } from "$lib/server/auth/guard.js";

export const PUT: RequestHandler = async (event) => {
  const guard = isAdmin(event);
  if (guard) return guard;
  const { params, request } = event;
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

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.phone !== undefined) data.phone = body.phone;
  if (body.email !== undefined) data.email = body.email || null;
  if (body.role !== undefined) data.role = body.role;
  if (body.active !== undefined) data.active = body.active;
  if (body.password) data.passwordHash = bcrypt.hashSync(body.password, 10);

  const updated = await db.user.update({ where: { id }, data });

  return json({ data: updated });
};

export const DELETE: RequestHandler = async (event) => {
  const guard = isAdmin(event);
  if (guard) return guard;
  const { params } = event;
  const db = getDb();
  const { id } = params;

  const existing = await db.user.findUnique({ where: { id } });
  if (!existing) {
    return json({ error: "User tidak ditemukan" }, { status: 404 });
  }

  await db.user.update({ where: { id }, data: { active: false } });
  return json({ data: { id } });
};
