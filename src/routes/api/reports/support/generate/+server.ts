import { json, type RequestHandler } from "@sveltejs/kit";
import { generateRecap } from "$lib/server/recap/index.js";

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  const periodType = body.periodType || "daily";

  const now = new Date();
  let periodStart: Date;
  let periodEnd: Date;

  if (body.periodStart && body.periodEnd) {
    periodStart = new Date(body.periodStart);
    periodEnd = new Date(body.periodEnd);
  } else {
    periodEnd = now;
    switch (periodType) {
      case "daily":
        periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "weekly":
        periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "monthly":
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        periodStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
  }

  try {
    const report = await generateRecap({
      periodType: periodType as "daily" | "weekly" | "monthly",
      periodStart,
      periodEnd,
      generatedBy: body.generatedBy,
    });
    return json({ data: report }, { status: 201 });
  } catch (e) {
    return json({ error: (e as Error).message }, { status: 500 });
  }
};
