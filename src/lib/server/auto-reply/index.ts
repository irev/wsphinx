import type { WhatsAppMessage } from "../whatsapp/adapter.js";
import { getDb } from "../db/index.js";
import { enqueueOutgoing } from "../whatsapp/outbox.js";

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

  const compiled = compileTemplate(source.replyTemplate, {
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
