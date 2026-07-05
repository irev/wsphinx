import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types.js";
import { getWorkerUrl } from "$lib/server/whatsapp/worker-url.js";

export const GET: RequestHandler = async () => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const WORKER_URL = await getWorkerUrl();
    const res = await fetch(`${WORKER_URL}/api/status`, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) {
      return json({ status: "worker_offline", qrCode: null });
    }
    const result = await res.json();
    return json({ status: result.data?.status || "worker_offline", qrCode: result.data?.qrCode || null });
  } catch {
    return json({ status: "worker_offline", qrCode: null });
  }
};
