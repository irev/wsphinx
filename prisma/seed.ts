import { PrismaClient } from "../generated/prisma/client.ts";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";

const dbUrl = process.env.DATABASE_URL || "file:./dev.db";
const adapter = new PrismaBetterSqlite3({ url: dbUrl });
const prisma = new PrismaClient({ adapter });

const PASSWORD_HASH = bcrypt.hashSync("admin123", 10);

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
    prisma.user.upsert({ where: { phone: "6281111111111" }, update: { name: "PIC Satu", role: "pic", email: "pic.satu@company.com", passwordHash: PASSWORD_HASH }, create: { name: "PIC Satu", phone: "6281111111111", role: "pic", email: "pic.satu@company.com", passwordHash: PASSWORD_HASH } }),
    prisma.user.upsert({ where: { phone: "6281111111112" }, update: { name: "PIC Dua", role: "pic", email: "pic.dua@company.com", passwordHash: PASSWORD_HASH }, create: { name: "PIC Dua", phone: "6281111111112", role: "pic", email: "pic.dua@company.com", passwordHash: PASSWORD_HASH } }),
    prisma.user.upsert({ where: { phone: "6281111111113" }, update: { name: "Admin System", role: "admin", email: "admin@company.com", passwordHash: PASSWORD_HASH }, create: { name: "Admin System", phone: "6281111111113", role: "admin", email: "admin@company.com", passwordHash: PASSWORD_HASH } }),
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

  const defaultSettings = await Promise.all([
    prisma.appSetting.upsert({ where: { key: "wa_auto_reply_enabled" }, update: {}, create: { key: "wa_auto_reply_enabled", value: "true" } }),
    prisma.appSetting.upsert({ where: { key: "wa_auto_reply_template" }, update: {}, create: { key: "wa_auto_reply_template", value: "Halo {name}, laporan Anda tentang {summary} sudah kami terima. Tim support akan segera menindaklanjuti. Terima kasih." } }),
    prisma.appSetting.upsert({ where: { key: "wa_classification_enabled" }, update: {}, create: { key: "wa_classification_enabled", value: "true" } }),
    prisma.appSetting.upsert({ where: { key: "wa_auto_ticket_enabled" }, update: {}, create: { key: "wa_auto_ticket_enabled", value: "true" } }),
    prisma.appSetting.upsert({ where: { key: "wa_auto_reply_global" }, update: {}, create: { key: "wa_auto_reply_global", value: "true" } }),
    prisma.appSetting.upsert({ where: { key: "wa_ignore_keywords" }, update: {}, create: { key: "wa_ignore_keywords", value: "spam,promo,info,testing" } }),
    prisma.appSetting.upsert({ where: { key: "wa_business_hours" }, update: {}, create: { key: "wa_business_hours", value: '{"monday":{"start":"08:00","end":"17:00"},"tuesday":{"start":"08:00","end":"17:00"},"wednesday":{"start":"08:00","end":"17:00"},"thursday":{"start":"08:00","end":"17:00"},"friday":{"start":"08:00","end":"17:00"},"saturday":{"start":"08:00","end":"12:00"}}' } }),
    prisma.appSetting.upsert({ where: { key: "wa_session_persistence" }, update: {}, create: { key: "wa_session_persistence", value: "true" } }),
    prisma.appSetting.upsert({ where: { key: "wa_worker_url" }, update: {}, create: { key: "wa_worker_url", value: process.env.WORKER_API_URL || "http://127.0.0.1:9494" } }),
    prisma.appSetting.upsert({ where: { key: "wa_worker_auto_restart" }, update: {}, create: { key: "wa_worker_auto_restart", value: "true" } }),
    prisma.appSetting.upsert({ where: { key: "wa_worker_max_reconnect" }, update: {}, create: { key: "wa_worker_max_reconnect", value: "10" } }),
    prisma.appSetting.upsert({ where: { key: "wa_worker_qr_interval" }, update: {}, create: { key: "wa_worker_qr_interval", value: "15" } }),
    prisma.appSetting.upsert({ where: { key: "wa_llm_consent" }, update: {}, create: { key: "wa_llm_consent", value: "true" } }),
    prisma.appSetting.upsert({ where: { key: "wa_max_messages_per_hour" }, update: {}, create: { key: "wa_max_messages_per_hour", value: "20" } }),
    prisma.appSetting.upsert({ where: { key: "wa_min_gap_per_number_seconds" }, update: {}, create: { key: "wa_min_gap_per_number_seconds", value: "120" } }),
    prisma.appSetting.upsert({ where: { key: "wa_max_consecutive_failures" }, update: {}, create: { key: "wa_max_consecutive_failures", value: "5" } }),
    prisma.appSetting.upsert({ where: { key: "wa_stop_keywords" }, update: {}, create: { key: "wa_stop_keywords", value: "STOP,BERHENTI,UNSUBSCRIBE,STOP ALL,CANCEL,HENTIKAN" } }),
    prisma.appSetting.upsert({ where: { key: "wa_auto_reply_max_per_chat_per_day" }, update: {}, create: { key: "wa_auto_reply_max_per_chat_per_day", value: "3" } }),
    prisma.appSetting.upsert({ where: { key: "wa_auto_reply_cooldown_minutes" }, update: {}, create: { key: "wa_auto_reply_cooldown_minutes", value: "5" } }),
    prisma.appSetting.upsert({ where: { key: "wa_after_hours_template" }, update: {}, create: { key: "wa_after_hours_template", value: "Halo {name}, terima kasih atas laporannya. Saat ini di luar jam operasional support (Senin-Jumat 08:00-17:00, Sabtu 08:00-12:00). Tim support akan menindaklanjuti laporan Anda pada jam kerja berikutnya. Terima kasih." } }),
  ]);

  if (source?.phone) {
    await prisma.whatsAppContactPolicy.upsert({
      where: { phone: source.phone },
      update: { displayName: source.name, hasInboundHistory: true, isOptedIn: true },
      create: { phone: source.phone, displayName: source.name, hasInboundHistory: true, isOptedIn: true },
    });
  }
  for (const u of pics) {
    await prisma.whatsAppContactPolicy.upsert({
      where: { phone: u.phone },
      update: { displayName: u.name, hasInboundHistory: true, isOptedIn: true },
      create: { phone: u.phone, displayName: u.name, hasInboundHistory: true, isOptedIn: true },
    });
  }

  console.log("Seed completed (idempotent)");
  console.log(`  ${priorities.length} priorities`);
  console.log(`  ${statuses.length} statuses`);
  console.log(`  ${categories.length} categories`);
  console.log(`  ${pics.length} users (PICs + admin)`);
  console.log(`  1 WhatsApp source`);
  console.log(`  ${defaultSettings.length} app settings`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
