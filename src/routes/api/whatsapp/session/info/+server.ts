import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types.js";

const WORKER_URL = process.env.WORKER_API_URL || "http://127.0.0.1:3457";

export const GET: RequestHandler = async () => {
  try {
    const res = await fetch(`${WORKER_URL}/api/session/info`);
    if (!res.ok) return json({ worker: "error" }, { status: 502 });
    const result = await res.json();
    return json({ worker: "ok", ...result.data });
  } catch {
    return json({ worker: "unreachable", exists: false, createdAt: null, size: null }, { status: 502 });
  }
};
