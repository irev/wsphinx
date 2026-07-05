import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types.js";

const WORKER_URL = process.env.WORKER_API_URL || "http://127.0.0.1:3457";

export const GET: RequestHandler = async () => {
	try {
		const res = await fetch(`${WORKER_URL}/api/me`);
		if (res.ok) {
			const d = await res.json();
			return json(d.data || null);
		}
		return json(null);
	} catch {
		return json(null);
	}
};
