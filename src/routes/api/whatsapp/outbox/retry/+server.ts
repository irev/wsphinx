import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types.js";
import { getWorkerUrl } from "$lib/server/whatsapp/worker-url.js";
import { isAdminOrPic } from "$lib/server/auth/guard.js";

export const POST: RequestHandler = async (event) => {
  const guard = isAdminOrPic(event);
  if (guard) return guard;

  const { id } = await event.request.json();
  if (!id) return json({ error: "Missing id" }, { status: 400 });

  try {
    const WORKER_URL = await getWorkerUrl();
    const res = await fetch(`${WORKER_URL}/api/outbox/retry`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) return json({ error: "Worker error" }, { status: 502 });
    return json({ ok: true });
  } catch (e) {
    return json({ error: (e as Error).message }, { status: 502 });
  }
};
