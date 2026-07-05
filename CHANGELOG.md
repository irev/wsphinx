# Changelog

Maintain `CHANGELOG.md` according to Keep a Changelog 1.1.0:
https://keepachangelog.com/en/1.1.0/
Use `Unreleased`, newest-first version order, `YYYY-MM-DD` release dates, and standard categories: `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`. Keep entries human-readable and do not dump raw git logs.

## Unreleased

### Added

- **Port detection**: Script `scripts/check-ports.ts` mengecek konflik port sebelum app jalan — terintegrasi ke `npm run dev`, `npm run worker`, dan `npm run preview`.
- **Central port config**: `src/lib/server/ports.ts` berisi kumpulan port + async `checkAllPorts()` untuk runtime reference.
- **`.env.example`**: Tambah `VITE_PORT` (9393) dan `VITE_PREVIEW_PORT` (9595).

### Changed

- **Port aplikasi dipindah ke range 9000+** untuk hindari bentrok dengan aplikasi lain:
  - Dev server: `5173` → **`9393`**
  - Worker API: `3457` → **`9494`**
  - Preview server: `4173` → **`9595`**
  - Production (adapter-node): `3000` → **`9696`** (via `PORT` env)
- **`vite.config.ts`**: Tambah `server.port` + `preview.port` dengan `strictPort: true`.
- **`worker/index.ts`**: Default `WORKER_API_PORT` fallback dari `3457` → `9494`.
- **`prisma/seed.ts`**: Default `wa_worker_url` dari `:3457` → `:9494`.
- **`worker-url.ts`**: Default `ENV_URL` dari `:3457` → `:9494`.
- **Test files**: Hardcoded `localhost:5173` diubah ke `:9393` di `helpers.ts`, `auth-login.test.ts`, `api-logs.test.ts`.

### Added

- **Docker support**: `Dockerfile` (multi-stage build), `docker-compose.yml` (app + worker + ollama), `.dockerignore`.
- **PM2 support**: `ecosystem.config.json` dengan 2 apps (`whatapp-app`, `whatapp-worker`) + log rotation.
- **README.md diperbarui**: 3 metode instalasi (Standard, Docker, PM2) + tabel konfigurasi lengkap + daftar port.

- **Wireframe adjustments**: 3 halaman disesuaikan dengan wireframe di `docs/wires/`:
  - **Tickets**: Search bar "Cari tiket..." dengan debounce + tombol "Add Card" per kolom status untuk quick-create tiket.
  - **Reports**: Period selector (Daily/Weekly/Monthly) + date picker + rich result card dengan stat grid, Copy/Download buttons, follow-up ticket table, detail expandable.
  - **Audit**: Expandable row detail — klik baris untuk lihat metadata perubahan (fromStatus→toStatus, IP, User Agent, note, confidence).
- **Layout**: Tambah `timeline` → "Riwayat" di subtitle/title mapping.
- **TicketFormDialog**: Prop `prefillStatusId` untuk quick-create dengan status pre-filled dari tombol "Add Card".

### Fixed

- **Page title dinamis**: Layout sekarang pakai `currentPage.title` dari derived path mapping — title berubah per halaman (Dashboard, Pesan, Tickets, dll.) bukan hardcoded "WhatsApp Tech Support".
- **Audit Log entity ID**: Entity column untuk ticket sekarang menampilkan `ticketNumber` dari detail JSON (misal `TKT-2025-001`) bukan potongan raw CUID (`#cm7a1b2`).
- **Audit Log status CUID → nama**: Backend resolve `fromStatus`/`toStatus` CUID ke nama status (Open, In Progress, Closed) sebelum dikirim ke frontend. Detail column menampilkan `Open → Closed` bukan `cmr7xxx → cmr7xxx`.

### Removed

- **Override `<svelte:head>` di login, settings, sources**: Title sekarang konsisten dari layout, hapus 3 override title lokal yang formatnya inkonsisten.

### Changed

- **Audit log `statusLabel()`**: Fallback untuk raw CUID (>10 chars) ditampilkan sebagai `#cm7a1b2` bukan full string panjang.
- **Dashboard bottom grid**: Tambah `items-stretch` agar card "Masalah Terbanyak" dan "Aktivitas Terbaru" sama tinggi.
- **Inbox lightbox**: Ganti inline style overlay dengan `wt-overlay` class yang sudah terdefinisi di `custom.css`.
- **Dashboard `$derived` idiomatic**: `categoryCounts` ganti ke `$derived.by()` dan template panggil langsung tanpa `()`.
- **Dashboard — Aktivitas Terbaru**: Tambah link "Lihat Semua" ke `/tickets` di footer card.
- **Inbox — creating state**: `creating` boolean global diganti `creatingPerId` Set<string> agar tiket bisa dibuat dari pesan berbeda secara concurrent tanpa tombol saling disabled.
- **Test files fix**: `api-logs.test.ts` pakai `as any` pada mock event, `api-stats.test.ts` import `mockAdminEvent` + passing event ke GET.
- **Mobile brand icon login**: Konsisten dengan desktop (`size-9 rounded-xl bg-white/20 backdrop-blur-sm`).

