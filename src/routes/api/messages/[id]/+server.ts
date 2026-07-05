import { json, type RequestHandler } from "@sveltejs/kit";
import { getDb } from "$lib/server/db/index.js";
import { z } from "zod";

export const GET: RequestHandler = async ({ params }) => {
  const db = getDb();
  const msg = await db.whatsAppMessage.findUnique({
    where: { id: params.id },
    include: { source: true, ticket: { include: { ticket: true } } },
  });
  if (!msg) return json({ error: "Message not found" }, { status: 404 });
  return json({ data: msg });
};

const patchSchema = z.object({
  isRead: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const PATCH: RequestHandler = async ({ params, request }) => {
  const db = getDb();
  let raw: unknown;
  try { raw = await request.json(); }
  catch { return json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) return json({ error: "Validasi gagal", detail: parsed.error.flatten() }, { status: 400 });

  const msg = await db.whatsAppMessage.findUnique({ where: { id: params.id } });
  if (!msg) return json({ error: "Message not found" }, { status: 404 });

  const updated = await db.whatsAppMessage.update({
    where: { id: params.id },
    data: parsed.data,
  });

  return json({ data: updated });
};
