import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { generateRecap } from "../src/lib/server/recap/index.js";
import { getDb } from "../src/lib/server/db/index.js";
import { getSeedRefs } from "./helpers.js";

const BODY = "RECAP-TEST-Aplikasi error pas login";
const TICKET_NUM = "TCK-RECAP-TEST-001";

describe("Recap Generator", () => {
  beforeAll(async () => {
    const refs = await getSeedRefs();
    const db = getDb();

    const msg = await db.whatsAppMessage.create({
      data: {
        sourceId: refs.sourceId,
        fromPhone: "6281111111111",
        fromName: "Test User",
        body: BODY,
        timestamp: new Date(),
        isProcessed: true,
        isSupportRelated: true,
        confidence: 0.85,
        rawData: "{}",
      },
    });

    await db.supportTicket.create({
      data: {
        ticketNumber: TICKET_NUM,
        title: "Aplikasi error pas login",
        summary: "Aplikasi error pas login",
        reporterName: "Test User",
        sourceId: refs.sourceId,
        priorityId: refs.priorityHighId,
        statusId: refs.statusNewId,
        categoryId: refs.categoryAplikasiErrorId,
        picId: refs.picId,
      },
    });
  });

  afterAll(async () => {
    const db = getDb();
    await db.supportReportTicket.deleteMany({ where: { ticket: { ticketNumber: TICKET_NUM } } });
    await db.supportTicket.deleteMany({ where: { ticketNumber: TICKET_NUM } });
    await db.whatsAppMessage.deleteMany({ where: { body: BODY } });
  });

  it("generates a daily recap", async () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const report = await generateRecap({
      periodType: "daily",
      periodStart: start,
      periodEnd: now,
    });

    expect(report.id).toBeTruthy();
    expect(report.periodType).toBe("daily");
    expect(report.periodStart).toBeTruthy();
    expect(report.periodEnd).toBeTruthy();

    const content = JSON.parse(report.content);
    expect(content.summary).toBeTruthy();
    expect(content.summary.totalLaporan).toBeGreaterThanOrEqual(0);
    expect(content.summary.tiketBaru).toBeGreaterThanOrEqual(0);
    expect(content.openTickets).toBeDefined();
  });
});