### Added

- **Audit log retention**: DELETE `/api/audit?days=90` — purge entri lebih tua dari N hari (min 30, max 365). Tombol hapus di halaman Audit dengan konfirmasi.
- **Login page animation**: Form card login sekarang punya `animate-slide-up` (fade-in + translate dari bawah 20px) untuk first impression lebih hidup.
- **Dashboard empty state**: Saat data kosong (belum ada tiket), tampilkan onboarding card dengan 3 langkah panduan + CTA ke Settings.
- **Dashboard KPI accent strip**: Setiap KPI card punya strip warna di atas (biru/kuning/merah/hijau) sesuai metrik — depth visual lebih baik.
- **Inbox source icon + tooltip**: Nama sumber pesan di kolom Pengirim sekarang punya icon grup/kontak + tooltip nomor telepon.
- **Missing CSS utilities**: `hover:bg-muted/30`, `disabled:opacity-30`, `disabled:pointer-events-none` — semua hover/disabled state yang sebelumnya silent fail karena tidak ada di precompiled `styles.css`.
- **Priority border classes**: `border-prio-critical`, `border-prio-high`, `border-prio-medium`, `border-prio-low` di `custom.css` — bordir kiri card klasifikasi inbox sekarang terlihat (merah/oranye/biru/abu) menggunakan CSS variable yang terdefinisi, bukan Tailwind utility yang tidak tercompile.

- **Session WA tidak stabil saat restart**: Hapus random User Agent & Viewport yang berubah tiap restart, ganti dengan 1 nilai stabil (Chrome 125 / 1366x768) — mencegah WhatsApp menganggap browser baru dan meminta scan ulang QR. Gunakan `WA_SESSION_PATH` env var (default `.session-data`) untuk path absolut penyimpanan session. Worker STATUS_FILE juga kini absolute path.

### Changed
- **Layout page title**: `text-base` → `text-xl`, tambah `pb-7.5`, subtitle otomatis per halaman via `currentPage.subtitle` map.
- **Settings sidebar**: Lebar sidebar distandardisasi ke `w-[230px] shrink-0` (sebelumnya `lg:w-[220px] xl:w-[240px]`).
- **Reports page**: 3 card section dikonversi dari inline `kt-card` ke `<Card>` component.
- **Dashboard KPI grid**: Tambah `items-stretch` agar semua card KPI sama tinggi.

### Added
- **Page subtitles**: Setiap halaman utama (Dashboard, Inbox, Tickets, Reports, Settings, Sources, Audit) punya subtitle deskriptif yang ditampilkan di bawah page title.

### Added
- **Worker Live Logs**: stdout/stderr disimpan ke `worker/logs/YYYY-MM-DD.log` dengan sanitasi (mask phone, filter QR). Endpoint `GET /api/whatsapp/worker/logs?lines=N&date=YYYY-MM-DD`. UI terminal-style viewer collapsible di Connection tab dengan date picker + refresh.
- **Connection Quality Dashboard**: Latency history 24 jam disimpan di `WorkerManager`, direkam setiap health check. Endpoint `GET /api/whatsapp/worker/latency`. Mini bar chart di Connection tab (60 data points, hijau/merah).
- **Worker Crash Notification**: Polling setiap 30 detik ke `/api/whatsapp/worker`. Jika status berubah running→stopped, show toast + desktop notification (Notification API).
- **Stats Card** di Connection tab: pesan/classified/support/tickets hari ini + minggu, unprocessed count, avg confidence.
- **Test Send Message** form di Connection tab: input chat ID + teks, kirim via worker API.
- **API**: `GET /api/whatsapp/stats` — agregasi pesan & tiket hari ini + 7 hari terakhir.
- **Worker Settings Panel** di Settings → Connection: Worker API URL (input + simpan), Auto Restart Worker (toggle), Max Reconnect (number 1-50), QR Refresh Interval (number 5-60 detik).
- **`getWorkerUrl()` utility** di `src/lib/server/whatsapp/worker-url.ts` — baca URL dari DB dengan cache 60 detik, fallback ke env.

### Added
- **Worker Management** (Fase 2): Start/stop worker dari UI tanpa perlu terminal terpisah.
  - `src/lib/server/worker-manager.ts` — Singleton class spawn `tsx worker/index.ts` sebagai child process, auto-restart on crash (configurable via `wa_worker_auto_restart`), graceful SIGTERM → SIGKILL setelah 5s.
  - `GET /api/whatsapp/worker` — Worker status (running, PID, uptime, worker URL).
  - `POST /api/whatsapp/worker/start` — Start worker process (admin only).
  - `POST /api/whatsapp/worker/stop` — Stop worker process (admin only).
  - UI: Worker Status Card di Settings → Connection — indikator running/stopped, PID, uptime, worker URL, tombol Start/Stop.
  - Audit log: `worker.start` dan `worker.stop`.
