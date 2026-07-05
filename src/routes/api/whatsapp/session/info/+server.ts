import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types.js";
import { getWorkerUrl } from "$lib/server/whatsapp/worker-url.js";

export const GET: RequestHandler = async () => {
  try {
    const WORKER_URL = await getWorkerUrl();
    const res = await fetch(`${WORKER_URL}/api/session/info`);
    if (!res.ok) return json({ worker: "error" }, { status: 502 });
    const result = await res.json();
    return json({ worker: "ok", ...result.data });
  } catch {
    return json({ worker: "unreachable", exists: false, createdAt: null, size: null }, { status: 502 });
  }
};
