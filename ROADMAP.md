# Roadmap Implementasi — WhatsApp Tech Support

> Dokumen ini berisi rencana implementasi fitur baru, hasil audit keamanan, area yang terdampak, dan rekomendasi perbaikan lanjutan.
> 
> **Status**: 🟡 Perencanaan — belum ada implementasi dimulai.
> 
> **Dibuat**: 2026-07-05

---

## Daftar Isi

1. [Ringkasan Temuan Audit Keamanan](#1-ringkasan-temuan-audit-keamanan)
2. [Area Terdampak Perubahan](#2-area-terdampak-perubahan)
3. [Rencana Implementasi 5 Fase](#3-rencana-implementasi-5-fase)
4. [Perbaikan Audit & Logging](#4-perbaikan-audit--logging)
5. [Matriks Dampak Data Sensitif](#5-matriks-dampak-data-sensitif)

---

## 1. Ringkasan Temuan Audit Keamanan

### 🔴 Critical (5)

| ID | Temuan | File | Dampak |
|----|--------|------|--------|
| C-01 | **Tidak ada autentikasi** — semua endpoint publik, siapa pun bisa akses API | Seluruh route `src/routes/api/*` | Data PII, tiket, settings, WA exposure |
| C-02 | **Phone number hardcoded** sebagai fallback | `worker/index.ts` | Ekspos PII jika env `WHATSAPP_PHONE` tidak diset |
| C-03 | **QR code (session token)** ditulis ke `.whatsapp-status.json` dalam plaintext + diekspos via 2 API tanpa auth | `worker/index.ts:16-20`, `/api/whatsapp/qr-image`, `/api/whatsapp/status` | Sesi WA bisa dicuri |
| C-04 | **Phone number & body pesan dikirim ke Ollama** tanpa masking/konsen | `classifier/ollama.ts`, `routes/api/messages/classify/*`, `routes/api/chat/analyze/*` | PII bocor ke LLM eksternal |
| C-05 | **No hooks.server.ts** — tidak ada global middleware (CSP, rate limit, CORS, auth guard) | Root project | Semua serangan web tidak terfilter |

### 🟠 High (5)

| ID | Temuan | File | Dampak |
|----|--------|------|--------|
| H-01 | API return phone number mentah (tidak dimasking di response JSON) | Semua endpoint messages/tickets | Ekspos PII via network |
| H-02 | Hard delete endpoint untuk entity yang punya `active` field — contradict AGENTS.md soft delete rule | 5 files `src/routes/api/settings/*/[id]/+server.ts` | Data hilang permanen |
| H-03 | Audit log tanpa `userId` — karena tidak ada session user | Semua audit write | Tidak bisa trace siapa |
| H-04 | Tidak ada env example file — env vars tidak terdokumentasi | Missing `.env.example` | Risiko misconfig |
| H-05 | Export/import settings tanpa auth — semua data bisa didownload siapa pun | `src/routes/api/settings/export/*`, `import/*` | Data master bocor |

### 🟡 Medium (4)

| ID | Temuan | File | Dampak |
|----|--------|------|--------|
| M-01 | `App.Locals` dikomentari — tidak ada mekanisme attach user ke request | `src/app.d.ts` | Tidak bisa auth |
| M-02 | Role field (admin/pic/user) tidak pernah dicek di route manapun | Seluruh codebase | Tidak ada RBAC |
| M-03 | Tidak ada rate limiting — API bisa di-DOS | Seluruh codebase | Abuse/brute-force |
| M-04 | Sanitasi input (`sanitize.ts`) ada tapi tidak dipakai di route handler | `src/lib/utils/sanitize.ts` vs semua route | XSS risk |

---

## 2. Area Terdampak Perubahan

Setiap perubahan di roadmap ini akan mempengaruhi area berikut. Daftar ini jadi acuan untuk regression testing dan update dokumentasi.

### 2.1 Database & Schema

| Tabel | Perubahan | Dampak Fase |
|-------|-----------|-------------|
| `User` | + `passwordHash String` | Fase 1 |
| `AppSetting` | + key baru: `wa_worker_url`, `wa_worker_auto_restart`, `wa_worker_max_reconnect`, `wa_worker_qr_interval` | Fase 3 |
| `AuditLog` | `userId` wajib diisi (setelah auth aktif) | Fase 1 |
| `AuditLog` | + `ipAddress`, `userAgent` | Fase 1 |

### 2.2 API Routes

| Route | Perubahan | Dampak |
|-------|-----------|--------|
| Semua `src/routes/api/*` | + Auth guard di `hooks.server.ts` | Fase 1 |
| Semua `src/routes/api/settings/*` | + Admin-only check | Fase 1 |
| `POST /api/whatsapp/send` | + Rate limit 5/menit | Fase 4 |
| `POST /api/messages/import` | + Admin-only | Fase 1 |
| New: `GET /api/whatsapp/worker` | Worker info | Fase 2 |
| New: `POST /api/whatsapp/worker/start` | Start worker | Fase 2 |
| New: `POST /api/whatsapp/worker/stop` | Stop worker | Fase 2 |
| New: `GET /api/whatsapp/stats` | Message stats | Fase 4 |

### 2.3 Frontend Pages

| Route/Halaman | Perubahan | Dampak |
|---------------|-----------|--------|
| `/settings` → Connection | + Worker toggle, info, settings | Fase 2-3 |
| `/settings` → Connection | + Stats card | Fase 4 |
| `/login` (new) | Login page | Fase 1 |
| Semua halaman | + Conditional render based on role | Fase 1 |

### 2.4 Worker Process

| File | Perubahan | Dampak |
|------|-----------|--------|
| `worker/index.ts` | Hapus hardcoded phone fallback | Fase 1 (quick win) |
| `worker/index.ts` | + Graceful shutdown via SIGTERM | Fase 2 |
| `worker/index.ts` | + Log level config | Fase 3 |
| `worker/index.ts` | + Health endpoint tambahan (memory, version) | Fase 2 |

### 2.5 Stores & Shared State

| File | Perubahan | Dampak |
|------|-----------|--------|
| New: `$lib/stores/auth.svelte.ts` | Auth state management | Fase 1 |
| `$lib/stores/wa-status.svelte.ts` | + Worker running state | Fase 2 |
| `$lib/stores/wa-profile.svelte.ts` | + Connection quality data | Fase 4 |

### 2.6 AGENTS.md

Update diperlukan:
- Tambah env vars: `WHATSAPP_PHONE`, `WORKER_API_URL`
- Update command: tambah `npm run worker:start` / `npm run worker:stop` jika ada
- Update security rules: tambah masking di API layer
- Update data rules: userId wajib di audit log

### 2.7 CHANGELOG.md

Update setiap fase dengan kategori:
- `Added` — fitur baru
- `Changed` — perubahan API/UI
- `Security` — perbaikan keamanan
- `Deprecated` — endpoint lama yang diganti

---

## 3. Rencana Implementasi 5 Fase

### 🟢 Fase 1: Auth & Security Foundation (Prioritas Tertinggi)

**Tujuan**: Membangun fondasi keamanan. Semua fitur baru HARUS menunggu fase ini.

**Estimasi**: ~3-5 hari kerja

#### 3.1.1 Database — User Schema

```prisma
model User {
  id           String   @id @default(cuid())
  name         String
  phone        String   @unique
  email        String?
  passwordHash String?  // ← NEW: bcrypt hash, nullable for existing users
  role         String   @default("user") // admin, pic, user
  active       Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  // ... existing relations
}
```

**Affected**: Schema migration, seed update (set passwordHash untuk 3 user awal).

#### 3.1.2 Auth System

**New files**:

| File | Purpose |
|------|---------|
| `src/lib/server/auth/session.ts` | JWT sign/verify, cookie management |
| `src/routes/api/auth/login/+server.ts` | POST login → return JWT cookie |
| `src/routes/api/auth/me/+server.ts` | GET current user info |
| `src/routes/api/auth/logout/+server.ts` | POST logout → clear cookie |
| `src/routes/login/+page.svelte` | Login page UI |
| `src/lib/stores/auth.svelte.ts` | Auth state store (auto-poll `/api/auth/me`) |
| `src/hooks.server.ts` | Global auth guard, CSP, security headers |
| `src/params/auth.ts` | Route guard helpers |

**Security headers** di `hooks.server.ts`:
```typescript
// Minimal CSP
"content-security-policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;"
"x-frame-options": "DENY"
"x-content-type-options": "nosniff"
"strict-transport-security": "max-age=31536000; includeSubDomains"
```

**Auth flow**:
```
Login → POST /api/auth/login → verify phone+password → issue JWT (httpOnly cookie) → 
hooks.server.ts validate cookie → attach user ke event.locals → 
route handler check event.locals.user
```

**Role access matrix**:

| Endpoint Group | admin | pic | user | public |
|----------------|-------|-----|------|--------|
| `/api/auth/*` | ✓ | ✓ | ✓ | ✓ (login) |
| `/api/tickets/*` | ✓ | ✓ | ✓ (read) | ✗ |
| `/api/messages/*` | ✓ | ✓ | ✓ | ✗ |
| `/api/settings/*` | ✓ | ✗ | ✗ | ✗ |
| `/api/whatsapp/send` | ✓ | ✓ | ✗ | ✗ |
| `/api/whatsapp/*` (status/me) | ✓ | ✓ | ✓ | ✗ |
| `/api/whatsapp/worker/*` | ✓ | ✗ | ✗ | ✗ |
| `/api/reports/*` | ✓ | ✓ | ✓ (read) | ✗ |
| `/api/audit/*` | ✓ | ✓ | ✗ | ✗ |
| `/api/chat/analyze` | ✓ | ✓ | ✗ | ✗ |
| `/api/settings/export` | ✓ | ✗ | ✗ | ✗ |
| `/api/settings/import` | ✓ | ✗ | ✗ | ✗ |

**Affected audit areas**:
- Semua audit log sekarang wajib isi `userId` dari `event.locals.user.id`
- Frontend conditional render: tombol Settings hanya untuk admin, tombol Buat Tiket untuk admin/pic

#### 3.1.3 Quick Win Security Fixes (dikerjakan paralel)

| Task | Detail | File |
|------|--------|------|
| Hapus hardcoded phone | Ganti fallback nomor dengan `""` + error log | `worker/index.ts` |
| Soft delete → semua entity | Ubah `delete()` jadi `update({ active: false })` di settings endpoints | 5 files `settings/*/[id]/+server.ts` |
| Mask phone di API | Buat helper `maskInApi()` untuk response JSON | `src/lib/utils/mask.ts` baru |
| `.env.example` | Buat dari template env vars | New file |
| Sanitasi input di semua POST/PUT | Apply `sanitize()` | Semua route handler |
| QR code cleanup | Hapus QR dari memory setelah 30 detik jika tidak ter-scan | `worker/index.ts` |

---

### 🟡 Fase 2: Worker Management (Start/Stop + Info)

**Tujuan**: Kontrol worker dari UI tanpa perlu terminal terpisah.

**Estimasi**: ~2-3 hari kerja

**PRASYARAT**: Fase 1 selesai (auth aktif, hanya admin yang bisa akses worker management).

#### 3.2.1 Worker Manager (Server-side)

**New file**: `src/lib/server/worker-manager.ts`

```typescript
// Singleton manager untuk worker child process
class WorkerManager {
  private process: ChildProcess | null = null;
  private startTime: number = 0;

  // Spawn: node worker/index.js
  async start(): Promise<{ ok: boolean; pid: number }>;
  
  // Kill: SIGTERM → SIGKILL (5s grace period)
  async stop(): Promise<{ ok: boolean }>;
  
  // Status: running, pid, uptime, memoryUsage
  getInfo(): { running: boolean; pid: number | null; uptime: number; ... };
  
  // Auto-restart: jika process exit tidak terduga
  private onExit(code: number, signal: string): void;
}
```

**Important notes**:
- Worker start menggunakan `process.env` yang sama dengan SvelteKit server (inherit)
- Stderr worker di-pipe ke SvelteKit logger
- Auto-restart hanya jika `wa_worker_auto_restart = true` dan exit code ≠ 0
- Guard: `start()` throw error jika worker sudah running
- Guard: `stop()` throw error jika worker tidak running

#### 3.2.2 API Endpoints (New)

| Route | Method | Deskripsi | Auth |
|-------|--------|-----------|------|
| `/api/whatsapp/worker` | GET | Worker status (running, PID, uptime, memory, version) | admin |
| `/api/whatsapp/worker/start` | POST | Start worker process | admin |
| `/api/whatsapp/worker/stop` | POST | Stop worker process | admin |

**Response format**:

```json
GET /api/whatsapp/worker
{
  "running": true,
  "pid": 12345,
  "uptime": 3600000,
  "memoryMB": 128.5,
  "nodeVersion": "v20.11.0",
  "platform": "win32"
}
```

#### 3.2.3 New Worker API Endpoint (Internal)

Tambahkan di `worker/index.ts` HTTP server:

| Route | Method | Deskripsi |
|-------|--------|-----------|
| `/api/health` (enhance) | GET | + `platform`, `nodeVersion`, `memoryUsage` |

#### 3.2.4 Frontend — Connection Tab Enhancement

**Area perubahan**: `src/routes/settings/+page.svelte` — seksi `wa-connection`

**New UI components**:
- **Worker Status Card** — menampilkan status worker (running/stopped), PID, uptime
- **Start/Stop Buttons** — toggle dengan loading state
- **Worker Info Section** — node version, platform, memory usage

**Layout perubahan** (di dalam card "WhatsApp Connection"):

```
┌─────────────────────────────────────┐
│ WhatsApp Connection                  │
│                                      │
│ ┌── Status ──────────────────────┐  │
│ │ ● Connected — Terhubung        │  │
│ │ QR Code (if scanning)          │  │
│ └────────────────────────────────┘  │
│                                      │
│ ┌── Worker ──────────────────────┐  │
│ │ Status: ● Running (PID: 12345) │  │
│ │ Uptime: 2h 15m                 │  │
│ │ Memory: 128 MB                 │  │
│ │ Node: v20.11.0 · win32        │  │
│ │ [■ Stop Worker]               │  │
│ └────────────────────────────────┘  │
│                                      │
│ ┌── Connection Info ─────────────┐  │
│ │ Status | Last Health | Latency  │  │
│ │ Reconnect | Uptime             │  │
│ └────────────────────────────────┘  │
│                                      │
│ ┌── Session ─────────────────────┐  │
│ │ Persistence toggle | Session    │  │
│ │ info | Clear                    │  │
│ └────────────────────────────────┘  │
│                                      │
│ ┌── Action Buttons ──────────────┐  │
│ │ [Health Check] [Reconnect]     │  │
│ │ [Disconnect] [Logout]          │  │
│ └────────────────────────────────┘  │
└─────────────────────────────────────┘
```

#### 3.2.5 Affected Audit Areas

- `hooks.server.ts` sekarang inject `user` ke `event.locals`
- `auditLog.create()` di semua tempat harus isi `userId: event.locals.user.id`
- Worker start/stop perlu audit log baru:
  - `action: "worker.start"`, `entity: "worker"`
  - `action: "worker.stop"`, `entity: "worker"`

---

### 🟡 Fase 3: Worker Settings

**Tujuan**: Konfigurasi worker dari UI tanpa edit env file.

**Estimasi**: ~1-2 hari kerja

**PRASYARAT**: Fase 1 + 2 selesai.

#### 3.3.1 New AppSettings Keys

Tambah di `prisma/seed.ts` dan `src/routes/api/settings/app/+server.ts`:

| Key | Default | Deskripsi |
|-----|---------|-----------|
| `wa_worker_url` | `http://127.0.0.1:3457` | Worker API URL (bisa diganti untuk multi-worker/port) |
| `wa_worker_auto_restart` | `true` | Restart otomatis saat worker crash |
| `wa_worker_max_reconnect` | `10` | Maksimal percobaan reconnect WA |
| `wa_worker_qr_interval` | `15` | Interval refresh QR (detik) |

#### 3.3.2 Frontend — Worker Settings Panel

**New section** di dalam tab Connection (setelah Worker Status Card):

```
┌── Worker Settings ───────────────┐
│ Worker API URL                   │
│ [http://127.0.0.1:3457       ]  │
│                                  │
│ Auto Restart on Crash            │
│ [✓] Restart worker otomatis     │
│                                  │
│ Max Reconnect Attempts           │
│ [10] (1-50)                      │
│                                  │
│ QR Refresh Interval              │
│ [15] detik (5-60)                │
│                                  │
│ [Simpan Settings]                │
└──────────────────────────────────┘
```

#### 3.3.3 Validation Rules

| Setting | Validasi |
|---------|----------|
| `wa_worker_url` | Harus URL valid, hanya `http://127.0.0.1:*` atau `http://localhost:*` |
| `wa_worker_auto_restart` | Boolean |
| `wa_worker_max_reconnect` | Integer 1-50 |
| `wa_worker_qr_interval` | Integer 5-60 |

#### 3.3.4 Affected Area

- Worker membaca `wa_worker_url` untuk bind address (saat ini dari env `WORKER_API_URL`)
- Worker membaca `wa_worker_max_reconnect` untuk max reconnect attempts
- Worker membaca `wa_worker_qr_interval` untuk QR refresh timing
- Semua proxy API route saat ini hardcode `WORKER_URL` — perlu refactor baca dari AppSetting

---

### 🟢 Fase 4: Quick Wins — Stats & History

**Tujuan**: Fitur nilai tambah dengan risiko rendah, bisa berjalan tanpa auth penuh (tapi tetap lebih baik dengan auth).

**Estimasi**: ~1 hari kerja

**PRASYARAT**: Tidak ada (tapi auth tetap direkomendasikan).

#### 3.4.1 Message Stats API

**New**: `GET /api/whatsapp/stats`

```typescript
// Query DB aggregate
response = {
  today: {
    messages: number,       // COUNT whatsapp_messages WHERE createdAt >= today
    classified: number,      // COUNT WHERE isProcessed = true
    supportRelated: number,  // COUNT WHERE isSupportRelated = true
    ticketsCreated: number,  // COUNT support_tickets WHERE createdAt >= today
  },
  week: {
    messages: number,
    classified: number,
    ticketsCreated: number,
  },
  unprocessed: number,       // COUNT messages WHERE isProcessed = false
  avgConfidence: number | null, // AVG confidence WHERE isProcessed = true
}
```

**Security**: Data agregat, risiko rendah. Tetap perlu auth untuk akses.

#### 3.4.2 Connection History

Stored di `AppSetting` sebagai JSON log:

```typescript
// Key: "wa_connection_history"
// Value: JSON array of connection events
[
  { "time": "2026-07-05T08:00:00Z", "status": "connected", "latency": 120 },
  { "time": "2026-07-05T07:55:00Z", "status": "disconnected", "reason": "timeout" },
  ...
]
```

Atau bisa dibaca dari audit log dengan filter `action = "connection.*"`.

#### 3.4.3 Test Send Message

**Existing**: `POST /api/whatsapp/send` sudah ada.

**Enhancement**: Tambah form test di Connection tab:
- Input chat ID atau pilih dari daftar source
- Input text pesan
- Tombol Kirim dengan loading state
- Response toast sukses/gagal

**Rate limit**: Maks 5 pesan per menit per user (simpan di memory store).

#### 3.4.4 Frontend — Stats Card

```
┌── Today's Stats ────────────────┐
│ 📨 Messages: 47                 │
│ 🏷️ Classified: 32              │
│ 🎯 Support: 18                  │
│ 🎫 Tickets: 5                   │
│ ⏳ Unprocessed: 15              │
│ 📊 Avg Confidence: 0.82         │
└──────────────────────────────────┘
```

---

### 🔴 Fase 5: Advanced Features ✅ (Selesai)

**Tujuan**: Fitur lanjutan yang membutuhkan auth stabil + role management mature.

**Estimasi**: ~2-3 hari kerja

**PRASYARAT**: Fase 1-4 selesai dan stabil di production.

#### 3.5.1 Worker Live Logs ✅

**New endpoint**: `GET /api/whatsapp/worker/logs?lines=50&date=YYYY-MM-DD`

Worker logs di-capture ke file (bukan stdout saja):

```
worker/logs/2026-07-05.log
```

**Security concerns**:
- Log bisa berisi phone number, message body, QR code → harus di-sanitize sebelum ditampilkan
- Mask phone number di log lines ✅ (`src/lib/server/worker-manager.ts` — regex `/(\+?62|0?8)[0-9]{7,14}/g`)
- Filter out lines containing QR code content ✅
- Admin only ✅ (auth guard di endpoint)

**Frontend**: Terminal-style log viewer dengan date picker, refresh button, max 500 lines, collapsible di Connection tab.

#### 3.5.2 Connection Quality Dashboard ✅

**Store**: History 24 jam latency disimpan di `WorkerManager.latencyHistory[]`, direkam setiap health check via `GET /api/whatsapp/health`.

**Display**: Mini bar chart (CSS bars, no external library needed) dengan:
- Latency trend (last 60 data points) ✅
- Warna hijau (connected) / merah (error/unreachable)

#### 3.5.3 Notification on Worker Status Change ✅

Poll `/api/whatsapp/worker` tiap 30 detik di background (`setInterval` dalam `$effect`).

Jika worker crash → show desktop notification (`Notification API`) + toast.

---

## 4. Perbaikan Audit & Logging

### 4.1 Audit Log — Current Issues

| Issue | Detail | Fix |
|-------|--------|-----|
| `userId` null | Tidak ada auth context | Inject dari `event.locals.user.id` (Fase 1) |
| `ipAddress` missing | Tidak bisa trace sumber request | Tambah `ipAddress` field + `event.getClientAddress()` |
| `userAgent` missing | Tidak bisa deteksi akses anomali | Tambah `userAgent` field + `request.headers.get("user-agent")` |
| No retention policy | Audit log tumbuh terus tanpa batas | Tambah auto-purge >90 hari (configurable) |
| No aggregation | Tidak ada summary per entity | Cron job harian agregat ke table terpisah (opsional) |

### 4.2 New Audit Actions (Post-Implementation)

| Action | Entity | Fase | Trigger |
|--------|--------|------|---------|
| `worker.start` | worker | Fase 2 | Worker process started |
| `worker.stop` | worker | Fase 2 | Worker process stopped |
| `worker.crash` | worker | Fase 2 | Worker exit unexpected |
| `setting.update` | app_setting | Fase 3 | Worker setting changed |
| `connection.check` | whatsapp | Fase 4 | Manual health check |
| `message.send` | whatsapp | Fase 4 | Test send message |
| `login.success` | user | Fase 1 | User login success |
| `login.failed` | user | Fase 1 | User login failed (record IP) |
| `logout` | user | Fase 1 | User logout |
| `export.data` | settings | Fase 1 | Export all settings |
| `import.data` | settings | Fase 1 | Import settings |

### 4.3 Audit Schema Update

```prisma
model AuditLog {
  id        String   @id @default(cuid())
  userId    String?
  ipAddress String?               // ← NEW
  userAgent String?               // ← NEW
  action    String
  entity    String
  entityId  String?
  detail    String?
  createdAt DateTime @default(now())

  user      User?    @relation(fields: [userId], references: [id])
  @@index([entity, entityId])
  @@index([action])
  @@index([createdAt])
  @@index([userId, createdAt])     // ← NEW index
}
```

---

## 5. Matriks Dampak Data Sensitif

### 5.1 Data Flow: Sebelum vs Sesudah

| Data Point | Saat Ini | Setelah Implementasi |
|------------|----------|---------------------|
| Phone number di API response | Raw (unmasked) | Masked via middleware (Fase 1) |
| Phone number ke Ollama | Raw, tanpa consent | Masked + opt-in consent toggle (Fase 1) |
| QR code storage | Plaintext `.whatsapp-status.json` | Encrypted + auto-expire 30s (Fase 1) |
| User password | Tidak ada | bcrypt hash (Fase 1) |
| Session cookie | Tidak ada | httpOnly JWT (Fase 1) |
| Worker logs | stdout only | File + sanitized (Fase 5) |
| Connection history | Tidak disimpan | Audit log + AppSetting (Fase 4) |

### 5.2 PII Inventory & Protection

| Data | Klasifikasi | Storage | Proteksi |
|------|-------------|---------|----------|
| User name | PII Rendah | DB `User.name` | — |
| User phone | PII Sedang | DB `User.phone` | Masked di API/UI, hashed di search index? |
| User password | Kredensial | DB `User.passwordHash` | bcrypt, tidak pernah di-log |
| Customer phone | PII Sedang | DB `WhatsAppMessage.fromPhone` | Masked di API/UI, anonimized ke Ollama |
| Message body | PII Tinggi | DB `WhatsAppMessage.body` | Tidak di-log, anonimized ke Ollama (Fase 1) |
| WhatsApp session | Kredensial | `./.session-data/*` | File system permission, encrypted at rest? |
| QR code | Kredensial | Memory + `.whatsapp-status.json` | Hapus setelah 30 detik (Fase 1) |
| Ollama responses | PII Rendah | Memory (tidak disimpan) | — |
| Audit log detail | PII Sedang | DB `AuditLog.detail` | Tetap disimpan untuk compliance |

### 5.3 Consent Mechanism

Untuk pengiriman data ke Ollama (Fase 1):

```
[⚙️ Settings → Processing]

Kirim data ke AI untuk klasifikasi
[✓] Izinkan kirim body pesan ke AI 
    (phone number akan di-anonimkan)
    
Note: Data hanya dikirim ke server AI lokal (http://localhost:11434).
Non-aktifkan jika data bersifat rahasia.
```

**Storage**: `AppSetting` key `wa_llm_consent` (default: `"true"`).

**Implementation**: Di `classifier/ollama.ts`, cek setting sebelum panggil Ollama. Jika `"false"`, fallback ke rule-based only.

---

## 6. Ringkasan Prioritas

| Fase | Prioritas | Risiko | Estimasi | Ketergantungan |
|------|-----------|--------|----------|----------------|
| **Fase 1 — Auth + Security** | 🔴 Tertinggi | High | 3-5 hari | Tidak ada |
| **Fase 2 — Worker Management** | 🟡 Tinggi | Medium | 2-3 hari | Fase 1 |
| **Fase 3 — Worker Settings** | 🟡 Sedang | Rendah | 1-2 hari | Fase 2 |
| **Fase 4 — Stats & History** | 🟢 Rendah | Rendah | 1 hari | Optional |
| **Fase 5 — Advanced Features** | 🟢 Selesai | Medium | 2-3 hari | Fase 1-4 |

---

## 7. File Index — Perubahan Lengkap

### New Files

```
src/
  hooks.server.ts                    ← F1: Auth guard, CSP, rate limit
  lib/server/auth/session.ts         ← F1: JWT management
  lib/server/worker-manager.ts       ← F2: Worker process management
  lib/stores/auth.svelte.ts          ← F1: Auth state store
  routes/login/+page.svelte          ← F1: Login page
  routes/api/auth/login/+server.ts   ← F1: Login endpoint
  routes/api/auth/logout/+server.ts  ← F1: Logout endpoint
  routes/api/auth/me/+server.ts      ← F1: Current user info
  routes/api/whatsapp/worker/+server.ts          ← F2: GET worker status
  routes/api/whatsapp/worker/start/+server.ts    ← F2: POST start
  routes/api/whatsapp/worker/stop/+server.ts     ← F2: POST stop
   routes/api/whatsapp/stats/+server.ts            ← F4: Message stats
   routes/api/whatsapp/worker/logs/+server.ts       ← F5: Worker log viewer
   routes/api/whatsapp/worker/latency/+server.ts    ← F5: Latency history
.env.example                         ← F1: Template env vars
ROADMAP.md                           ← This file
```

### Modified Files

| File | Perubahan | Fase |
|------|-----------|------|
| `prisma/schema.prisma` | + `User.passwordHash`, `AuditLog.ipAddress`, `AuditLog.userAgent` | F1 |
| `prisma/seed.ts` | + passwordHash untuk 3 user, + new AppSettings keys | F1, F3 |
| `src/app.d.ts` | + `App.Locals { user: User }` | F1 |
| `worker/index.ts` | Hapus hardcoded phone, + endpoint health detail | F1, F2 |
| `src/routes/settings/+page.svelte` | + Worker card, settings, stats | F2, F3, F4 |
| `src/lib/stores/wa-status.svelte.ts` | + Worker running state | F2 |
| `src/lib/utils/mask.ts` | + `maskInApi()` helper | F1 |
| `src/lib/stores/toast.ts` | + Rate limit toast type? | F4 |
| `src/lib/server/classifier/ollama.ts` | + Consent check + phone masking | F1 |
| `src/lib/server/worker-manager.ts` | + File logging + sanitasi + latency history + lastStatus() | F5 |
| `src/routes/api/whatsapp/health/+server.ts` | + recordLatency() | F5 |
| `.gitignore` | + `/worker/logs/` | F5 |
| Semua route `settings/*/[id]/+server.ts` | Soft delete statt hard delete | F1 |
| Semua route handler | + `event.locals.user.id` ke audit log | F1 |
| Semua proxy WA routes | Baca `wa_worker_url` dari DB, bukan env | F3 |
| `CHANGELOG.md` | Update per fase | All |
| `AGENTS.md` | Update env vars, commands, security rules | F1 |
| `FITUR.md` | Update checklist | All |
| `.gitignore` | + `worker/logs/` | F5 |

---

## 8. Matrix Ketergantungan

```
Fase 1 (Auth)
  │
  ├──→ Fase 2 (Worker Management)
  │      │
  │      └──→ Fase 3 (Worker Settings)
  │
  └──→ Fase 4 (Stats & History) — bisa paralel dengan F2/F3
         │
         └──→ Fase 5 (Advanced)
```

- Fase 1 adalah blocker untuk semua fase lain
- Fase 4 bisa dikerjakan paralel dengan Fase 2/3 (tidak dependen)
- Fase 5 membutuhkan Fase 4 selesai (connection history diperlukan)

---

## 9. Test Plan

### Fase 1
- Unit: JWT sign/verify, bcrypt hash/compare, role checking helper
- Integration: Login flow, auth guard di setiap endpoint group
- E2E: Login page → redirect, session persist, logout clear cookie
- Security: brute force login (rate limit), XSS via login form, CSP headers

### Fase 2
- Unit: WorkerManager.start/stop/getInfo with mock child process
- Integration: Start worker → check status → stop worker
- E2E: UI toggle start/stop → verify worker running → stop

### Fase 3
- Unit: Setting validation (URL regex, integer range)
- Integration: Save setting → reload → verify value persisted

### Fase 4
- Unit: Stats query aggregation (mock DB)
- Integration: GET stats response format

### Fase 5 ✅
- E2E: Log viewer loads, sanitize working, chart renders, notification triggers on worker stop

---

## 10. Rollback Plan

Perubahan bersifat **additive** (tambah file, modifikasi yang sudah ada) sehingga rollback bisa dilakukan per fase dengan git revert.

| Fase | Rollback Strategy |
|------|-------------------|
| F1 | Revert migration `add_auth_fields`, revert hook.server.ts, revert security headers |
| F2 | Hapus worker manager, revert connection UI |
| F3 | Hapus endpoint, revert settings UI |
| F4 | Hapus endpoint, revert stats card |
| F5 | Hapus log viewer, revert log write/endpoints, revert .gitignore |

Semua API endpoints baru memiliki prefix `/api/` yang sudah di-guard oleh `hooks.server.ts` — jika rollback auth, semua endpoint baru ikut terproteksi.

---

> ⚠️ **Catatan**: Dokumen ini adalah living document. Update sesuai progress implementasi di `CHANGELOG.md` dan tiket di project board.
