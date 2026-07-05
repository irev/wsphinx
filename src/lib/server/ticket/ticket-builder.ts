import { getDb } from "../db/index.js";
import type { TicketCreateInput, TicketUpdateInput } from "../../types/index.js";

let ticketCounter = 0;

async function getNextTicketNumber(): Promise<string> {
  const db = getDb();
  const last = await db.supportTicket.findFirst({
    orderBy: { createdAt: "desc" },
    select: { ticketNumber: true },
  });

  let next = 1;
  if (last?.ticketNumber) {
    const num = parseInt(last.ticketNumber.replace("TKT-", ""));
    if (!isNaN(num)) next = num + 1;
  }
  return `TKT-${String(next).padStart(5, "0")}`;
}

export async function createTicket(input: TicketCreateInput) {
  const db = getDb();

  const defaultStatus = await db.supportStatus.findFirst({
    where: { name: "New" },
  });
  if (!defaultStatus) throw new Error("Default status 'New' not found. Run seed.");

  if (input.messageIds.length > 0) {
    const existing = await db.supportTicketMessage.findFirst({
      where: { messageId: { in: input.messageIds } },
      include: { ticket: true },
    });
    if (existing) {
      throw new Error(
        `Duplicate: message already linked to ticket ${existing.ticket.ticketNumber}`
      );
    }
  }

  const ticketNumber = await getNextTicketNumber();

  const ticket = await db.supportTicket.create({
    data: {
      ticketNumber,
      title: input.title,
      summary: input.summary,
      reporterName: input.reporterName,
      reporterPhone: input.reporterPhone,
      sourceId: input.sourceId,
      categoryId: input.categoryId,
      priorityId: input.priorityId,
      picId: input.picId,
      statusId: defaultStatus.id,
    },
  });

  if (input.messageIds.length > 0) {
    await db.supportTicketMessage.createMany({
      data: input.messageIds.map((messageId) => ({
        ticketId: ticket.id,
        messageId,
      })),
    });

    await db.whatsAppMessage.updateMany({
      where: { id: { in: input.messageIds } },
      data: { isProcessed: true },
    });
  }

  await db.auditLog.create({
    data: {
      action: "ticket.create",
      entity: "ticket",
      entityId: ticket.id,
      detail: JSON.stringify({ ticketNumber, title: input.title }),
    },
  });

  return ticket;
}

export async function updateTicket(ticketId: string, input: TicketUpdateInput, userId?: string) {
  const db = getDb();
  const ticket = await db.supportTicket.findUnique({ where: { id: ticketId } });
  if (!ticket) throw new Error("Ticket not found");

  const detail: Record<string, { from: string | null; to: string | null }> = {};
  const data: Record<string, any> = {};

  if (input.statusId && input.statusId !== ticket.statusId) {
    detail.status = { from: ticket.statusId, to: input.statusId };
    data.statusId = input.statusId;

    const resolvedStatus = await db.supportStatus.findFirst({ where: { name: "Resolved" } });
    if (resolvedStatus && input.statusId === resolvedStatus.id) {
      data.resolvedAt = new Date();
    }

    const closedStatus = await db.supportStatus.findFirst({ where: { name: "Closed" } });
    if (closedStatus && input.statusId === closedStatus.id) {
      data.closedAt = new Date();
    }

    await db.supportTicketUpdate.create({
      data: {
        ticketId,
        userId,
        fromStatus: ticket.statusId,
        toStatus: input.statusId,
        note: input.note,
      },
    });
  }
  if (input.priorityId) data.priorityId = input.priorityId;
  if (input.categoryId) data.categoryId = input.categoryId;
  if (input.picId) data.picId = input.picId;
  if (input.notes !== undefined) data.notes = input.notes;

  const updated = await db.supportTicket.update({
    where: { id: ticketId },
    data,
  });

  if (Object.keys(detail).length > 0) {
    await db.auditLog.create({
      data: {
        userId,
        action: "ticket.status_change",
        entity: "ticket",
        entityId: ticketId,
        detail: JSON.stringify(detail),
      },
    });
  }

  return updated;
}


