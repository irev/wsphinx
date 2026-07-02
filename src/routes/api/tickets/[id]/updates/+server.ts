import { json, type RequestHandler } from "@sveltejs/kit";
import { getDb } from "$lib/server/db/index.js";
import { updateTicket } from "$lib/server/ticket/ticket-builder.js";

export const POST: RequestHandler = async ({ params, request }) => {
  if (!params.id) return json({ error: "Missing ticket id" }, { status: 400 });
  const db = getDb();
  const body = await request.json();

  if (body.statusId || body.picId || body.priorityId || body.categoryId) {
    try {
      const ticket = await updateTicket(params.id, body);
      return json({ data: ticket }, { status: 201 });
    } catch (e) {
      return json({ error: (e as Error).message }, { status: 404 });
    }
  }

  if (body.note) {
    const ticket = await db.supportTicket.findUnique({ where: { id: params.id } });
    if (!ticket) return json({ error: "Ticket not found" }, { status: 404 });

    const update = await db.supportTicketUpdate.create({
      data: {
        ticketId: params.id,
        fromStatus: ticket.statusId,
        toStatus: ticket.statusId,
        note: body.note,
      },
    });

    await db.auditLog.create({
      data: {
        action: "ticket.note_added",
        entity: "ticket",
        entityId: params.id,
        detail: JSON.stringify({ note: body.note }),
      },
    });

    return json({ data: update }, { status: 201 });
  }

  return json({ error: "No update data provided" }, { status: 400 });
};
