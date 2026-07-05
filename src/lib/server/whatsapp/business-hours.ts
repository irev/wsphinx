import { getDb } from "../db/index.js";

interface DaySchedule {
  start: string;
  end: string;
}

interface WeekSchedule {
  [day: string]: DaySchedule;
}

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

let cachedSchedule: WeekSchedule | null = null;
let cacheTime = 0;
const CACHE_TTL = 60_000;

async function loadSchedule(): Promise<WeekSchedule | null> {
  const now = Date.now();
  if (cachedSchedule && now - cacheTime < CACHE_TTL) return cachedSchedule;
  try {
    const db = getDb();
    const setting = await db.appSetting.findUnique({ where: { key: "wa_business_hours" } });
    if (!setting?.value) return null;
    cachedSchedule = JSON.parse(setting.value) as WeekSchedule;
    cacheTime = now;
    return cachedSchedule;
  } catch {
    return null;
  }
}

export async function isBusinessHour(date: Date = new Date()): Promise<boolean> {
  const schedule = await loadSchedule();
  if (!schedule) return true;

  const dayName = DAY_NAMES[date.getDay()];
  const daySchedule = schedule[dayName];
  if (!daySchedule) return false;

  const time = date.getHours() * 60 + date.getMinutes();
  const [startH, startM] = daySchedule.start.split(":").map(Number);
  const [endH, endM] = daySchedule.end.split(":").map(Number);
  const start = startH * 60 + startM;
  const end = endH * 60 + endM;

  return time >= start && time < end;
}

export function invalidateCache() {
  cachedSchedule = null;
  cacheTime = 0;
}
