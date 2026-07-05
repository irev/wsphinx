import { getDb } from "../db/index.js";

const ENV_URL = process.env.WORKER_API_URL || "http://127.0.0.1:9494";

let cachedUrl: string | null = null;
let lastFetch = 0;
const CACHE_TTL = 60_000;

export async function getWorkerUrl(): Promise<string> {
  const now = Date.now();
  if (cachedUrl && now - lastFetch < CACHE_TTL) {
    return cachedUrl;
  }
  try {
    const db = getDb();
    const setting = await db.appSetting.findUnique({ where: { key: "wa_worker_url" } });
    cachedUrl = setting?.value || ENV_URL;
    lastFetch = now;
  } catch {
    cachedUrl = ENV_URL;
  }
  return cachedUrl;
}

export function getWorkerUrlSync(): string {
  return cachedUrl || ENV_URL;
}
