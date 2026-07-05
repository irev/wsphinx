import { json, type RequestHandler } from "@sveltejs/kit";
import { getDb } from "$lib/server/db/index.js";

export const POST: RequestHandler = async ({ params, request }) => {
  if (!params.id) return json({ error: "Missing ticket id" }, { status: 400 });
  const db = getDb();
  const body = await request.json().catch(() => ({}));
  const reason = body.reason;

  const closedStatus = await db.supportStatus.findFirst({ where: { name: "Closed" } });
  if (!closedStatus) return json({ error: "Status 'Closed' not found" }, { status: 500 });

  const ticket = await db.supportTicket.findUnique({ where: { id: params.id } });
  if (!ticket) return json({ error: "Ticket not found" }, { status: 404 });

  const data: Record<string, any> = {
    statusId: closedStatus.id,
    closedAt: new Date(),
    closedReason: reason || null,
  };
  if (!ticket.resolvedAt) data.resolvedAt = new Date();

  const updated = await db.supportTicket.update({
    where: { id: params.id },
    data,
    include: { status: true, priority: true, category: true, pic: true },
  });

  await db.supportTicketUpdate.create({
    data: {
      ticketId: params.id,
      fromStatus: ticket.statusId,
      toStatus: closedStatus.id,
      note: reason || "Closed",
    },
  });

  await db.auditLog.create({
    data: {
      action: "ticket.close",
      entity: "ticket",
      entityId: params.id,
      detail: JSON.stringify({ reason }),
    },
  });

  return json({ data: updated });
};