- **`getClientAddress()` error handling**: Semua route yang panggil `getClientAddress()` pakai try/catch fallback ke `127.0.0.1` — fixes error di dev/Playwright.

### Security
- **Autentikasi JWT**: Login via phone + password (bcrypt), httpOnly cookie, 7 hari expiry. Endpoint: `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`.
- **Global auth guard** (`src/hooks.server.ts`): Semua `/api/*` route (kecuali `/api/auth/login`) wajib JWT valid. 401 jika tidak ada session, 403 jika role tidak sesuai.
- **RBAC**: Role guard `isAdmin()` dan `isAdminOrPic()` di semua route sensitif — settings CRUD, export/import, send message, chat analyze.
- **Rate limiting**: 100 request/menit per IP di hooks.server.ts dengan fallback `127.0.0.1` jika dev mode.
- **Security headers**: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, CSP + HSTS di production.
- **Soft delete refactor**: 5 settings endpoints (users, categories, statuses, priorities, sources) ganti `delete()` jadi `update({ active: false })` — data tidak hilang permanen.
- **Hardcoded phone dihapus**: `worker/index.ts:57` — env `WHATSAPP_PHONE` wajib diset, exit dengan pesan error jika tidak ada.
- **Ollama consent**: Toggle "Kirim Data ke AI" di Settings → Processing. Jika nonaktif, fallback ke rule-based classification saja. Phone number di-anonimkan sebelum dikirim ke Ollama.
- **Audit log `userId`**: Semua audit log sekarang menyertakan `userId` dari session (kecuali login.failed). Field baru `ipAddress` dan `userAgent` di AuditLog schema.

### Added
- **Login page** (`/login`): Form phone + password, error handling, auto-redirect ke halaman sebelumnya setelah login.
- **Auth store** (`$lib/stores/auth.svelte.ts`): State management login/logout, auto-fetch `/api/auth/me` di mount.
- **Schema migration**: `User.passwordHash` (bcrypt), `SupportPriority.active`, `SupportStatus.active`, `AuditLog.ipAddress`, `AuditLog.userAgent`.
- **Seed update**: 3 user seed dengan passwordHash (`admin123` via bcrypt). AppSettings baru: `wa_llm_consent`, `wa_worker_url`, `wa_worker_auto_restart`, `wa_worker_max_reconnect`, `wa_worker_qr_interval`.
- **ROADMAP.md**: Rencana implementasi 5 fase (Auth → Worker Management → Worker Settings → Stats & History → Advanced Features), audit keamanan lengkap, area terdampak, matriks data sensitif, dan test plan.
- **`.env.example`**: Template environment variables lengkap termasuk `JWT_SECRET` dan `WHATSAPP_PHONE`.
- **`maskInApi()` helper**: Masking phone number di API response JSON.
- **bcryptjs** dependency untuk password hashing.
- **jsonwebtoken** dependency untuk JWT session management.
- **Profil WA di header**: nama (pushname), nomor telepon, dan foto profil dari akun WhatsApp yang terkoneksi — fallback ke "PIC Satu"/"Teknisi" jika belum loaded
- `getMe()` method di `WhatsAppReader` interface & `WebJSAdapter` — baca `client.info.pushname`, `client.info.wid`, `client.info.platform`
- Worker endpoint `GET /api/me`
- Proxy SvelteKit `GET /api/whatsapp/me`
- `$lib/stores/wa-profile.svelte.ts` — auto-poll profil tiap 10 detik, foto tiap 60 detik

### Fixed
- **CSS**: tambah utility class `bg-success`, `bg-warning`, `bg-destructive`, `bg-muted-foreground` dan `animate-ping` + `@keyframes ping` di `custom.css` — sebelumnya tidak terdefinisi, dot status WhatsApp tidak berwarna
- Settings → Connection card: `waDisconnect`, `waDisconnectAndClear`, `waReconnect` — refresh API calls (status + session info) sebelum loading spinner dimatikan
- `fetchWaQr()` hanya dipanggil di mount jika status sudah `scanning_qr`, bukan unconditional
- Semua fetch connection ada timeout 5s via `AbortController` (cek worker mati tidak hang selamanya)
- Validasi shape `waHealth` response sebelum assign — cegah NaN dari field tak terduga
- Guard NaN: `waHealth.uptime ?? 0`, `waHealth.reconnectAttempts ?? 0`, `waHealth.maxReconnectAttempts ?? 10`
- QR error state + tombol retry saat fetch QR gagal (tidak spinner abadi)
- Toast error saat health check gagal
- `showToast('warning', ...)` diperbaiki jadi `'info'` (tidak ada tipe warning di ToastType)


