import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types.js";
import { getDb } from "$lib/server/db/index.js";
import { getWorkerUrl } from "$lib/server/whatsapp/worker-url.js";

export const GET: RequestHandler = async ({ params, url }) => {
  const chatId = decodeURIComponent(params.chatId);
  const sourceId = url.searchParams.get("sourceId");

  const db = getDb();
  let source = null;

  if (sourceId) {
    source = await db.whatsAppSource.findUnique({ where: { id: sourceId } });
    if (source?.photoPath) {
      return json({ data: source.photoPath, cached: true });
    }
  }

  try {
    const WORKER_URL = await getWorkerUrl();
    const res = await fetch(`${WORKER_URL}/api/profile-pic/${encodeURIComponent(chatId)}`);
    if (!res.ok) {
      return json({ data: null });
    }
    const result: { data: string | null } = await res.json();

    if (result.data && source && sourceId) {
      await db.whatsAppSource.update({
        where: { id: sourceId },
        data: { photoPath: result.data ?? undefined },
      });
    }

    return json({ data: result.data, cached: false });
  } catch {
    return json({ data: null });
  }
};
