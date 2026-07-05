import { json, type RequestHandler } from "@sveltejs/kit";
import { getDb } from "$lib/server/db/index.js";
import { createTicket } from "$lib/server/ticket/ticket-builder.js";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  reporterName: z.string().min(1),
  reporterPhone: z.string().optional(),
  sourceId: z.string().optional(),
  categoryId: z.string().optional(),
  priorityId: z.string().optional(),
  picId: z.string().optional(),
  messageIds: z.array(z.string()).default([]),
});

export const GET: RequestHandler = async ({ url }) => {
  const db = getDb();
  const statusId = url.searchParams.get("statusId");
  const priorityId = url.searchParams.get("priorityId");
  const categoryId = url.searchParams.get("categoryId");
  const picId = url.searchParams.get("picId");
  const search = url.searchParams.get("search");
  const limit = parseInt(url.searchParams.get("limit") || "50");
  const offset = parseInt(url.searchParams.get("offset") || "0");

  const where: Record<string, unknown> = {};
  if (statusId) where.statusId = statusId;
  if (priorityId) where.priorityId = priorityId;
  if (categoryId) where.categoryId = categoryId;
  if (picId) where.picId = picId;
  if (search) where.OR = [
    { title: { contains: search } },
    { summary: { contains: search } },
    { ticketNumber: { contains: search } },
  ];

  const [tickets, total] = await Promise.all([
    db.supportTicket.findMany({
      where,
      include: { status: true, priority: true, category: true, pic: true, source: true, updates: { take: 3, orderBy: { createdAt: "desc" } } },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    db.supportTicket.count({ where }),
  ]);

  return json({ data: tickets, total, limit, offset });
};

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const ticket = await createTicket(parsed.data);
    return json({ data: ticket }, { status: 201 });
  } catch (e) {
    return json({ error: (e as Error).message }, { status: 409 });
  }
};