- **Session UI** di Settings → Connection: status saved session (Available/None), created date, file size; toggle Session Persistence; tombol Clear Session dengan konfirmasi
- **Auto-clear session**: saat `wa_session_persistence = false`, session otomatis dihapus saat disconnect
- Seed: `wa_session_persistence = true`

### Changed
- **WA status store**: semua indikator status WhatsApp di UI (header profile + settings card + sidebar dot) sekarang membaca dari `$lib/stores/wa-status.svelte.ts` — satu sumber kebenaran, polling 5 detik. Settings tidak lagi polling sendiri 3 detik.
- Settings → Connection: QR fetch otomatis saat status berubah ke `scanning_qr` via `$effect` transition detection
- `$effect` settings: include `wa-connection` untuk load app settings
- **State machine adapter**: tambah flag `disconnecting` + `connecting` untuk cegah race condition `restart()` vs `disconnect()`
- **Label tombol**: "Logout" → "Disconnect" (hanya putus koneksi, session tetap). Logout asli (clear session) pindah ke tombol merah terpisah dengan konfirmasi
- **Loading states dipisah**: `waDisconnectLoading`, `waReconnectLoading`, `waHealthLoading` masing-masing independen
- **"Last Health Check"**: sekarang menampilkan `timeAgo(timestamp)` bukan `formatUptime(waHealth.uptime)` yang misleading

### Added
- **QR auto-refresh**: interval 15 detik saat status `scanning_qr` — QR expired ~20 detik, auto-refresh cegah QR basi
- **QR langsung muncul**: `fetchWaStatus()` trigger `fetchWaQr()` seketika saat status berubah jadi `scanning_qr` (sebelumnya nunggu interval 15 detik)
- **Status `initializing`**: warna violet + `animate-pulse` di sidebar dan connection card (sebelumnya jatuh ke merah/destructive)
- **`bg-info`** utility class di `custom.css`
- **`size-56`** utility class di `custom.css` (QR image 224px)
- **Health details card**: tampilkan reconnect attempts, uptime (format `formatDuration`)
- **Guard `sendMessage()`**: throw error jika status bukan `connected` (sebelumnya silent fail)
- **Fixed icon Keenicons**: `ki-refresh` → `ki-arrows-loop`, `ki-power` → `ki-switch`, `ki-health` → `ki-electricity`, `ki-logout` → `ki-exit-left` (4 icon sebelumnya tidak ada di font, tidak tampil)

### Fixed
- ScrollToTop button position: `bottom-6` → `bottom-8`, added missing Tailwind classes (`opacity-0`, `translate-y-3`, `scale-95/100`, `pointer-events-none`, `z-50`, `right-6`, dll) ke `custom.css` — precompiled `styles.css` tidak mengandung utility classes tersebut
- Sources page: double `kt-container-fixed` wrapper dihapus (padding dobel)

### Changed
- Header: status dot WA dipindah dari avatar (absolute bottom-right) ke inline sebelum nama user "PIC Satu" — bentuk dot kecil `size-2`
- Settings: action buttons (Edit/Hapus) di 5 tabel dibungkus dalam menu dropdown ikon titik tiga (`ki-dots-vertical`) — tampilan tabel lebih compact
- Puppeteer config: `headless` → `"new"`, hapus `--headless=chrome` (konflik dgn v24), tambah `--disable-blink-features=AutomationControlled` untuk mengurangi deteksi headless
- Auto-login: pindah restart expired ke adapter, tambah guard `restarting` & cooldown 3 detik untuk cegah restart loop
- **Worker API server**: start SEBELUM `adapter.connect()` — proxy SvelteKit bisa langsung mengakses status tanpa menunggu Puppeteer initialization
- **Status proxy**: fetch error → `"worker_offline"` (beda dari `"disconnected"`), tambah AbortController 3 detik timeout
- **Initial status adapter**: `"disconnected"` → `"initializing"` agar UI bisa bedakan "worker baru start" vs "koneksi WA putus"
- **Halaman sources**: `"worker_offline"` tampilkan "Worker tidak berjalan", `"initializing"/"disconnected"` tampilkan "Menghubungkan ke WhatsApp..."
- **Header**: status dot WA dipindah ke overlay avatar profile (merah/ijau), polling 10 detik, tooltip deskriptif, handle semua status termasuk `worker_offline` & `initializing`
- **Inbox responsive**: kolom Waktu `hidden md:table-cell`, Klasifikasi `hidden lg:table-cell`, Aksi `hidden md:table-cell` + tombol ⋮ mobile, baris bisa diklik untuk toggle klasifikasi di HP, source name `hidden md:inline`, body pesan `line-clamp-2 md:truncate`, filter bar `max-sm:flex-col`
- **Sources**: toggle aktif/nonaktif per grup/kontak di daftar kiri (checkbox) + header chat (badge + toggle), visual opacity untuk nonaktif, auto-mark read saat buka chat, per-message eye button, bold untuk unread, batch Read/Unread di action bar
- **NotificationsDrawer**: komponen baru gantikan drawer kosong — polling `/api/messages?isRead=false` + `/api/audit` tiap 15 detik, tab filter (All/Pesan/Tiket/Sistem), ikon per jenis, timestamp relatif, empty state

