# AGENTS.md — WhatsApp Tech Support

## Domain

WhatsApp-based Support Management System. Reads support-related WhatsApp conversations, classifies messages, builds tickets, and produces structured recaps.

Core entities: Customer, WhatsApp Source/Group, Message, Support Ticket, Category, Priority, PIC/Technician, Follow-up Note, Recap Report.

## CHANGELOG

Update `CHANGELOG.md` whenever there are project changes.
Anda wajib menerapkan flow ini disetiap perubaan yang dilakukan: Buat rencana implementasi yang akan di terapkan, audit yang akan terpengaruh atas perubahan ini. untuk jadi perbaikan/penyesuaian selanjutnya.


# Phhone Number
use `6281242535927` and `6281111111111` for real number test. 


## ROADMAP

Lihat `ROADMAP.md` untuk rencana implementasi 5 fase: Auth & Security Foundation → Worker Management → Worker Settings → Stats & History → Advanced Features. Juga berisi audit keamanan lengkap, area terdampak, dan matriks data sensitif.

## Stack

- **Runtime**: Node.js
- **Frontend**: SvelteKit (Svelte 5 runes mode)
- **Database**: SQLite (dev) → PostgreSQL (prod) via Prisma v7
- **WhatsApp**: `whatsapp-web.js` + Puppeteer (separate worker process)
- **Styling**: Tailwind CSS v4
- **Validation**: Zod
- **ORM**: Prisma v7 (driver adapter pattern — uses `better-sqlite3` adapter)

## Commands

| Command                | Purpose                                    |
| ---------------------- | ------------------------------------------ |
| `npm run dev`        | Start SvelteKit dev server                 |
| `npm run build`      | Production build                           |
| `npm run preview`    | Preview production build                   |
| `npm run seed`       | Seed database — run once after migration  |
| `npm run worker`     | Start standalone WhatsApp listener process |
| `npm run check`      | Type-check with svelte-check               |
| `npm run test`       | Run unit + integration tests (Vitest)      |
| `npm run test:watch` | Run tests in watch mode                    |

**Order matters**: `npm run seed` before first dev run. Worker runs alongside dev server in separate terminal.

## Architecture must-knows

- **WhatsApp is a separate worker**, not part of SvelteKit — `whatsapp-web.js` needs a persistent browser process that can't live in SvelteKit's request lifecycle. Run `npm run worker` in a second terminal. Writes messages directly to shared SQLite DB. Worker juga menjalankan HTTP API server di `WORKER_API_PORT` (default `3457`) untuk query live data: groups, contacts, messages, profile pics, dan send message. SvelteKit proxy routes (`/api/whatsapp/*`) memanggil worker API ini.
- **Modular WhatsApp adapter** — `src/lib/server/whatsapp/adapter.ts` defines `WhatsAppReader` interface. `WebJSAdapter` is the current implementation. To swap sources (Business API, export file, gateway), implement the same interface without touching ticketing/core logic.
- **Prisma v7 driver adapter** — Uses `@prisma/adapter-better-sqlite3`. `PrismaClient` must be constructed with `{ adapter }`. The `getDb()` singleton in `src/lib/server/db/index.ts` handles the setup. Import `$lib/server/db/index.js` in API routes.
- **Pipeline**: Message → Reader → Classifier → Ticket Builder → Dashboard → Recap

# Template

Gunakan referensi template `E:\PROJECT\YAPAYS\assistanceapy.kts\_ExcludeProject\template\metronic-tailwind-html-demos\dist` layoyt dan tataletaknya

## Project structure

