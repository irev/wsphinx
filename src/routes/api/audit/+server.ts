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

  const statuses = await db.supportStatus.findMany({
    select: { id: true, name: true },
  });
  const statusMap = new Map(statuses.map((s) => [s.id, s.name]));

  const resolved = logs.map((log) => {
    if (
      (log.action === "ticket.status_change" || log.action === "ticket.close") &&
      log.detail
    ) {
      try {
        const detail = JSON.parse(log.detail);
        if (detail.fromStatus && statusMap.has(detail.fromStatus)) {
          detail.fromStatusName = statusMap.get(detail.fromStatus);
        }
        if (detail.toStatus && statusMap.has(detail.toStatus)) {
          detail.toStatusName = statusMap.get(detail.toStatus);
        }
        return { ...log, detail: JSON.stringify(detail) };
      } catch {}
    }
    return log;
  });

  return json({ data: resolved, total, limit, offset });
};

export const DELETE: RequestHandler = async ({ url }) => {
  const days = parseInt(url.searchParams.get("days") || "90");
  if (days < 30) return json({ error: "Minimum 30 hari" }, { status: 400 });
  if (days > 365) return json({ error: "Maksimum 365 hari" }, { status: 400 });

  const db = getDb();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const deleted = await db.auditLog.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });

  return json({ deleted: deleted.count, cutoff: cutoff.toISOString() });
};