- **Worker HTTP API** (port 3457) — Internal HTTP server di worker untuk query live data WA: groups, contacts, messages, profile pic, send message.
- **API proxy routes** — `/api/whatsapp/groups`, `/api/whatsapp/contacts`, `/api/whatsapp/chat/[chatId]`, `/api/whatsapp/pic/[chatId]`, `/api/whatsapp/send` — proxy ke worker API.
- **API Chat Analyze** — `POST /api/chat/analyze` — klasifikasi batch messages (panggil `classifyMessage`) untuk analisa AI.
- **Halaman Kontak & Grup WA** (`/sources`) — Split panel layout: kiri daftar grup/kontak dari WA + DB, kanan viewer percakapan dengan date filter, search, checkbox multi-select, batch analisa AI, buat tiket, dan kirim balasan langsung.
- **Navbar** — Item "Kontak" baru mengarah ke `/sources`.
- **Schema** — `WhatsAppSource.photoPath` (base64 cache foto profil).
- **Adapter interface** — Method `getGroups()`, `getContacts()`, `getMessages()`, `getProfilePic()` untuk live data WA.
- **WebJSAdapter** — Implementasi 4 method baru: fetch groups/contacts via `client.getChats()`, fetch messages via `chat.fetchMessages()`, profile pic via `client.getProfilePicUrl()` + fetch base64.
- **Live sync flow** — `/api/whatsapp/chat/[chatId]` upsert messages ke DB (by `id` = WA serialized ID) tanpa duplikat; `/api/whatsapp/pic/[chatId]` cache base64 di `WhatsAppSource.photoPath`.

### Changed

- **Navbar** — Restrukturisasi, tambah nav item "Kontak" setelah "Tickets".

- **API CRUD Categories** — POST + GET `/api/settings/categories`, PUT + DELETE `/api/settings/categories/[id]` dengan validation dan duplicate check by name.
- **API CRUD Priorities** — POST + GET `/api/settings/priorities`, PUT + DELETE `/api/settings/priorities/[id]` dengan unique constraint (name OR level).
- **API CRUD Statuses** — POST + GET `/api/settings/statuses`, PUT + DELETE `/api/settings/statuses/[id]`.
- **API CRUD Users/PICs** — POST + GET `/api/settings/users`, PUT + DELETE `/api/settings/users/[id]`.
- **API GET Sources pagination** — Support query params `?skip=0&take=20&q=xxx`.
- **API Export Settings** — GET `/api/settings/export` download semua master data sebagai JSON file.
- **API Import Settings** — POST `/api/settings/import` upsert semua entity by unique key (name/level/phone) dengan response summary (created/updated/skipped/errors).
- **Settings UI lengkap** — Compact layout Metronic dengan CRUD dialog per entity (Priorities, Statuses, Categories, Users, Sources), search debounce 300ms, pagination Prev/Next, color picker native, kt-switch inline toggles, delete confirmation, export/import modal.
- **Schema `isActive`** — Field `isActive Boolean @default(true)` di `WhatsAppMessage` untuk arsip (soft delete).
- **API Inbox: Search + Filter** — `GET /api/messages` tambah param `q` (search body/fromName), `messageType`, default `isActive=true`.
- **PATCH /api/messages/[id]** — Endpoint toggle `isRead` dan `isActive` per pesan.
- **POST /api/messages/batch** — Batch action: `classify`, `markRead`, `markUnread`, `archive` (max 100 pesan per request).

### Changed

- **Inbox page rewrite** — Layout baru dengan:
  - Filter bar: Grup, Type, Status (processed/unprocessed), Date preset (Hari Ini/7/30 hari)
  - Search debounce 300ms di body/fromName/fromPhone
  - Limit select (5/10/20/50/100 per halaman), pagination Prev/Next
  - Checkbox per baris + select all → batch action bar (Classify, Read, Unread, Arsip)
  - Aksi per baris: toggle Read (👁️), Arsip (🗑️), Classify, Buat Tiket
  - Classification panel sebagai child row dengan left-border warna prioritas (bukan colspan kacau)
  - Waktu relatif ("2j lalu", "Kemarin") + tooltip full date
  - Font-weight pembeda: unread = semibold, read = normal
  - Auto-refresh toggle (15 detik) + tombol refresh manual
  - Lightbox media image
- **Navbar** — Filter mouseenter/mouseleave hanya jalan di desktop (>=1024px). Dropdown Pesan center (`start-1/2 -translate-x-1/2 z-50`) agar tidak nutup item sebelah.

