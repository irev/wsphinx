import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types.js";
import { workerManager } from "$lib/server/worker-manager.js";

export const GET: RequestHandler = async () => {
  const history = workerManager.getLatencyHistory();
  return json({ data: history });
};
