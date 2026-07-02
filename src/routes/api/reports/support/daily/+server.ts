import { json, type RequestHandler } from "@sveltejs/kit";

export const GET: RequestHandler = async () => {
  const { generateRecap } = await import("$lib/server/recap/index.js");
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const report = await generateRecap({
    periodType: "daily",
    periodStart,
    periodEnd: now,
  });

  return json({ data: report });
};
