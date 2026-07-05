import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types.js";

const WORKER_URL = process.env.WORKER_API_URL || "http://127.0.0.1:3457";

export const POST: RequestHandler = async ({ request }) => {
  const { chatId, text } = await request.json();

  if (!chatId || !text) {
    return json({ error: "Missing chatId or text" }, { status: 400 });
  }

  try {
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
