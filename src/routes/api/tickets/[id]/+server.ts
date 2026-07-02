import { json, type RequestHandler } from "@sveltejs/kit";
import { getDb } from "$lib/server/db/index.js";
import { updateTicket } from "$lib/server/ticket/ticket-builder.js";

export const GET: RequestHandler = async ({ params }) => {
  const db = getDb();
  const ticket = await db.supportTicket.findUnique({
    where: { id: params.id },
    include: {
      status: true,
      priority: true,
      category: true,
      pic: true,
      source: true,
      messages: { include: { message: true }, orderBy: { message: { timestamp: "asc" } } },
      updates: { include: { user: true }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!ticket) return json({ error: "Ticket not found" }, { status: 404 });
  return json({ data: ticket });
};

export const PUT: RequestHandler = async ({ params, request }) => {
  if (!params.id) return json({ error: "Missing ticket id" }, { status: 400 });
  const body = await request.json();
  try {
    const ticket = await updateTicket(params.id, body);
    return json({ data: ticket });
  } catch (e) {
    return json({ error: (e as Error).message }, { status: 404 });
  }
};
