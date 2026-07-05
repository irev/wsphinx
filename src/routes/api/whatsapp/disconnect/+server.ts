import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types.js";

const WORKER_URL = process.env.WORKER_API_URL || "http://127.0.0.1:3457";

export const POST: RequestHandler = async () => {
  try {
    const res = await fetch(`${WORKER_URL}/api/disconnect`, { method: "POST" });
    if (!res.ok) return json({ error: "Worker error" }, { status: 502 });
    return json({ ok: true });
  } catch {
    return json({ error: "Worker unreachable" }, { status: 502 });
  }
};
