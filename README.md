# WhatsApp Tech Support

Sistem manajemen tiket support berbasis WhatsApp.

## Prasyarat

- **Node.js** >= 18
- **npm** >= 9
- **(Opsional)** [Ollama](https://ollama.ai) untuk klasifikasi AI

---

## Instalasi & Menjalankan

### Metode 1: Standard (Node.js langsung)

```bash
# 1. Clone repositori
git clone <repo-url>
cd whatapp-techsupt

# 2. Install dependensi
npm install

# 3. Salin env
cp .env .env.local
# Edit .env.local, isi WHATSAPP_PHONE dan JWT_SECRET

# 4. Generate Prisma client + migrasi database
npx prisma generate
npx prisma migrate dev

# 5. Seed master data
npm run seed
```

**Jalankan (2 terminal terpisah):**

Terminal 1 — SvelteKit (port **9393**):
```bash
npm run dev
```

Terminal 2 — WhatsApp Worker (port **9494**):
```bash
npm run worker
# Scan QR code untuk menghubungkan WhatsApp
```

**Production build:**
```bash
npm run build
PORT=9696 node build/index.js
```

---

### Metode 2: Docker

Prasyarat: [Docker](https://docker.com) + [Docker Compose](https://docs.docker.com/compose/)

```bash
# 1. Clone
git clone <repo-url>
cd whatapp-techsupt

# 2. Salin env
cp .env.example .env
# Edit .env, isi WHATSAPP_PHONE dan JWT_SECRET

# 3. Build & jalankan semua service
docker compose up --build -d
```

**Service yang berjalan:**

| Service | Port | Fungsi |
|---------|------|--------|
| `app` | `9696` | SvelteKit production server |
| `worker` | `9494` | WhatsApp listener + API |
| `ollama` | `11434` | AI classifier (LLM) |

**Logs:**
```bash
docker compose logs -f app
docker compose logs -f worker
```

**Berhenti:**
```bash
docker compose down
```

**Hapus data (reset):**
```bash
docker compose down -v
```

---

### Metode 3: PM2 (Process Manager)

Prasyarat: PM2 terinstall global

```bash
# 1. Install PM2
npm install -g pm2

# 2. Clone & install
git clone <repo-url>
cd whatapp-techsupt
npm install

# 3. Setup env
cp .env.example .env
# Edit .env

# 4. Generate + seed
npx prisma generate
npx prisma migrate dev
npm run seed

# 5. Build
npm run build

# 6. Jalankan (app + worker)
pm2 start ecosystem.config.json

# 7. Simpan konfigurasi agar auto-start saat reboot
pm2 save
pm2 startup
```

**Perintah PM2:**
```bash
pm2 status                    # Lihat status
pm2 logs whatapp-app          # Log aplikasi
pm2 logs whatapp-worker       # Log worker
pm2 restart all               # Restart semua
pm2 stop all                  # Stop semua
pm2 delete all                # Hapus dari daftar
```

---

## Konfigurasi (.env)

| Variabel | Default | Keterangan |
|---|---|---|
| `DATABASE_URL` | `file:./dev.db` | Path database SQLite |
| `VITE_PORT` | `9393` | Port dev server |
| `VITE_PREVIEW_PORT` | `9595` | Port preview server |
| `PORT` | `9696` | Port production server |
| `WORKER_API_PORT` | `9494` | Port worker API |
| `WORKER_API_URL` | `http://127.0.0.1:9494` | URL worker API |
| `OLLAMA_URL` | `http://localhost:11434` | Endpoint Ollama (AI classifier) |
| `OLLAMA_MODEL` | `llama3.2` | Model Ollama |
| `WHATSAPP_SOURCE_NAME` | `Grup Support IT` | Nama source WhatsApp dari seed |
| `WHATSAPP_PHONE` | (wajib diisi) | Nomor telepon untuk source seed |
| `JWT_SECRET` | (wajib diisi) | Secret key untuk JWT session |
| `WA_SESSION_PATH` | `.session-data` | Path penyimpanan sesi WhatsApp |

## Port yang digunakan

| Port | Service | Config |
|------|---------|--------|
| `9393` | Dev server (Vite) | `VITE_PORT` |
| `9494` | Worker API | `WORKER_API_PORT` |
| `9595` | Preview server | `VITE_PREVIEW_PORT` |
| `9696` | Production | `PORT` |
| `11434` | Ollama (third-party) | `OLLAMA_URL` |

> Sebelum menjalankan, sistem otomatis mengecek ketersediaan port via `scripts/check-ports.ts`. Jika ada port yang bentrok, aplikasi tidak akan start dan menampilkan port mana yang conflict.

## Perintah CLI

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Start dev server (port 9393) |
| `npm run build` | Production build |
| `npm run preview` | Preview build (port 9595) |
| `npm run seed` | Seed master data (sekali) |
| `npm run worker` | Start WhatsApp worker (port 9494) |
| `npm run check` | Type-check |
| `npm run test` | Unit + integration tests |
| `npm run test:watch` | Tests in watch mode |

## Struktur Proyek

```
src/
  lib/server/db/           — PrismaClient singleton
  lib/server/whatsapp/     — WhatsAppReader interface + WebJS adapter
  lib/server/classifier/   — Hybrid classifier (rules → Ollama)
  lib/server/ticket/       — Ticket CRUD
  lib/server/recap/        — Report generator
  lib/server/ports.ts      — Central port config + port checker
  lib/components/          — UI components (Svelte 5)
  routes/                  — Halaman + API endpoints
prisma/
  schema.prisma            — 11 tabel
  seed.ts                  — Master data
worker/index.ts            — WhatsApp listener process
scripts/check-ports.ts     — Port precheck utility
Dockerfile                 — Docker multi-stage build
docker-compose.yml         — Docker Compose (app + worker + ollama)
ecosystem.config.json      — PM2 config
```

## Catatan

- Database SQLite (dev) bisa diganti ke PostgreSQL via `@prisma/adapter-libsql`
- WhatsApp worker berjalan terpisah, tidak di SvelteKit
- Klasifikasi: rule-based dulu, fallback ke Ollama jika confidence < 0.7
- Semua jam tersimpan di UTC, ditampilkan di `Asia/Jakarta`
- Port aplikasi menggunakan range 9000+ untuk menghindari bentrok dengan aplikasi lain