- **Audit Log page rewrite** — Compact Metronic layout dengan filter dropdown Entity & Action, debounced search (300ms), pagination Prev/Next, auto-refresh toggle (30s polling), dan detail column yang mem-parse JSON jadi teks readable (status change badges, summary, note, dll).
- **API Audit** — Tambah param `q` untuk text search di field `detail`. Default limit jadi 100.

- **Media Support** — WhatsAppMessage schema now stores `mediaPath`, `mediaType`, `mediaSize`, `fileName`. Adapter downloads and saves media files locally (`./media/{sourceId}/`). Route `GET /media/[...path]` serves files with correct Content-Type and path traversal protection.
- **Media Thumbnails di Inbox** — Inbox shows image thumbnails, video/file icons. Image click opens lightbox modal.
- **Stealth Plugin** — `puppeteer-extra` + `puppeteer-extra-plugin-stealth` via require cache override to hide automation.
- **Random User Agent & Viewport** — Picks from 5 realistic Chrome/Edge UAs and 4 window sizes to reduce fingerprinting.
- **Rate Limiter Queue** — Messages processed sequentially with 800-2500ms random delay between handlers.
- **sendMessage di Adapter** — `sendMessage(chatId, text)` with typing indicator and 2-6s random delay before sending.
- **Auto-Reply Engine** — `src/lib/server/auto-reply/index.ts` with template variable substitution (`{name}`, `{ticket}`, `{summary}`, `{body}`). Configurable per source via `autoReply` toggle and `replyTemplate` field.
- **Auto-Reply di Worker** — Worker calls `maybeAutoReply()` after classification when `source.autoReply` is active.
- **UI Auto-Reply Settings** — Sources table now shows Auto Reply status column. Edit dialog includes toggle + template textarea with variable hints.
- **Media in .gitignore** — `/media` added to prevent media file commits.

- **Multi-grup WhatsApp** — Schema `WhatsAppSource.chatId` dan `WhatsAppMessage.chatId`/`chatName`/`isRead`. Worker otomatis enumerasi grup WA setelah connect, auto-create source per grup (nonaktif). Pesan dari grup tak dikenal dibuatkan source otomatis.
- **API CRUD WhatsApp Sources** — `POST /api/settings/sources` (create), `PUT /api/settings/sources/[id]` (update), `DELETE /api/settings/sources/[id]` (hapus).
- **UI Settings: Pengelolaan Grup** — Tabel WhatsApp Sources dengan tombol Tambah/Edit/Toggle Aktif/Hapus. Popup dialog form (nama, tipe, nomor, deskripsi). Konfirmasi hapus.
- **UI Inbox: Filter Grup** — Dropdown filter sumber/grup di atas tabel pesan inbox. Fetch `/api/messages?sourceId=xxx` sesuai pilihan.
- **Notifikasi Badge** — Badge merah di icon lonceng Header menampilkan jumlah pesan belum dibaca. Polling tiap 30 detik.
- **Filter `isProcessed`/`isRead` di API Messages** — GET `/api/messages` dukung query params `isProcessed` dan `isRead`.
- **Worker auto-create source** — Jika source `WHATSAPP_SOURCE_NAME` tidak ditemukan di DB, worker otomatis membuatnya.

### Changed

- **Adapter multi-source** — `WebJSAdapter` routing pesan per chatId: extract `msg.from`, lookup source di DB, simpan dengan `sourceId` sesuai grup. Hanya panggil handler jika `source.active = true`.
- **Worker source lookup** — Tidak exit jika source tidak ditemukan; auto-create dengan data dari env.
- **CSS fix dropdown menu** — Ganti `w-full lg:max-w-[420px]` → `min-w-[400px]` pada Pesan dropdown dan `min-w-[220px]` pada Tickets dropdown agar submenu tidak terpotong oleh parent width.
- **Dropdown content restructure** — Hapus nested `kt-menu-default`/`kt-menu-fit`, pakai Tailwind langsung (`px-4 py-3 w-full rounded-lg`). Pesan dropdown dari grid 2 kolom → `flex flex-col gap-1` vertikal (sama struktur dengan Board).

### Changed