```
src/
  lib/server/
    db/index.ts          — PrismaClient singleton
    whatsapp/
      adapter.ts          — WhatsAppReader interface
      webjs-adapter.ts    — whatsapp-web.js implementation
    classifier/
      index.ts            — hybrid classifier (rules → Ollama fallback)
      rules.ts            — keyword/regex rule-based classification
      ollama.ts           — Ollama LLM classifier
    ticket/
      ticket-builder.ts   — createTicket, updateTicket, closeTicket
    recap/
      index.ts            — generateRecap (daily/weekly/monthly)
  types/index.ts          — ClassificationResult, TicketCreateInput, etc.
  routes/
    api/                  — REST API endpoints
    inbox/                — WhatsApp message inbox page
    tickets/              — Ticket board + detail page
    reports/              — Report viewer + generator
    settings/             — Master data viewer
    audit/                — Audit log viewer
    sources/              — WA group/contact directory + chat viewer
  +layout.svelte          — Sidebar layout with navigation
  +page.svelte            — Dashboard KPIs
worker/index.ts           — Standalone WhatsApp listener process
prisma/schema.prisma      — 11 tables, full schema
prisma/seed.ts            — Master data seed (priorities, statuses, categories, PICs)
```

## Database (11 tables)

`users`, `whatsapp_sources`, `whatsapp_messages`, `support_tickets`, `support_ticket_messages`, `support_ticket_updates`, `support_categories`, `support_priorities`, `support_statuses`, `support_reports`, `support_report_tickets`, `audit_logs`

Key relationships: message → ticket (1:1 via join table), ticket → updates (1:N), report → tickets (M:N)

## Data rules

- **Timezone**: `Asia/Jakarta` (display only — DB stores UTC)
- **Sensitive data** (phone numbers, passwords, tokens, customer info): mask in reports; never display credentials in full; never send to external services without consent
- **Audit log**: required for ticket.create, ticket.status_change, ticket.close, message.classify. Wajib menyertakan `userId`, `ipAddress`, `userAgent`.
- **Soft delete**: never delete messages — use is_active / soft delete columns. Settings entities (users, categories, statuses, priorities, sources) juga soft-delete via `active: false`.
- **Authentication**: Semua `/api/*` route wajib JWT valid (kecuali `/api/auth/login`). Login page di `/login`. Role-based access: `admin` = full, `pic` = tickets + messages, `user` = read-only.
- **Phone numbers**: Mask di API response menggunakan `maskInApi()` helper. Anonimkan sebelum dikirim ke Ollama.
- **Rate limit**: 100 request/menit per IP. Ditingkatkan untuk production.
- **Do not commit**: `.env`, `*.db`, `.session-data/`, `whatsapp-session/`, `generated/`, `node_modules/`

## AI / LLM rules

- **Hybrid classifier**: rule-based first (keyword matching). If confidence < 0.7, falls back to Ollama LLM (`OLLAMA_URL`, `OLLAMA_MODEL` env vars).
- AI assists only — `is_support_related: false` means don't auto-create tickets
- Output format must include `confidence`, `evidence[]`, `uncertainty[]`
- Must not create tickets without clear issue report
- Must not mark issues resolved without confirmation evidence

## API endpoints

```
GET/POST /api/messages[/{id}]
POST /api/messages/import          — Bulk import
POST /api/messages/classify        — Classify a message (or batch by body)
GET/POST/PUT /api/tickets[/{id}]
POST /api/tickets/{id}/updates     — Add status change or note
POST /api/tickets/{id}/close       — Close ticket
GET /api/reports                   — List saved reports
GET /api/reports/support/{daily|weekly|monthly}
POST /api/reports/support/generate — Generate new report
GET /api/settings                  — All master data (categories, priorities, etc.)
GET /api/audit                     — Audit log entries
GET/POST /api/whatsapp/groups     — WA live groups (proxy ke worker)
GET/POST /api/whatsapp/contacts   — WA live contacts (proxy ke worker)
GET /api/whatsapp/chat/{chatId}   — WA chat messages + upsert ke DB
GET /api/whatsapp/pic/{chatId}    — WA profile pic + cache di DB
POST /api/whatsapp/send           — Kirim pesan balasan via worker
POST /api/chat/analyze            — Analisa AI batch messages
```

## UI pages

| Route             | Content                                                                                                  |
| ----------------- | -------------------------------------------------------------------------------------------------------- |
| `/`             | Dashboard KPIs (today, open, critical, resolved, top categories)                                         |
| `/inbox`        | WhatsApp messages with classify button per message                                                       |
| `/tickets`      | Kanban board grouped by status, create ticket form                                                       |
| `/tickets/[id]` | Ticket detail: messages, timeline, close action                                                          |
| `/reports`      | Generate (daily/weekly/monthly) and view saved reports                                                   |
| `/settings`     | View priorities, statuses, categories, PICs, WhatsApp sources                                            |
| `/sources`      | Daftar grup & kontak WA (split panel: daftar kiri, viewer percakapan + analisa AI + kirim balasan kanan) |
| `/audit`        | Read-only audit log table                                                                                |

