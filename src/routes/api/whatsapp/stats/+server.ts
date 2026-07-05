import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types.js";
import { getDb } from "$lib/server/db/index.js";

function todayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function weekRange() {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(start.getDate() - 6);
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

export const GET: RequestHandler = async () => {
  const db = getDb();
  const today = todayRange();
  const week = weekRange();

  const [todayMessages, todayClassified, todaySupport, todayTickets, weekMessages, weekClassified, weekTickets, unprocessed, avgConfidence] =
    await Promise.all([
      db.whatsAppMessage.count({ where: { createdAt: { gte: today.start, lte: today.end } } }),
      db.whatsAppMessage.count({ where: { createdAt: { gte: today.start, lte: today.end }, isProcessed: true } }),
      db.whatsAppMessage.count({ where: { createdAt: { gte: today.start, lte: today.end }, isSupportRelated: true } }),
      db.supportTicket.count({ where: { createdAt: { gte: today.start, lte: today.end } } }),
      db.whatsAppMessage.count({ where: { createdAt: { gte: week.start, lte: week.end } } }),
      db.whatsAppMessage.count({ where: { createdAt: { gte: week.start, lte: week.end }, isProcessed: true } }),
      db.supportTicket.count({ where: { createdAt: { gte: week.start, lte: week.end } } }),
      db.whatsAppMessage.count({ where: { isProcessed: false, isActive: true } }),
      db.whatsAppMessage.aggregate({ _avg: { confidence: true }, where: { isProcessed: true, confidence: { not: null } } }),
    ]);

  return json({
    data: {
      today: {
        messages: todayMessages,
        classified: todayClassified,
        supportRelated: todaySupport,
        ticketsCreated: todayTickets,
      },
      week: {
        messages: weekMessages,
        classified: weekClassified,
        ticketsCreated: weekTickets,
      },
      unprocessed,
      avgConfidence: avgConfidence._avg.confidence ?? null,
    },
  });
};