- **Form Buat Tiket Baru (Timeline)** — Ganti drawer slide-out jadi popup modal dialog menggunakan class `kt-modal` dari Metronic. Komponen baru `TicketFormDialog.svelte` dengan backdrop blur, header/title, body form 4 kolom terbagi-grid, footer aksi. Props `prefill` dari hasil klasifikasi grup. Navigasi `/api/settings` untuk data referensi.
- **Detail Tiket jadi Modal** — Halaman `/tickets/[id]` diganti dengan popup modal tengah halaman. Komponen baru `TicketDetailDialog.svelte`: ticket metadata editable, ringkasan, pesan terkait, riwayat update, tombol tutup tiket. Data di-refresh via `onChanged` callback. Kanban board `/tickets` panggil modal via `showDetailId` state (bukan link navigasi).
- **Dialog redesign (iterasi)** — Kedua dialog (form + detail) di-refactor: hapus backdrop overlay, ganti `kt-modal` class dengan styling kustom (fixed overlay + centered card + shadow), z-index 100, scoped `<style>` tanpa dependensi CSS global.
- **Close button kanan** — Pindah posisi close button dari kiri ke kanan header.
- **Catatan perubahan jadi textarea** — Field "Catatan perubahan (opsional)" diubah dari `<input>` inline menjadi `<textarea rows={3}>` di bawah tombol Simpan.
- **Detail Tiket lebih lebar + 2 kolom** — `max-width` dialog detail dari 800px → 1024px. Body dibagi grid 2 kolom: kiri (info, ringkasan, pesan terkait, tutup tiket) dan kanan 280px (Riwayat dengan border pemisah). Responsif mobile: fullscreen di HP, Riwayat pindah ke bawah.
- **Form Tiket Baru di Board** — Ganti inline `<Card>` form di halaman `/tickets` dengan `TicketFormDialog` popup tengah (sama seperti di timeline). Hapus state `form` dan `createTicket()` lokal yang tidak lagi dipakai.

### Added

- **Halaman Timeline Chat** (`/timeline`) — Timeline pesan WhatsApp real-time dengan:
  - Filter bar: sumber grup, quick date (Hari Ini / 7 Hari / 30 Hari / Custom), tipe filter (All / Support)
  - Auto-refresh polling setiap 5 detik dengan toggle ON/OFF
  - **Message grouping otomatis**: pesan berurutan dari pengirim yang sama dalam jeda ≤5 menit digabung jadi satu grup card
  - Tampilan timeline dengan date separator ("Hari Ini", "Kemarin", tanggal lengkap)
  - Tiap grup: avatar sender, nama, range waktu, sub-bubble dengan timestamp masing-masing
  - Expand/collapse untuk grup >3 pesan
  - Tombol Classify Group (kirim semua body sebagai batch) + Buat Tiket (dengan semua messageIds)
- **Sidebar** — Tambah nav item "Timeline" di accordion Pesan

### Changed

- **Chrome detection dinamis** — Ganti `checkChrome()` hardcoded 3 versi dengan `findChromeExecutable()` di `chrome-helper.ts` yang scan folder cache `USERPROFILE/.cache/puppeteer/chrome/` secara otomatis, ambil versi tertinggi, dengan fallback ke system Chrome via PATH. `WebJSAdapter` sekarang terima `chromePath` opsional di constructor dan set sebagai `executablePath` di puppeteer options.
- **Headless Chrome + QR compact** — Tambah `--headless=chrome --disable-gpu` di puppeteer args agar Chrome benar-benar tidak tampil. Ganti `qrcode-terminal` ke `qrcode` package dengan render compact 1-spasi per modul (ukuran QR 50% lebih kecil). Tambah pesan jelas saat `connected` bahwa worker berjalan di background.
- **API Messages** — GET `/api/messages` sekarang support query params `startDate` dan `endDate` (ISO string)

### Fixed

- **CRITICAL: Buat `svelte.config.js`** — Project tidak bisa di-start tanpa file ini. Konfigurasi adapter-node + runes dipindah dari vite.config.ts ke svelte.config.js yang semestinya.
- **CRITICAL: Worker import dotenv** — Tambah `import "dotenv/config"` di `worker/index.ts` agar env vars terbaca saat worker dijalankan.
- **CRITICAL: Status CUID → Name** — `fromStatus`/`toStatus` di timeline update ditampilkan sebagai ID (CUID). Sekarang di-resolve ke nama status via lookup di GET endpoint ticket detail.
- **Seed: Phone number unik** — 3 user seed pakai nomor yang sama (hanya 1 user tersimpan karena `@unique`). Ganti ke nomor unik masing-masing.
- **resolvedAt/closedAt otomatis** — Set `resolvedAt` saat status berubah ke Resolved, `closedAt` saat status ke Closed (di `updateTicket` dan close endpoint).
- **Mask phone number** — Semua tampilan nomor telepon di-masking (hanya 4 digit terakhir terlihat): inbox, ticket detail, settings.
- **Hapus dead code `closeTicket()`** — Fungsi tidak dipanggil dimanapun. Logic close langsung di endpoint `/api/tickets/[id]/close`.
- **Test: ganti `closeTicket` ke `updateTicket`** — Test yang refer `closeTicket` sekarang pakai `updateTicket` langsung.
- **Worker: fix import whatsapp-web.js** — CJS module tidak bisa ESM named import (`import { Client, LocalAuth }`). Ganti ke `createRequire` + `require()`.
- **Worker: lookup source by name** — Ganti env `WHATSAPP_SOURCE_ID` → `WHATSAPP_SOURCE_NAME`. Worker cari source by name (default: "Grup Support IT") bukan by random CUID.

