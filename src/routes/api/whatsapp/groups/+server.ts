import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types.js";
import { getWorkerUrl } from "$lib/server/whatsapp/worker-url.js";

export const GET: RequestHandler = async () => {
  try {
    const WORKER_URL = await getWorkerUrl();
    const res = await fetch(`${WORKER_URL}/api/groups`);
    if (!res.ok) {
      return json({ error: "Worker unavailable" }, { status: 502 });
    }
    const result = await res.json();
    return json(result);
  } catch (e) {
    return json({ error: (e as Error).message }, { status: 502 });
  }
};
