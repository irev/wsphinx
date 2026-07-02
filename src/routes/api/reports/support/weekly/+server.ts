import { json, type RequestHandler } from "@sveltejs/kit";

export const GET: RequestHandler = async () => {
  const { generateRecap } = await import("$lib/server/recap/index.js");
  const now = new Date();
  const periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const report = await generateRecap({
    periodType: "weekly",
    periodStart,
    periodEnd: now,
  });

  return json({ data: report });
};
