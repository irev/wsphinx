import { PrismaClient } from "../generated/prisma/client.ts";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({ url: "file:./dev.db" });
const prisma = new PrismaClient({ adapter });

async function main() {
  const priorities = await Promise.all([
    prisma.supportPriority.upsert({ where: { level: 1 }, update: {}, create: { name: "Critical", level: 1, color: "#dc2626", description: "Layanan utama berhenti total" } }),
    prisma.supportPriority.upsert({ where: { level: 2 }, update: {}, create: { name: "High", level: 2, color: "#ea580c", description: "Banyak user terdampak / proses bisnis terganggu" } }),
    prisma.supportPriority.upsert({ where: { level: 3 }, update: {}, create: { name: "Medium", level: 3, color: "#ca8a04", description: "Sebagian fungsi terganggu, ada workaround" } }),
    prisma.supportPriority.upsert({ where: { level: 4 }, update: {}, create: { name: "Low", level: 4, color: "#6b7280", description: "Pertanyaan, minor issue, non-urgent" } }),
  ]);

  const statuses = await Promise.all([
    prisma.supportStatus.upsert({ where: { name: "New" }, update: {}, create: { name: "New", sortOrder: 1, color: "#3b82f6" } }),
    prisma.supportStatus.upsert({ where: { name: "Open" }, update: {}, create: { name: "Open", sortOrder: 2, color: "#f59e0b" } }),
    prisma.supportStatus.upsert({ where: { name: "In Progress" }, update: {}, create: { name: "In Progress", sortOrder: 3, color: "#8b5cf6" } }),
    prisma.supportStatus.upsert({ where: { name: "Waiting User" }, update: {}, create: { name: "Waiting User", sortOrder: 4, color: "#ec4899" } }),
    prisma.supportStatus.upsert({ where: { name: "Waiting Vendor" }, update: {}, create: { name: "Waiting Vendor", sortOrder: 5, color: "#f97316" } }),
    prisma.supportStatus.upsert({ where: { name: "Resolved" }, update: {}, create: { name: "Resolved", sortOrder: 6, isClosed: true, color: "#22c55e" } }),
    prisma.supportStatus.upsert({ where: { name: "Closed" }, update: {}, create: { name: "Closed", sortOrder: 7, isClosed: true, color: "#6b7280" } }),
    prisma.supportStatus.upsert({ where: { name: "Rejected/Invalid" }, update: {}, create: { name: "Rejected/Invalid", sortOrder: 8, isClosed: true, color: "#ef4444" } }),
  ]);

  const categories = await Promise.all([
    prisma.supportCategory.upsert({ where: { name: "Aplikasi error" }, update: {}, create: { name: "Aplikasi error", sortOrder: 1, description: "Error pada aplikasi" } }),
    prisma.supportCategory.upsert({ where: { name: "Login/akses" }, update: {}, create: { name: "Login/akses", sortOrder: 2, description: "Masalah login atau akses" } }),
    prisma.supportCategory.upsert({ where: { name: "Jaringan" }, update: {}, create: { name: "Jaringan", sortOrder: 3, description: "Masalah jaringan/koneksi" } }),
    prisma.supportCategory.upsert({ where: { name: "Server" }, update: {}, create: { name: "Server", sortOrder: 4, description: "Masalah server" } }),
    prisma.supportCategory.upsert({ where: { name: "Database" }, update: {}, create: { name: "Database", sortOrder: 5, description: "Masalah database" } }),
    prisma.supportCategory.upsert({ where: { name: "Integrasi API" }, update: {}, create: { name: "Integrasi API", sortOrder: 6, description: "Masalah integrasi API" } }),
    prisma.supportCategory.upsert({ where: { name: "Printer/perangkat" }, update: {}, create: { name: "Printer/perangkat", sortOrder: 7, description: "Masalah printer/perangkat" } }),
    prisma.supportCategory.upsert({ where: { name: "Request data" }, update: {}, create: { name: "Request data", sortOrder: 8, description: "Permintaan data" } }),
    prisma.supportCategory.upsert({ where: { name: "Request perubahan fitur" }, update: {}, create: { name: "Request perubahan fitur", sortOrder: 9, description: "Permintaan perubahan fitur" } }),
    prisma.supportCategory.upsert({ where: { name: "Lainnya" }, update: {}, create: { name: "Lainnya", sortOrder: 10, description: "Kategori lainnya" } }),
  ]);

  const pics = await Promise.all([
    prisma.user.upsert({ where: { phone: "6281111111111" }, update: {}, create: { name: "PIC Satu", phone: "6281111111111", role: "pic", email: "pic.satu@company.com" } }),
    prisma.user.upsert({ where: { phone: "6281111111111" }, update: {}, create: { name: "PIC Dua", phone: "6281111111111", role: "pic", email: "pic.dua@company.com" } }),
    prisma.user.upsert({ where: { phone: "6281111111111" }, update: {}, create: { name: "Admin System", phone: "6281111111111", role: "admin", email: "admin@company.com" } }),
  ]);

  let source = await prisma.whatsAppSource.findFirst();
  if (!source) {
    source = await prisma.whatsAppSource.create({
      data: {
        name: "Grup Support IT",
        type: "group",
        phone: "6281111111111",
        description: "Grup WhatsApp utama untuk laporan technical support",
      },
    });
  }

  console.log("Seed completed (idempotent)");
  console.log(`  ${priorities.length} priorities`);
  console.log(`  ${statuses.length} statuses`);
  console.log(`  ${categories.length} categories`);
  console.log(`  ${pics.length} users (PICs + admin)`);
  console.log(`  1 WhatsApp source`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