- **F1-1 — Chrome detection**: Worker deteksi Chrome sebelum connect, tampilkan error ramah user + panduan install
- **F1-2 — Auto-reconnect**: Exponential backoff (1.5x, max 60s, 10 attempts) saat disconnect — worker tidak mati diam
- **F1-3 — Status di UI**: Indikator status WhatsApp di header (hijau=connected, kuning=scanning, merah=expired, abu=mati). Poll endpoint `/api/whatsapp/status`
- **F1-4 — Restart QR otomatis**: Saat `auth_failure`, restart + generate QR baru otomatis
- **F2-1/4/6/16 — Error feedback + Toast**: Semua error API tampil sebagai toast. Sukses toast saat tiket dibuat
- **F2-5 — Lookup case-insensitive**: `createTicket()` pakai `toLowerCase()` untuk cocokkan kategori/prioritas
- **F2-7 — Sembunyikan Buat Tiket**: Tombol hanya muncul jika `is_support_related !== false`
- **F2-9 — Zod validation classify API**: Validasi body, max length message/body
- **F2-10 — Confidence formula**: `0.5 + catScore*0.1 + prioScore*0.05` — butuh 3+ keyword capai 0.7
- **F2-11 — Markdown stripping Ollama**: Hapus ```json sebelum `JSON.parse`, cari boundary `{}`
- **F2-12 — Truncate ke Ollama**: Body max 2000 chars, prev messages max 500 chars

### Added

- `qrcode-terminal` — QR code WhatsApp tampil scannable di terminal
- **Inbox → Buat Tiket**: Tombol langsung dari hasil classify, auto-map data
- **PIC assignment**: Dropdown PIC di drawer, form tickets, dan detail tiket
- **Override manual kategori/prioritas/status**: Dropdown editable di detail tiket
- **Toast system**: `src/lib/stores/toast.ts` — global toast success/error/info
- **WhatsApp status endpoint**: `GET /api/whatsapp/status`
- **Restart method**: `adapter.restart()` — destroy + create ulang client
- **Message dedup**: `upsert` dengan `msg.id._serialized` sebagai PK
- **Contact name via public API**: `msg.getContact()` gantikan `_data.notifyName`
- Vitest test suite: 22 tests, 4 files

### Changed

- Full UI refactor to Metronic Tailwind template v9.4.14 design system:
  - Static assets (CSS, JS, KeenIcons, ApexCharts, media) copied to `static/assets/`
  - Theme variables (light/dark), Inter font, component classes (`kt-card`, `kt-btn`, `kt-badge`, `kt-menu`, `kt-table`, `kt-input`, etc.) loaded from `styles.css`
  - Layout refactored: fixed sidebar (280px, collapsible), fixed header (60px) with search/notifications/user, scrollable content area, footer
  - Reusable Svelte 5 components: `Card`, `Button`, `Badge`, `Sidebar`, `Header`
  - Dashboard: Metronic-style KPI cards with icons, bordered cards for categories/activity
  - Inbox: Card-list layout with inline classify, status badges, evidence panel
  - Tickets: Kanban board with Metronic card styling, priority badges, create form
  - Ticket detail: Two-column layout with info header, timeline updates, close action
  - Reports, Settings, Audit: Card + table layouts matching Metronic design patterns

### Added

- Seed script made idempotent (uses `upsert` + `findFirst` — safe to re-run)

- SvelteKit 5 project scaffold with TypeScript, Tailwind CSS v4, adapter-node
- Prisma v7 ORM with SQLite (driver adapter pattern via `better-sqlite3`)
- Database schema: 11 tables (`users`, `whatsapp_sources`, `whatsapp_messages`, `support_tickets`, `support_ticket_messages`, `support_ticket_updates`, `support_categories`, `support_priorities`, `support_statuses`, `support_reports`, `support_report_tickets`, `audit_logs`)
- Seed data: 4 priorities, 8 statuses, 10 categories, 3 PICs/admin, 1 WhatsApp source group
- Modular WhatsApp adapter interface (`WhatsAppReader`) with `WebJSAdapter` implementation (`whatsapp-web.js` + Puppeteer)
- Standalone WhatsApp worker process (`npm run worker`) with session persistence
- Hybrid classifier: rule-based keyword matching + Ollama LLM fallback
- Ticket builder service with duplicate detection and audit logging
- REST API: messages (list, detail, import, classify), tickets (CRUD, updates, close), reports (list, generate daily/weekly/monthly), settings, audit log
- Dashboard UI: KPI cards, top categories, recent activity
- Inbox page: message list with per-message classify button
- Ticket board: kanban grouped by status, create ticket form
- Ticket detail page: full info, messages, timeline, close action
- Reports page: generate and view daily/weekly/monthly recaps, copy to clipboard
- Settings page: view priorities, statuses, categories, PICs, WhatsApp sources
- Audit log page: read-only table with all actions
- Recap engine: daily/weekly/monthly aggregation with structured markdown output
- AGENTS.md with full project documentation
