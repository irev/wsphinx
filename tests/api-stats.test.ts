import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb, resetDb } from "../src/lib/server/db/index.js";
import { getSeedRefs, mockAdminEvent } from "./helpers.js";

describe("GET /api/whatsapp/stats", () => {
  let refs: any;

  beforeAll(async () => {
    refs = await getSeedRefs();

    const db = getDb();

    await db.whatsAppMessage.create({
      data: {
        sourceId: refs.sourceId,
        fromPhone: "6281111111111",
        fromName: "Test User",
        body: "STATS-TEST-Aplikasi error pas login",
        timestamp: new Date(),
        isProcessed: true,
        isSupportRelated: true,
        confidence: 0.85,
        rawData: "{}",
      },
    });

    await db.whatsAppMessage.create({
      data: {
        sourceId: refs.sourceId,
        fromPhone: "6281111111112",
        fromName: "Another User",
        body: "STATS-TEST-Testing",
        timestamp: new Date(),
        isProcessed: false,
        isSupportRelated: false,
        rawData: "{}",
      },
    });
  });

  afterAll(async () => {
    const db = getDb();
    await db.whatsAppMessage.deleteMany({
      where: { body: { in: ["STATS-TEST-Aplikasi error pas login", "STATS-TEST-Testing"] } },
    });
    resetDb();
  });

  const ev = mockAdminEvent() as any;

  it("returns correct structure", async () => {
    const { GET } = await import("../src/routes/api/whatsapp/stats/+server.js");

    const res = await GET(ev);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data).toBeDefined();
    expect(body.data.today).toBeDefined();
    expect(body.data.week).toBeDefined();
    expect(typeof body.data.today.messages).toBe("number");
    expect(typeof body.data.unprocessed).toBe("number");
  });

  it("today.messages counts today's messages", async () => {
    const { GET } = await import("../src/routes/api/whatsapp/stats/+server.js");

    const res = await GET(ev);
    const body = await res.json();

    expect(body.data.today.messages).toBeGreaterThanOrEqual(2);
  });

  it("today.classified counts processed today", async () => {
    const { GET } = await import("../src/routes/api/whatsapp/stats/+server.js");

    const res = await GET(ev);
    const body = await res.json();

    expect(body.data.today.classified).toBeGreaterThanOrEqual(1);
  });

  it("unprocessed counts non-classified messages", async () => {
    const { GET } = await import("../src/routes/api/whatsapp/stats/+server.js");

    const res = await GET(ev);
    const body = await res.json();

    expect(body.data.unprocessed).toBeGreaterThanOrEqual(1);
  });

  it("avgConfidence returns a number or null", async () => {
    const { GET } = await import("../src/routes/api/whatsapp/stats/+server.js");

    const res = await GET(ev);
    const body = await res.json();

    expect(body.data.avgConfidence === null || typeof body.data.avgConfidence === "number").toBe(true);
  });
});
