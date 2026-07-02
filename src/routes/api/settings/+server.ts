import { json, type RequestHandler } from "@sveltejs/kit";
import { getDb } from "$lib/server/db/index.js";

export const GET: RequestHandler = async () => {
  const db = getDb();
  const [categories, priorities, statuses, pics, sources] = await Promise.all([
    db.supportCategory.findMany({ orderBy: { sortOrder: "asc" } }),
    db.supportPriority.findMany({ orderBy: { level: "asc" } }),
    db.supportStatus.findMany({ orderBy: { sortOrder: "asc" } }),
    db.user.findMany({ orderBy: { name: "asc" } }),
    db.whatsAppSource.findMany(),
  ]);

  return json({
    data: { categories, priorities, statuses, pics, sources },
  });
};
