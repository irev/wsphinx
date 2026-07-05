import { getDb } from "../db/index.js";

const STOP_KEYWORDS_DEFAULT = ["STOP", "BERHENTI", "UNSUBSCRIBE", "STOP ALL", "CANCEL", "HENTIKAN"];

let cachedStopKeywords: string[] | null = null;
let cacheTime = 0;
const CACHE_TTL = 60_000;

async function loadStopKeywords(): Promise<string[]> {
  const now = Date.now();
  if (cachedStopKeywords && now - cacheTime < CACHE_TTL) return cachedStopKeywords;
  try {
    const db = getDb();
    const setting = await db.appSetting.findUnique({ where: { key: "wa_stop_keywords" } });
    const raw = setting?.value || STOP_KEYWORDS_DEFAULT.join(",");
    cachedStopKeywords = raw.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
    cacheTime = now;
    return cachedStopKeywords;
  } catch {
    return STOP_KEYWORDS_DEFAULT;
  }
}

export async function isStopKeyword(body: string): Promise<boolean> {
  const keywords = await loadStopKeywords();
  const cleaned = body.trim().toUpperCase().replace(/[^\w\s]/g, "");
  return keywords.some((kw) => cleaned === kw || cleaned.startsWith(kw + " "));
}

export async function ensureContactPolicy(phone: string, chatId?: string): Promise<void> {
  const db = getDb();
  await db.whatsAppContactPolicy.upsert({
    where: { phone },
    update: { chatId: chatId || undefined, hasInboundHistory: true, lastInboundAt: new Date() },
    create: { phone, chatId: chatId || undefined, hasInboundHistory: true, isOptedIn: true, lastInboundAt: new Date() },
  });
}

export async function applyOptOut(phone: string, reason: string = "STOP_keyword"): Promise<void> {
  const db = getDb();
  await db.whatsAppContactPolicy.upsert({
    where: { phone },
    update: { isOptedOut: true, isOptedIn: false, optedOutAt: new Date(), optedOutReason: reason },
    create: { phone, isOptedOut: true, isOptedIn: false, optedOutAt: new Date(), optedOutReason: reason },
  });
}

export async function checkContactPolicy(phone: string, chatId?: string): Promise<{
  allowed: boolean;
  reason?: string;
  policy?: {
    isOptedOut: boolean;
    isBlocked: boolean;
    hasInboundHistory: boolean;
  } | null;
}> {
  const db = getDb();
  const policy = await db.whatsAppContactPolicy.findUnique({ where: { phone } });
  if (!policy) {
    if (chatId) {
      const source = await db.whatsAppSource.findFirst({ where: { chatId } });
      if (source) {
        await ensureContactPolicy(phone, chatId);
        return { allowed: true, policy: { isOptedOut: false, isBlocked: false, hasInboundHistory: true } };
      }
    }
    return { allowed: false, reason: "no_inbound_history", policy: null };
  }
  if (policy.isBlocked) return { allowed: false, reason: "contact_blocked", policy };
  if (policy.isOptedOut) return { allowed: false, reason: "contact_opted_out", policy };
  if (!policy.hasInboundHistory) return { allowed: false, reason: "no_inbound_history", policy };
  return { allowed: true, policy };
}

export async function getOrCreatePolicy(phone: string, chatId?: string) {
  const db = getDb();
  let policy = await db.whatsAppContactPolicy.findUnique({ where: { phone } });
  if (!policy) {
    policy = await db.whatsAppContactPolicy.create({
      data: { phone, chatId: chatId || undefined, hasInboundHistory: false, isOptedIn: false },
    });
  }
  return policy;
}

export function invalidateKeywordsCache() {
  cachedStopKeywords = null;
  cacheTime = 0;
}
