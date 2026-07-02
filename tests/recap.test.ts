import { describe, it, expect, beforeAll } from "vitest";
import { generateRecap } from "../src/lib/server/recap/index.js";
import { getDb } from "../src/lib/server/db/index.js";

describe("Recap Generator", () => {
  beforeAll(async () => {
    const db = getDb();
    const count = await db.supportTicket.count();
    if (count === 0) {
      throw new Error("No tickets found. Run seed and create at least one ticket first.");
    }
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
