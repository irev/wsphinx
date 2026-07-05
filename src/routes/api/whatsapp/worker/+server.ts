import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types.js";
import { isAdminOrPic } from "$lib/server/auth/guard.js";
import { workerManager } from "$lib/server/worker-manager.js";
import { getWorkerUrl } from "$lib/server/whatsapp/worker-url.js";

export const GET: RequestHandler = async (event) => {
  const guard = isAdminOrPic(event);
  if (guard) return guard;

  const info = workerManager.getInfo();
  const url = await getWorkerUrl();

  return json({
    data: {
      ...info,
      workerUrl: url,
    },
  });
};
