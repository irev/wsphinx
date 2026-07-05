import { json, type RequestHandler } from "@sveltejs/kit";
import { getDb } from "$lib/server/db/index.js";
import { z } from "zod";
import { isAdmin } from "$lib/server/auth/guard.js";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  sortOrder: z.number().int().min(0).optional(),
  active: z.boolean().optional(),
});

export const GET: RequestHandler = async ({ url }) => {
  const db = getDb();
  const skip = parseInt(url.searchParams.get("skip") || "0");
  const take = parseInt(url.searchParams.get("take") || "50");
  const q = url.searchParams.get("q") || "";

  const where: Record<string, unknown> = {};
  if (q.length >= 2) where.name = { contains: q };

  const [data, total] = await Promise.all([
    db.supportCategory.findMany({
      where,
      skip,
      take,
      orderBy: { sortOrder: "asc" },
    }),
    db.supportCategory.count({ where }),
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
  const existing = await db.supportCategory.findFirst({ where: { name: parsed.data.name } });
  if (existing) {
    return json({ error: `Kategori "${parsed.data.name}" sudah ada` }, { status: 409 });
  }

  const data = await db.supportCategory.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description || null,
      sortOrder: parsed.data.sortOrder ?? 0,
      active: parsed.data.active ?? true,
    },
  });

  return json({ data }, { status: 201 });
};
