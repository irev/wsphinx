import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types.js";

const WORKER_URL = process.env.WORKER_API_URL || "http://127.0.0.1:3457";

export const GET: RequestHandler = async () => {
  try {
    const res = await fetch(`${WORKER_URL}/api/contacts`);
    if (!res.ok) {
      return json({ error: "Worker unavailable" }, { status: 502 });
    }
    const result = await res.json();
    return json(result);
  } catch (e) {
    return json({ error: (e as Error).message }, { status: 502 });
  }
};
