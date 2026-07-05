# Changelog

Maintain `CHANGELOG.md` according to Keep a Changelog 1.1.0:
https://keepachangelog.com/en/1.1.0/
Use `Unreleased`, newest-first version order, `YYYY-MM-DD` release dates, and standard categories: `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`. Keep entries human-readable and do not dump raw git logs.

## Unreleased

### Added
- **Session persistence** — `getSessionInfo()` dan `clearSession()` di `WhatsAppReader` interface & `WebJSAdapter`; worker endpoint `GET /api/session/info` dan `POST /api/session/clear`; proxy SvelteKit
- **Session UI** di Settings → Connection: status saved session (Available/None), created date, file size; toggle Session Persistence; tombol Clear Session dengan konfirmasi
- **Auto-clear session**: saat `wa_session_persistence = false`, session otomatis dihapus saat disconnect
- Seed: `wa_session_persistence = true`

### Changed
- Settings → Connection: load `waSettings` juga untuk session persistence toggle
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
