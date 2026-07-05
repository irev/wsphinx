import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types.js";
import { getWorkerUrl } from "$lib/server/whatsapp/worker-url.js";

export const POST: RequestHandler = async () => {
  try {
    const WORKER_URL = await getWorkerUrl();
    const res = await fetch(`${WORKER_URL}/api/reconnect`, { method: "POST" });
    if (!res.ok) return json({ error: "Worker error" }, { status: 502 });
    const result = await res.json();
    return json({ status: result.data?.status || "unknown" });
  } catch {
    return json({ error: "Worker unreachable" }, { status: 502 });
  }
};
