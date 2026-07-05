import { PrismaClient } from "../../../../generated/prisma/client.ts";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import Database from "better-sqlite3";

let prisma: PrismaClient;

function getDbUrl(): string {
  return process.env.DATABASE_URL?.replace(/^file:/, "") || "dev.db";
}

export function getDb(): PrismaClient {
  if (!prisma) {
    const dbPath = getDbUrl();
    const connection = new Database(dbPath);
    const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
    prisma = new PrismaClient({ adapter });
  }
  return prisma;
}

export function resetDb() {
  if (prisma) {
    prisma.$disconnect();
    prisma = undefined as unknown as PrismaClient;
  }
}
