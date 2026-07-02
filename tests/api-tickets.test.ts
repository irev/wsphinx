import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "../src/lib/server/db/index.js";
import { createTicket, updateTicket, closeTicket } from "../src/lib/server/ticket/ticket-builder.js";

describe("Ticket Builder (integration)", () => {
  let sourceId: string;
  let priorityId: string;
  let categoryId: string;
  let messageId: string;

  beforeAll(async () => {
    const db = getDb();
    const source = await db.whatsAppSource.findFirst();
    if (!source) throw new Error("Run seed first");
    sourceId = source.id;

    const priority = await db.supportPriority.findFirst({ where: { level: 3 } });
    if (!priority) throw new Error("Priority not found");
    priorityId = priority.id;

    const category = await db.supportCategory.findFirst({ where: { name: "Aplikasi error" } });
    if (!category) throw new Error("Category not found");
    categoryId = category.id;

    const msg = await db.whatsAppMessage.create({
      data: {
        sourceId,
        fromPhone: "6281111111111",
        fromName: "Test User",
        body: "Aplikasi error pas login",
        timestamp: new Date(),
        rawData: "{}",
      },
    });
    messageId = msg.id;
  });

  afterAll(async () => {
    const db = getDb();
    await db.supportTicketMessage.deleteMany({ where: { messageId } });
    await db.whatsAppMessage.deleteMany({ where: { id: messageId } });
  });

  it("creates a ticket with linked message", async () => {
    const ticket = await createTicket({
      title: "Test ticket",
      summary: "User reported login error",
      reporterName: "Test User",
      reporterPhone: "6281111111111",
      sourceId,
      categoryId,
      priorityId,
      messageIds: [messageId],
    });

    expect(ticket.ticketNumber).toMatch(/^TKT-\d{5}$/);
    expect(ticket.title).toBe("Test ticket");
    expect(ticket.reporterName).toBe("Test User");
    expect(ticket.statusId).toBeTruthy();

    const db = getDb();
    const linked = await db.supportTicketMessage.findFirst({ where: { messageId } });
    expect(linked?.ticketId).toBe(ticket.id);
  });

  it("throws on duplicate message", async () => {
    await expect(
      createTicket({
        title: "Duplicate",
        summary: "Should fail",
        reporterName: "Test",
        messageIds: [messageId],
      })
    ).rejects.toThrow(/duplicate/i);
  });

  it("updates ticket status", async () => {
    const db = getDb();
    const ticket = await createTicket({
      title: "Update test",
      summary: "Testing update",
      reporterName: "Test",
      messageIds: [],
    });

    const inProgress = await db.supportStatus.findFirst({ where: { name: "In Progress" } });
    expect(inProgress).toBeTruthy();

    const updated = await updateTicket(ticket.id, { statusId: inProgress!.id });
    expect(updated.statusId).toBe(inProgress!.id);
  });

  it("closes a ticket", async () => {
    const db = getDb();
    const ticket = await createTicket({
      title: "Close test",
      summary: "Testing close",
      reporterName: "Test",
      messageIds: [],
    });

    const closed = await closeTicket(ticket.id, "Sudah diperbaiki");
    const closedStatus = await db.supportStatus.findFirst({ where: { name: "Closed" } });
    expect(closed.statusId).toBe(closedStatus!.id);
  });
});
