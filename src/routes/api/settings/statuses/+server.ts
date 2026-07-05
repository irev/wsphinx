import { json, type RequestHandler } from "@sveltejs/kit";
import { getDb } from "$lib/server/db/index.js";
import { z } from "zod";
import { isAdmin } from "$lib/server/auth/guard.js";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  sortOrder: z.number().int().min(0).optional(),
  isClosed: z.boolean().optional(),
  color: z.string().max(20).optional(),
  description: z.string().max(500).optional(),
});

export const GET: RequestHandler = async ({ url }) => {
  const db = getDb();
  const skip = parseInt(url.searchParams.get("skip") || "0");
  const take = parseInt(url.searchParams.get("take") || "50");
  const q = url.searchParams.get("q") || "";

  const where: Record<string, unknown> = {};
  if (q.length >= 2) where.name = { contains: q };

  const [data, total] = await Promise.all([
    db.supportStatus.findMany({ where, skip, take, orderBy: { sortOrder: "asc" } }),
    db.supportStatus.count({ where }),
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
  const existing = await db.supportStatus.findFirst({ where: { name: parsed.data.name } });
  if (existing) {
    return json({ error: `Status "${parsed.data.name}" sudah ada` }, { status: 409 });
  }

  const data = await db.supportStatus.create({
    data: {
      name: parsed.data.name,
      sortOrder: parsed.data.sortOrder ?? 0,
      isClosed: parsed.data.isClosed ?? false,
      color: parsed.data.color || "#6b7280",
      description: parsed.data.description || null,
    },
  });

  return json({ data }, { status: 201 });
};
