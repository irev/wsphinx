import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types.js";
import { getDb } from "$lib/server/db/index.js";

const WORKER_URL = process.env.WORKER_API_URL || "http://127.0.0.1:3457";

export const GET: RequestHandler = async ({ params, url }) => {
  const chatId = decodeURIComponent(params.chatId);
  const sourceId = url.searchParams.get("sourceId");

  if (!sourceId) {
    return json({ error: "Missing sourceId query param" }, { status: 400 });
  }

  const db = getDb();
  const source = await db.whatsAppSource.findUnique({ where: { id: sourceId } });

  if (source?.photoPath) {
    return json({ data: source.photoPath, cached: true });
  }

  try {
    const res = await fetch(`${WORKER_URL}/api/profile-pic/${encodeURIComponent(chatId)}`);
    if (!res.ok) {
      return json({ data: null });
    }
    const result: { data: string | null } = await res.json();

    if (result.data && source) {
      await db.whatsAppSource.update({
        where: { id: sourceId },
        data: { photoPath: result.data },
      });
    }

    return json({ data: result.data, cached: false });
  } catch {
    return json({ data: null });
  }
};
