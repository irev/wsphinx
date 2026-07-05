import { json, type RequestHandler } from "@sveltejs/kit";
import { getDb } from "$lib/server/db/index.js";
import { isAdmin } from "$lib/server/auth/guard.js";

export const GET: RequestHandler = async (event) => {
  const guard = isAdmin(event);
  if (guard) return guard;
  const db = getDb();
  const [categories, priorities, statuses, users, sources] = await Promise.all([
    db.supportCategory.findMany({ orderBy: { sortOrder: "asc" } }),
    db.supportPriority.findMany({ orderBy: { level: "asc" } }),
    db.supportStatus.findMany({ orderBy: { sortOrder: "asc" } }),
    db.user.findMany({ orderBy: { name: "asc" } }),
    db.whatsAppSource.findMany(),
  ]);

  const payload = { categories, priorities, statuses, users, sources };

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="settings-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
};
