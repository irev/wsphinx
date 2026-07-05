import { json, type RequestHandler } from "@sveltejs/kit";
import { getDb } from "$lib/server/db/index.js";
import { z } from "zod";
import { isAdmin } from "$lib/server/auth/guard.js";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  level: z.number().int().min(1).max(99),
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
    db.supportPriority.findMany({ where, skip, take, orderBy: { level: "asc" } }),
    db.supportPriority.count({ where }),
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
  const dup = await db.supportPriority.findFirst({
    where: {
      OR: [
        { name: parsed.data.name },
        { level: parsed.data.level },
      ],
    },
  });
  if (dup) {
    return json({ error: `Prioritas "${parsed.data.name}" atau level ${parsed.data.level} sudah ada` }, { status: 409 });
  }

  const data = await db.supportPriority.create({
    data: {
      name: parsed.data.name,
      level: parsed.data.level,
      color: parsed.data.color || "#6b7280",
      description: parsed.data.description || null,
    },
  });

  return json({ data }, { status: 201 });
};
