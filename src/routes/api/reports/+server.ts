import { json, type RequestHandler } from "@sveltejs/kit";
import { getDb } from "$lib/server/db/index.js";

export const GET: RequestHandler = async ({ url }) => {
  const db = getDb();
  const limit = parseInt(url.searchParams.get("limit") || "20");
  const offset = parseInt(url.searchParams.get("offset") || "0");

  const [reports, total] = await Promise.all([
    db.supportReport.findMany({
      orderBy: { generatedAt: "desc" },
      take: limit,
      skip: offset,
    }),
    db.supportReport.count(),
  ]);

  return json({ data: reports, total, limit, offset });
};
