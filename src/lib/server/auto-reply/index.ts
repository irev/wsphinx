import type { WhatsAppMessage } from "../whatsapp/adapter.js";
import { getDb } from "../db/index.js";
import { enqueueOutgoing } from "../whatsapp/outbox.js";
import { isBusinessHour } from "../whatsapp/business-hours.js";

interface ReplyContext {
  msg: WhatsAppMessage;
  ticketNumber?: string;
  summary?: string;
}

function compileTemplate(template: string, ctx: ReplyContext): string {
  return template
    .replace(/\{name\}/g, ctx.msg.fromName || ctx.msg.fromPhone)
    .replace(/\{phone\}/g, ctx.msg.fromPhone)
    .replace(/\{ticket\}/g, ctx.ticketNumber || "")
    .replace(/\{summary\}/g, ctx.summary || ctx.msg.body)
    .replace(/\{body\}/g, ctx.msg.body);
}

async function loadAppSetting(key: string, fallback: string): Promise<string> {
  try {
    const db = getDb();
    const setting = await db.appSetting.findUnique({ where: { key } });
    return setting?.value || fallback;
  } catch {
    return fallback;
  }
}

async function checkAutoReplyLimits(chatId: string, fromPhone: string): Promise<{ allowed: boolean; reason?: string }> {
  const db = getDb();

  const maxPerDay = parseInt(await loadAppSetting("wa_auto_reply_max_per_chat_per_day", "3"));
  const cooldownMin = parseInt(await loadAppSetting("wa_auto_reply_cooldown_minutes", "5"));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayCount = await db.whatsAppOutbox.count({
    where: {
      chatId,
      source: "auto_reply",
      status: "sent",
      sentAt: { gte: today },
    },
  });

  if (todayCount >= maxPerDay) {
    return { allowed: false, reason: `auto_reply_daily_limit (${todayCount}/${maxPerDay})` };
  }

  if (cooldownMin > 0) {
    const since = new Date(Date.now() - cooldownMin * 60_000);
    const recent = await db.whatsAppOutbox.findFirst({
      where: {
        chatId,
        source: "auto_reply",
        status: "sent",
        sentAt: { gte: since },
      },
      orderBy: { sentAt: "desc" },
      select: { id: true },
    });
    if (recent) {
      return { allowed: false, reason: `auto_reply_cooldown (${cooldownMin}m)` };
    }
  }

  return { allowed: true };
}

export async function maybeAutoReply(
  _adapter: unknown,
  msg: WhatsAppMessage,
  ctx?: { ticketNumber?: string; summary?: string },
): Promise<void> {
  const db = getDb();
  const source = await db.whatsAppSource.findUnique({
    where: { id: msg.sourceId },
  });
  if (!source || !source.autoReply || !source.replyTemplate) return;
  if (!msg.chatId) return;

  const inBusinessHour = await isBusinessHour();
  let template: string;

  if (!inBusinessHour) {
    const afterHoursTemplate = await loadAppSetting("wa_after_hours_template", "");
    if (afterHoursTemplate) {
      template = afterHoursTemplate;
    } else {
      return;
    }
  } else {
    template = source.replyTemplate;
  }

  const limits = await checkAutoReplyLimits(msg.chatId, msg.fromPhone);
  if (!limits.allowed) {
    console.log("[AutoReply] Skipped: %s (chatId=%s, phone=%s)", limits.reason, msg.chatId, msg.fromPhone);
    return;
  }

  const compiled = compileTemplate(template, {
    msg,
    ticketNumber: ctx?.ticketNumber,
    summary: ctx?.summary,
  });

  const result = await enqueueOutgoing({
    chatId: msg.chatId,
    phone: msg.fromPhone,
    message: compiled,
    source: "auto_reply",
  });

  if (!result.success) {
    console.log("[AutoReply] Skipped: %s (chatId=%s)", result.error, msg.chatId);
  }
}
