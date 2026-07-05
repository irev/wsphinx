import { json, type RequestHandler } from "@sveltejs/kit";
import { getDb } from "$lib/server/db/index.js";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { isAdmin } from "$lib/server/auth/guard.js";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  phone: z.string().min(6).max(20),
  email: z.string().email().optional().or(z.literal("")),
  role: z.enum(["admin", "pic", "user"]).optional(),
  active: z.boolean().optional(),
  password: z.string().min(4).max(100).optional(),
});

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
    db.user.findMany({ where, skip, take, orderBy: { name: "asc" } }),
    db.user.count({ where }),
  ]);

  return json({ data, total, skip, take });
};

export const POST: RequestHandler = async (event) => {
  const guard = isAdmin(event);
  if (guard) return guard;
  const { request } = event;
  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const db = getDb();
  const existing = await db.user.findUnique({ where: { phone: parsed.data.phone } });
  if (existing) {
    return json({ error: `Nomor ${parsed.data.phone} sudah terdaftar` }, { status: 409 });
  }

  const passwordHash = parsed.data.password
    ? bcrypt.hashSync(parsed.data.password, 10)
    : null;

  const data = await db.user.create({
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email || null,
      role: parsed.data.role || "user",
      active: parsed.data.active ?? true,
      passwordHash,
    },
  });

  return json({ data }, { status: 201 });
};
