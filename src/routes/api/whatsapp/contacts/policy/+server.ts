import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types.js";
import { getWorkerUrl } from "$lib/server/whatsapp/worker-url.js";
import { isAdminOrPic } from "$lib/server/auth/guard.js";

export const GET: RequestHandler = async (event) => {
  const guard = isAdminOrPic(event);
  if (guard) return guard;

  try {
    const WORKER_URL = await getWorkerUrl();
    const res = await fetch(`${WORKER_URL}/api/contacts/policy`);
    if (!res.ok) return json({ error: "Worker unavailable" }, { status: 502 });
    return json(await res.json());
  } catch (e) {
    return json({ error: (e as Error).message }, { status: 502 });
  }
};
