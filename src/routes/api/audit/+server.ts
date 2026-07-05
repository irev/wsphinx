import { json, type RequestHandler } from "@sveltejs/kit";
import { getDb } from "$lib/server/db/index.js";

export const GET: RequestHandler = async ({ url }) => {
  const db = getDb();
  const entity = url.searchParams.get("entity");
  const entityId = url.searchParams.get("entityId");
  const action = url.searchParams.get("action");
  const q = url.searchParams.get("q");
  const limit = parseInt(url.searchParams.get("limit") || "100");
  const offset = parseInt(url.searchParams.get("offset") || "0");

  const where: Record<string, unknown> = {};
  if (entity) where.entity = entity;
  if (entityId) where.entityId = entityId;
  if (action) where.action = action;
  if (q) where.detail = { contains: q };

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    db.auditLog.count({ where }),
  ]);

  return json({ data: logs, total, limit, offset });
};