## Validation rules

**Pre-ticket**: clear issue exists, source message + timestamp present, summary written, not duplicate of active ticket.

**Pre-recap**: period defined, tickets scoped correctly, statuses current, sensitive data excluded.

## Environment variables

| Variable                 | Default                     | Purpose                                       |
| ------------------------ | --------------------------- | --------------------------------------------- |
| `DATABASE_URL`         | `file:./dev.db`           | SQLite database path                          |
| `OLLAMA_URL`           | `http://localhost:11434`  | Ollama endpoint                               |
| `OLLAMA_MODEL`         | `llama3.2`                | LLM model for AI classification               |
| `WHATSAPP_SOURCE_NAME` | `Grup Support IT`         | Nama source WhatsApp dari seed                |
| `WHATSAPP_PHONE`       | (wajib diisi)               | Nomor telepon default untuk source seed       |
| `WORKER_API_PORT`      | `3457`                    | Port HTTP API worker untuk query live WA data |
| `WORKER_API_URL`       | `http://127.0.0.1:3457`   | Worker API URL untuk proxy routes             |
| `JWT_SECRET`           | (wajib diisi di production) | Secret key untuk JWT session                  |

# Playwright-CLI Operational Rules (No-Screenshot Mode)

You are an AI Agent equipped with `playwright-cli`. To optimize token usage, maximize speed, and ensure high accuracy, **you are strictly forbidden from taking screenshots (`screenshot`)**. You must analyze web pages purely through textual structure, accessibility trees, and layout bounding boxes.

Follow these strict execution rules:

### 1. Page Analysis Strategy

* **Primary Tool:** Always use `playwright-cli snapshot` to read the state, layout, and text contents of the page.
* **Layout & Positioning:** Use `playwright-cli snapshot --boxes` if you need to analyze the physical layout, overlap issues, alignment, or responsive design bounds.
* **Component Focus:** If the page is large, isolate your view by passing specific selectors to the snapshot command (e.g., `playwright-cli snapshot ".navbar"` or `playwright-cli snapshot "#footer"`).
* **Text Extraction:** For quick text verification (e.g., checking for success or error messages), use JavaScript evaluation: `playwright-cli eval "document.body.innerText"`.

### 2. Element Interaction Policy

* **Use Short IDs:** Rely strictly on the short element IDs (e.g., `e1`, `e2`, `e15`) generated by the YAML snapshot output to perform interactions like `click`, `fill`, or `hover`.
* **No Visual Guessing:** Never try to guess click coordinates based on historical context; always refresh the snapshot state if the page transitions or reloads.

### 3. Error Handling & Fallbacks

* If a target element ID disappears, do not attempt to blind-click. Immediately run a new `playwright-cli snapshot` to capture the updated DOM state.
* If a structural breakdown occurs, analyze the bounding box dimensions (`[box=x,y,w,h]`) from the snapshot output to detect elements with zero height/width or clipping issues.

### 4. Strict Constraint

* **NEVER** execute `playwright-cli screenshot`.
* **NEVER** request a visual image file for layout debugging.
* All visual verification must be reverse-engineered using text-based tree structures and geometric layout boxes.


## Menggunakan Puppeteer untuk otomatisasi WhatsApp berisiko terkena blokir (ban) 
- Sembunyikan Indikator BotGunakan plugin puppeteer-extra dengan puppeteer-extra-plugin-stealth. Plugin ini menyembunyikan properti JavaScript yang biasanya mengungkap browser otomatis.
  `npm install puppeteer puppeteer-extra puppeteer-extra-plugin-stealth`
- Gunakan Sesi yang Ada (Persistent Session) `./whatsapp-session` Simpan sesi di direktori ini
- Tambahkan ini sebelum mengirim pesan berikutnya await delay(Math.floor(Math.random() * 5000) + 3000); 