import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types.js";
import { getWorkerUrl } from "$lib/server/whatsapp/worker-url.js";

export const GET: RequestHandler = async () => {
	try {
		const WORKER_URL = await getWorkerUrl();
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
