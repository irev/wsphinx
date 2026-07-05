import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types.js";
import { getWorkerUrl } from "$lib/server/whatsapp/worker-url.js";
import { workerManager } from "$lib/server/worker-manager.js";

export const GET: RequestHandler = async () => {
  try {
    const start = Date.now();
    const WORKER_URL = await getWorkerUrl();
    const res = await fetch(`${WORKER_URL}/api/health`);
    const latency = Date.now() - start;
    const status = res.ok ? "connected" : "error";
    workerManager.recordLatency({ latency, status });
    if (!res.ok) return json({ worker: "error", latency, status: "error", uptime: 0, reconnectAttempts: 0, maxReconnectAttempts: 10 }, { status: 502 });
    const result = await res.json();
    return json({ worker: "ok", latency, ...result.data });
  } catch {
    workerManager.recordLatency({ latency: 0, status: "unreachable" });
    return json({ worker: "unreachable", latency: null, status: "error", uptime: 0, reconnectAttempts: 0, maxReconnectAttempts: 10 }, { status: 502 });
  }
};
