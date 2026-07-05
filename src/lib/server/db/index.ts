import { PrismaClient } from "../../../../generated/prisma/client.ts";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import Database from "better-sqlite3";

let prisma: PrismaClient;

export function getDb(): PrismaClient {
  if (!prisma) {
    const connection = new Database("dev.db");
    const adapter = new PrismaBetterSqlite3({ url: "file:./dev.db" });
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
