import { getDb } from "../db/index.js";

interface RateLimitConfig {
  maxMessagesPerHour: number;
  minGapPerNumberSeconds: number;
  maxConsecutiveFailures: number;
}

let cachedConfig: RateLimitConfig | null = null;
let cacheTime = 0;
const CACHE_TTL = 60_000;

const DEFAULTS: RateLimitConfig = {
  maxMessagesPerHour: 20,
  minGapPerNumberSeconds: 120,
  maxConsecutiveFailures: 5,
};

async function loadConfig(): Promise<RateLimitConfig> {
  const now = Date.now();
  if (cachedConfig && now - cacheTime < CACHE_TTL) return cachedConfig;
  try {
    const db = getDb();
    const entries = await db.appSetting.findMany({
      where: {
        key: {
          in: ["wa_max_messages_per_hour", "wa_min_gap_per_number_seconds", "wa_max_consecutive_failures"],
        },
      },
    });
    const map = Object.fromEntries(entries.map((e) => [e.key, e.value]));
    cachedConfig = {
      maxMessagesPerHour: parseInt(map.wa_max_messages_per_hour) || DEFAULTS.maxMessagesPerHour,
      minGapPerNumberSeconds: parseInt(map.wa_min_gap_per_number_seconds) || DEFAULTS.minGapPerNumberSeconds,
      maxConsecutiveFailures: parseInt(map.wa_max_consecutive_failures) || DEFAULTS.maxConsecutiveFailures,
    };
    cacheTime = now;
    return cachedConfig;
  } catch {
    return DEFAULTS;
  }
}

export async function checkHourlyRate(): Promise<{ allowed: boolean; current: number; max: number }> {
  const config = await loadConfig();
  const db = getDb();
  const since = new Date(Date.now() - 3600_000);
  const count = await db.whatsAppOutbox.count({
    where: { status: "sent", sentAt: { gte: since } },
  });
  return { allowed: count < config.maxMessagesPerHour, current: count, max: config.maxMessagesPerHour };
}

export async function checkPerChatGap(chatId: string): Promise<{ allowed: boolean; lastSentAt: Date | null; minGapSeconds: number }> {
  const config = await loadConfig();
  const db = getDb();
  const last = await db.whatsAppOutbox.findFirst({
    where: { chatId, status: "sent" },
    orderBy: { sentAt: "desc" },
    select: { sentAt: true },
  });
  if (!last?.sentAt) return { allowed: true, lastSentAt: null, minGapSeconds: config.minGapPerNumberSeconds };
  const diffMs = Date.now() - last.sentAt.getTime();
  return {
    allowed: diffMs >= config.minGapPerNumberSeconds * 1000,
    lastSentAt: last.sentAt,
    minGapSeconds: config.minGapPerNumberSeconds,
  };
}

export async function checkConsecutiveFailures(chatId: string): Promise<{ allowed: boolean; failures: number; max: number }> {
  const config = await loadConfig();
  const db = getDb();
  const recent = await db.whatsAppOutbox.findMany({
    where: { chatId, status: "failed" },
    orderBy: { updatedAt: "desc" },
    take: config.maxConsecutiveFailures,
    select: { id: true },
  });
  return { allowed: recent.length < config.maxConsecutiveFailures, failures: recent.length, max: config.maxConsecutiveFailures };
}

export async function canSendMessage(chatId: string): Promise<{
  allowed: boolean;
  reason?: string;
  details?: Record<string, unknown>;
}> {
  const hourly = await checkHourlyRate();
  if (!hourly.allowed) {
    return { allowed: false, reason: "hourly_rate_exceeded", details: { current: hourly.current, max: hourly.max } };
  }
  const gap = await checkPerChatGap(chatId);
  if (!gap.allowed) {
    return { allowed: false, reason: "per_chat_cooldown", details: { minGapSeconds: gap.minGapSeconds } };
  }
  const failures = await checkConsecutiveFailures(chatId);
  if (!failures.allowed) {
    return { allowed: false, reason: "max_consecutive_failures", details: { failures: failures.failures, max: failures.max } };
  }
  return { allowed: true };
}

export function invalidateRateCache() {
  cachedConfig = null;
  cacheTime = 0;
}
