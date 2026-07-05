import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types.js";
import { isAdminOrPic } from "$lib/server/auth/guard.js";
import { workerManager } from "$lib/server/worker-manager.js";
import { getDb } from "$lib/server/db/index.js";

export const GET: RequestHandler = async (event) => {
  const guard = isAdminOrPic(event);
  if (guard) return guard;

  const info = workerManager.getInfo();
  const db = getDb();
  const urlSetting = await db.appSetting.findUnique({ where: { key: "wa_worker_url" } });

  return json({
    data: {
      ...info,
      workerUrl: urlSetting?.value || "http://127.0.0.1:3457",
    },
  });
};
