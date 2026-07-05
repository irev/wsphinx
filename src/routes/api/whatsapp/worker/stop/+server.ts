import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types.js";
import { isAdminOrPic } from "$lib/server/auth/guard.js";
import { workerManager } from "$lib/server/worker-manager.js";
import { getDb } from "$lib/server/db/index.js";

export const POST: RequestHandler = async (event) => {
  const guard = isAdminOrPic(event);
  if (guard) return guard;

  const result = await workerManager.stop();

  const db = getDb();
  let clientIp: string;
  try { clientIp = event.getClientAddress(); } catch { clientIp = "127.0.0.1"; }
  await db.auditLog.create({
    data: {
      userId: event.locals.user?.id,
      action: "worker.stop",
      entity: "worker",
      detail: JSON.stringify(result),
      ipAddress: clientIp,
    },
  });

  return json(result, { status: result.ok ? 200 : 409 });
};
