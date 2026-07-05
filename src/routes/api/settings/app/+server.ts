import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types.js";
import { getDb } from "$lib/server/db/index.js";
import { isAdmin } from "$lib/server/auth/guard.js";
import { invalidateWorkerUrlCache } from "$lib/server/whatsapp/worker-url.js";

export const GET: RequestHandler = async ({ url }) => {
  const db = getDb();
  const key = url.searchParams.get("key");
  if (key) {
    const setting = await db.appSetting.findUnique({ where: { key } });
    return json({ key, value: setting?.value ?? null });
  }
  const all = await db.appSetting.findMany();
  const map: Record<string, string> = {};
  for (const s of all) map[s.key] = s.value;
  return json(map);
};

export const PUT: RequestHandler = async (event) => {
  const guard = isAdmin(event);
  if (guard) return guard;
  const { request } = event;
  const db = getDb();
  const body = await request.json();
  if (!body.key) return json({ error: "Missing key" }, { status: 400 });

  const setting = await db.appSetting.upsert({
    where: { key: body.key },
    update: { value: String(body.value ?? "") },
    create: { key: body.key, value: String(body.value ?? "") },
  });

  if (body.key === "wa_worker_url") {
    invalidateWorkerUrlCache();
  }

  return json({ key: setting.key, value: setting.value });
};
