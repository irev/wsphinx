import { PrismaClient } from "../generated/prisma/client.ts";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const dbUrl = process.env.DATABASE_URL || "file:./dev.db";
const adapter = new PrismaBetterSqlite3({ url: dbUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
  const messages = await prisma.whatsAppMessage.findMany({
    select: { fromPhone: true, chatId: true, fromName: true, timestamp: true },
    orderBy: { timestamp: "desc" },
  });

  const grouped = new Map<string, { chatId: string | null; fromName: string | null; lastInboundAt: Date }>();
  for (const m of messages) {
    const key = m.fromPhone;
    if (!grouped.has(key)) {
      grouped.set(key, { chatId: m.chatId, fromName: m.fromName, lastInboundAt: m.timestamp });
    }
  }

  let created = 0;
  let updated = 0;

  for (const [phone, info] of grouped) {
    await prisma.whatsAppContactPolicy.upsert({
      where: { phone },
      update: {
        chatId: info.chatId || undefined,
        displayName: info.fromName || undefined,
        hasInboundHistory: true,
        isOptedIn: true,
        lastInboundAt: info.lastInboundAt,
      },
      create: {
        phone,
        chatId: info.chatId || undefined,
        displayName: info.fromName || undefined,
        hasInboundHistory: true,
        isOptedIn: true,
        lastInboundAt: info.lastInboundAt,
      },
    });
    created++;
  }

  const sources = await prisma.whatsAppSource.findMany({ select: { id: true, phone: true, name: true } });
  for (const s of sources) {
    if (!s.phone) continue;
    const existing = await prisma.whatsAppContactPolicy.findUnique({ where: { phone: s.phone } });
    if (!existing) {
      await prisma.whatsAppContactPolicy.create({
        data: {
          phone: s.phone,
          displayName: s.name,
          hasInboundHistory: true,
          isOptedIn: true,
        },
      });
      created++;
    }
  }

  console.log(`Backfill selesai: ${created} created, ${updated} updated`);
}

main()
  .catch((e) => { console.error("Backfill gagal:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
