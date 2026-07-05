import { json, type RequestHandler } from "@sveltejs/kit";
import { getDb } from "$lib/server/db/index.js";

export const POST: RequestHandler = async ({ request }) => {
  const db = getDb();
  const body = await request.json();

  const results: Record<string, { created: number; updated: number; skipped: number; errors: string[] }> = {};

  // Categories: upsert by name
  if (Array.isArray(body.categories)) {
    let created = 0, updated = 0, skipped = 0;
    const errors: string[] = [];
    for (const cat of body.categories) {
      if (!cat.name) { skipped++; continue; }
      try {
        const existing = await db.supportCategory.findFirst({ where: { name: cat.name } });
        if (existing) {
          await db.supportCategory.update({
            where: { id: existing.id },
            data: {
              description: cat.description ?? existing.description,
              sortOrder: cat.sortOrder ?? existing.sortOrder,
              active: cat.active ?? existing.active,
            },
          });
          updated++;
        } else {
          await db.supportCategory.create({
            data: { name: cat.name, description: cat.description || null, sortOrder: cat.sortOrder ?? 0, active: cat.active ?? true },
          });
          created++;
        }
      } catch (e) { errors.push(`Category "${cat.name}": ${(e as Error).message}`); }
    }
    results.categories = { created, updated, skipped, errors };
  }

  // Priorities: upsert by level
  if (Array.isArray(body.priorities)) {
    let created = 0, updated = 0, skipped = 0;
    const errors: string[] = [];
    for (const p of body.priorities) {
      if (!p.name || !p.level) { skipped++; continue; }
      try {
        const existing = await db.supportPriority.findUnique({ where: { level: p.level } });
        if (existing) {
          await db.supportPriority.update({
            where: { id: existing.id },
            data: { name: p.name, color: p.color ?? existing.color, description: p.description ?? existing.description },
          });
          updated++;
        } else {
          await db.supportPriority.create({
            data: { name: p.name, level: p.level, color: p.color || "#6b7280", description: p.description || null },
          });
          created++;
        }
      } catch (e) { errors.push(`Priority "${p.name}": ${(e as Error).message}`); }
    }
    results.priorities = { created, updated, skipped, errors };
  }

  // Statuses: upsert by name
  if (Array.isArray(body.statuses)) {
    let created = 0, updated = 0, skipped = 0;
    const errors: string[] = [];
    for (const s of body.statuses) {
      if (!s.name) { skipped++; continue; }
      try {
        const existing = await db.supportStatus.findFirst({ where: { name: s.name } });
        if (existing) {
          await db.supportStatus.update({
            where: { id: existing.id },
            data: {
              sortOrder: s.sortOrder ?? existing.sortOrder,
              isClosed: s.isClosed ?? existing.isClosed,
              color: s.color ?? existing.color,
              description: s.description ?? existing.description,
            },
          });
          updated++;
        } else {
          await db.supportStatus.create({
            data: { name: s.name, sortOrder: s.sortOrder ?? 0, isClosed: s.isClosed ?? false, color: s.color || "#6b7280", description: s.description || null },
          });
          created++;
        }
      } catch (e) { errors.push(`Status "${s.name}": ${(e as Error).message}`); }
    }
    results.statuses = { created, updated, skipped, errors };
  }

  // Users: upsert by phone
  if (Array.isArray(body.users)) {
    let created = 0, updated = 0, skipped = 0;
    const errors: string[] = [];
    for (const u of body.users) {
      if (!u.name || !u.phone) { skipped++; continue; }
      try {
        const existing = await db.user.findUnique({ where: { phone: u.phone } });
        if (existing) {
          await db.user.update({
            where: { id: existing.id },
            data: {
              name: u.name,
              email: u.email ?? existing.email,
              role: u.role ?? existing.role,
              active: u.active ?? existing.active,
            },
          });
          updated++;
        } else {
          await db.user.create({
            data: { name: u.name, phone: u.phone, email: u.email || null, role: u.role || "user", active: u.active ?? true },
          });
          created++;
        }
      } catch (e) { errors.push(`User "${u.name}": ${(e as Error).message}`); }
    }
    results.users = { created, updated, skipped, errors };
  }

  // Sources: upsert by name
  if (Array.isArray(body.sources)) {
    let created = 0, updated = 0, skipped = 0;
    const errors: string[] = [];
    for (const s of body.sources) {
      if (!s.name) { skipped++; continue; }
      try {
        const existing = await db.whatsAppSource.findFirst({ where: { name: s.name } });
        if (existing) {
          await db.whatsAppSource.update({
            where: { id: existing.id },
            data: {
              type: s.type ?? existing.type,
              phone: s.phone ?? existing.phone,
              chatId: s.chatId ?? existing.chatId,
              active: s.active ?? existing.active,
              autoReply: s.autoReply ?? existing.autoReply,
              replyTemplate: s.replyTemplate ?? existing.replyTemplate,
              description: s.description ?? existing.description,
            },
          });
          updated++;
        } else {
          await db.whatsAppSource.create({
            data: { name: s.name, type: s.type || "group", phone: s.phone || "", chatId: s.chatId || null, active: s.active ?? true, autoReply: s.autoReply ?? false, replyTemplate: s.replyTemplate || null, description: s.description || null },
          });
          created++;
        }
      } catch (e) { errors.push(`Source "${s.name}": ${(e as Error).message}`); }
    }
    results.sources = { created, updated, skipped, errors };
  }

  return json({ data: results });
};
