import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types.js";

const WORKER_URL = process.env.WORKER_API_URL || "http://127.0.0.1:3457";

export const GET: RequestHandler = async () => {
  try {
    const start = Date.now();
    const res = await fetch(`${WORKER_URL}/api/health`);
    const latency = Date.now() - start;
    if (!res.ok) return json({ worker: "error", latency }, { status: 502 });
    const result = await res.json();
    return json({ worker: "ok", latency, ...result.data });
  } catch {
    return json({ worker: "unreachable", latency: null }, { status: 502 });
  }
};
