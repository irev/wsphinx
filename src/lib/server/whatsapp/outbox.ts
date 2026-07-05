import { getDb } from "../db/index.js";
import { checkContactPolicy } from "./contact-policy.js";
import { canSendMessage } from "./rate-limit.js";
import { isBusinessHour } from "./business-hours.js";

interface OutboxInput {
  chatId: string;
  phone?: string;
  message: string;
  source?: string;
  maxRetries?: number;
}

export async function enqueueOutgoing(input: OutboxInput): Promise<{
  success: boolean;
  outboxId?: string;
  error?: string;
  blockedReason?: string;
}> {
  const businessHour = await isBusinessHour();
  if (!businessHour) {
    return { success: false, error: "outside_business_hours", blockedReason: "outside_business_hours" };
  }

  if (input.phone) {
    const policy = await checkContactPolicy(input.phone, input.chatId);
    if (!policy.allowed) {
      return { success: false, error: policy.reason, blockedReason: policy.reason };
    }
  }

  const rate = await canSendMessage(input.chatId);
  if (!rate.allowed) {
    return { success: false, error: rate.reason, blockedReason: rate.reason };
  }

  const db = getDb();
  const outbox = await db.whatsAppOutbox.create({
    data: {
      chatId: input.chatId,
      phone: input.phone,
      message: input.message,
      source: input.source || "system",
      status: "pending",
      maxRetries: input.maxRetries ?? 2,
    },
  });
  return { success: true, outboxId: outbox.id };
}

export async function processNextOutgoing(
  sendFn: (chatId: string, text: string) => Promise<void>,
): Promise<boolean> {
  const db = getDb();
  const item = await db.whatsAppOutbox.findFirst({
    where: { status: "pending" },
    orderBy: { createdAt: "asc" },
  });
  if (!item) return false;

  await db.whatsAppOutbox.update({
    where: { id: item.id },
    data: { status: "processing" },
  });

  try {
    await sendFn(item.chatId, item.message);
    await db.whatsAppOutbox.update({
      where: { id: item.id },
      data: { status: "sent", sentAt: new Date(), errorMessage: null, retryCount: item.retryCount },
    });
    if (item.phone) {
      await db.whatsAppContactPolicy.upsert({
        where: { phone: item.phone },
        update: { lastSentAt: new Date(), hasInboundHistory: true },
        create: { phone: item.phone, chatId: item.chatId, lastSentAt: new Date(), hasInboundHistory: true, isOptedIn: true },
      });
    }
    await db.auditLog.create({
      data: {
        action: "message.sent",
        entity: "outbox",
        entityId: item.id,
        detail: JSON.stringify({ chatId: item.chatId, source: item.source, length: item.message.length }),
      },
    });
    return true;
  } catch (e) {
    const errMsg = (e as Error).message;
    const newRetry = item.retryCount + 1;
    if (newRetry >= item.maxRetries) {
      await db.whatsAppOutbox.update({
        where: { id: item.id },
        data: { status: "failed", errorMessage: errMsg, retryCount: newRetry },
      });
    } else {
      await db.whatsAppOutbox.update({
        where: { id: item.id },
        data: { status: "pending", errorMessage: errMsg, retryCount: newRetry },
      });
    }
    await db.auditLog.create({
      data: {
        action: "message.failed",
        entity: "outbox",
        entityId: item.id,
        detail: JSON.stringify({ error: errMsg, retryCount: newRetry, maxRetries: item.maxRetries }),
      },
    });
    return false;
  }
}

export async function getOutboxStats() {
  const db = getDb();
  const [pending, sent, failed, blocked] = await Promise.all([
    db.whatsAppOutbox.count({ where: { status: "pending" } }),
    db.whatsAppOutbox.count({ where: { status: "sent" } }),
    db.whatsAppOutbox.count({ where: { status: "failed" } }),
    db.whatsAppOutbox.count({ where: { status: "blocked" } }),
  ]);
  return { pending, sent, failed, blocked };
}
