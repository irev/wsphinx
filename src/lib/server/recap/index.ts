import { getDb } from "../db/index.js";

interface RecapInput {
  periodType: "daily" | "weekly" | "monthly";
  periodStart: Date;
  periodEnd: Date;
  generatedBy?: string;
}

export async function generateRecap(input: RecapInput) {
  const db = getDb();

  const tickets = await db.supportTicket.findMany({
    where: {
      createdAt: { gte: input.periodStart, lte: input.periodEnd },
    },
    include: {
      status: true,
      priority: true,
      category: true,
      pic: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const statuses = await db.supportStatus.findMany({ orderBy: { sortOrder: "asc" } });
  const categories = await db.supportCategory.findMany({ orderBy: { sortOrder: "asc" } });

  const totalTickets = tickets.length;
  const statusCounts: Record<string, number> = {};
  const categoryCounts: Record<string, number> = {};
  const picCounts: Record<string, number> = {};
  let criticalCount = 0;
  let overdueCount = 0;

  for (const t of tickets) {
    statusCounts[t.status.name] = (statusCounts[t.status.name] || 0) + 1;
    if (t.category) {
      categoryCounts[t.category.name] = (categoryCounts[t.category.name] || 0) + 1;
    }
    if (t.pic) {
      picCounts[t.pic.name] = (picCounts[t.pic.name] || 0) + 1;
    }
    if (t.priority?.name === "Critical") criticalCount++;
  }

  const resolvedStatusIds = statuses.filter((s) => s.isClosed).map((s) => s.id);
  const openTickets = tickets.filter((t) => !resolvedStatusIds.includes(t.statusId));

  const now = new Date();
  const overdueThreshold = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  for (const t of openTickets) {
    if (t.createdAt < overdueThreshold) overdueCount++;
  }

  const dominantCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0];
  const frequentPIC = Object.entries(picCounts).sort((a, b) => b[1] - a[1])[0];

  const resolved = statusCounts["Resolved"] || 0;
  const closed = statusCounts["Closed"] || 0;

  const content = {
    period: {
      type: input.periodType,
      start: input.periodStart.toISOString(),
      end: input.periodEnd.toISOString(),
    },
    summary: {
      totalLaporan: totalTickets,
      tiketBaru: tickets.length,
      tiketSelesai: resolved + closed,
      tiketOpen: openTickets.length,
      tiketKritikal: criticalCount,
      tiketOverdue: overdueCount,
      masalahDominan: dominantCategory ? `${dominantCategory[0]} (${dominantCategory[1]})` : "-",
      picTersibuk: frequentPIC ? `${frequentPIC[0]} (${frequentPIC[1]} tiket)` : "-",
    },
    statusBreakdown: statusCounts,
    categoryBreakdown: categoryCounts,
    openTickets: openTickets.map((t) => ({
      id: t.id,
      ticketNumber: t.ticketNumber,
      title: t.title,
      status: t.status.name,
      priority: t.priority?.name || "-",
      category: t.category?.name || "-",
      pic: t.pic?.name || "-",
      createdAt: t.createdAt.toISOString(),
    })),
  };

  const report = await db.supportReport.create({
    data: {
      periodType: input.periodType,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      title: `Rekap ${input.periodType} - ${formatDate(input.periodStart)}`,
      content: JSON.stringify(content),
      generatedBy: input.generatedBy,
      tickets: {
        create: tickets.map((t) => ({ ticketId: t.id })),
      },
    },
  });

  return report;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("id-ID", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
