# WhatsApp Tech Support

Sistem manajemen tiket support berbasis WhatsApp.

## Prasyarat

- **Node.js** >= 18
- **npm** >= 9
- **(Opsional)** [Ollama](https://ollama.ai) untuk klasifikasi AI

## Instalasi

```bash
# 1. Clone repositori
git clone <repo-url>
cd whatapp-techsupt

# 2. Install dependensi
npm install

# 3. Salin env dan isi konfigurasi
cp .env .env.local
# Edit .env.local sesuai kebutuhan (lihat tabel di bawah)

# 4. Generate Prisma client + migrasi database
npx prisma generate
npx prisma migrate dev

# 5. Seed master data
npm run seed
```

## Konfigurasi (.env)

| Variabel | Default | Keterangan |
|---|---|---|
| `DATABASE_URL` | `file:./dev.db` | Path database SQLite |
| `OLLAMA_URL` | `http://localhost:11434` | Endpoint Ollama (AI classifier) |
| `OLLAMA_MODEL` | `llama3.2` | Model Ollama |
| `WHATSAPP_SOURCE_NAME` | `Grup Support IT` | Nama source WhatsApp dari seed |

## Menjalankan

### Dev server

```bash
npm run dev
# Buka http://localhost:5173
```

### WhatsApp worker (terminal terpisah)

```bash
npm run worker
# Scan QR code untuk menghubungkan WhatsApp
```

### Testing

```bash
npm run test        # sekali
npm run test:watch  # mode watch
```

### Type-check

```bash
npm run check
```

### Production build

```bash
npm run build
npm run preview
```

## Struktur Proyek

```
src/
  lib/server/db/           — PrismaClient singleton
  lib/server/whatsapp/     — WhatsAppReader interface + WebJS adapter
  lib/server/classifier/   — Hybrid classifier (rules → Ollama)
  lib/server/ticket/       — Ticket CRUD
  lib/server/recap/        — Report generator
  lib/components/          — UI components (Svelte 5)
  routes/                  — Halaman + API endpoints
prisma/
  schema.prisma            — 11 tabel
  seed.ts                  — Master data (priorities, statuses, dll)
worker/index.ts            — WhatsApp listener process
```

## Catatan

- Database SQLite (dev) bisa diganti ke PostgreSQL via `@prisma/adapter-libsql`
- WhatsApp worker berjalan terpisah, tidak di SvelteKit
- Klasifikasi: rule-based dulu, fallback ke Ollama jika confidence < 0.7
- Semua jam tersimpan di UTC, ditampilkan di `Asia/Jakarta`
