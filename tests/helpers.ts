import type { RequestEvent } from "@sveltejs/kit";
import { getDb, resetDb } from "../src/lib/server/db/index.js";
import { execSync } from "node:child_process";

export function mockEvent(overrides?: Partial<RequestEvent>): RequestEvent {
  const url = new URL("http://localhost:9393");
  return {
    request: new Request("http://localhost:9393"),
    url,
    params: {},
    route: { id: "/api/test" },
    locals: {},
    platform: null,
    fetch: globalThis.fetch,
    getClientAddress: () => {
      try { return overrides?.getClientAddress?.() ?? "127.0.0.1"; } catch { return "127.0.0.1"; }
    },
    cookies: {
      get: () => undefined,
      getAll: () => [],
      set: () => {},
      delete: () => {},
      serialize: () => "",
    },
    setHeaders: () => {},
    isDataRequest: false,
    isSubRequest: false,
    ...overrides,
  } as unknown as RequestEvent;
}

export function mockAdminEvent(): RequestEvent {
  return mockEvent({
    locals: { user: { userId: "admin-id", role: "admin", name: "Admin" } },
  } as unknown as Partial<RequestEvent>);
}

export function mockPicEvent(): RequestEvent {
  return mockEvent({
    locals: { user: { userId: "pic-id", role: "pic", name: "PIC" } },
  } as unknown as Partial<RequestEvent>);
}

export function mockUserEvent(): RequestEvent {
  return mockEvent({
    locals: { user: { userId: "user-id", role: "user", name: "User" } },
  } as unknown as Partial<RequestEvent>);
}

export function mockUnauthenticatedEvent(): RequestEvent {
  return mockEvent({
    locals: {},
  } as unknown as Partial<RequestEvent>);
}

export interface SeedRefs {
  sourceId: string;
  priorityCriticalId: string;
  priorityHighId: string;
  priorityMediumId: string;
  priorityLowId: string;
  statusNewId: string;
  statusOpenId: string;
  statusInProgressId: string;
  statusClosedId: string;
  categoryAplikasiErrorId: string;
  categoryJaringanId: string;
  adminId: string;
  picId: string;
}

export async function getSeedRefs(): Promise<SeedRefs> {
  const db = getDb();

  const source = await db.whatsAppSource.findFirst();
  if (!source) throw new Error("Run seed first (no WhatsApp source found)");

  const priorities = await db.supportPriority.findMany({ orderBy: { level: "asc" } });
  const statuses = await db.supportStatus.findMany({ orderBy: { sortOrder: "asc" } });
  const categories = await db.supportCategory.findMany();
  const users = await db.user.findMany();

  const findByName = <T extends { name: string }>(arr: T[], name: string): T => {
    const found = arr.find((x) => x.name === name);
    if (!found) throw new Error(`Seed data missing: ${name}`);
    return found;
  };

  return {
    sourceId: source.id,
    priorityCriticalId: findByName(priorities, "Critical").id,
    priorityHighId: findByName(priorities, "High").id,
    priorityMediumId: findByName(priorities, "Medium").id,
    priorityLowId: findByName(priorities, "Low").id,
    statusNewId: findByName(statuses, "New").id,
    statusOpenId: findByName(statuses, "Open").id,
    statusInProgressId: findByName(statuses, "In Progress").id,
    statusClosedId: findByName(statuses, "Closed").id,
    categoryAplikasiErrorId: findByName(categories, "Aplikasi error").id,
    categoryJaringanId: findByName(categories, "Jaringan").id,
    adminId: findByName(users, "Admin System").id,
    picId: findByName(users, "PIC Satu").id,
  };
}

export function setupTestDb() {
  process.env.DATABASE_URL = "file:./test.db";
  resetDb();
  execSync("npx prisma db push --skip-generate --accept-data-loss 2>&1", {
    env: { ...process.env, DATABASE_URL: "file:./test.db" },
    stdio: "pipe",
  });
  execSync("npx tsx prisma/seed.ts 2>&1", {
    env: { ...process.env, DATABASE_URL: "file:./test.db" },
    stdio: "pipe",
  });
}
