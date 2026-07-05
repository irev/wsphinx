import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types.js";
import { isAdminOrPic } from "$lib/server/auth/guard.js";
import { getWorkerUrl } from "$lib/server/whatsapp/worker-url.js";

export const POST: RequestHandler = async (event) => {
  const guard = isAdminOrPic(event);
  if (guard) return guard;
  const { request } = event;
  const { chatId, text } = await request.json();

  if (!chatId || !text) {
    return json({ error: "Missing chatId or text" }, { status: 400 });
  }

  try {
    const WORKER_URL = await getWorkerUrl();
    const res = await fetch(`${WORKER_URL}/api/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId, text }),
    });

    if (!res.ok) {
      const err = await res.json();
      return json({ error: err.error || "Worker error" }, { status: 502 });
    }

    return json({ ok: true });
  } catch (e) {
    return json({ error: (e as Error).message }, { status: 502 });
  }
};
