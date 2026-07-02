# Changelog

Maintain `CHANGELOG.md` according to Keep a Changelog 1.1.0:
https://keepachangelog.com/en/1.1.0/
Use `Unreleased`, newest-first version order, `YYYY-MM-DD` release dates, and standard categories: `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`. Keep entries human-readable and do not dump raw git logs.

## Unreleased

### Added

- Vitest test suite: 4 test files (22 tests) covering classifier rules, Ollama classifier, ticket builder (create/update/close), and recap engine
- `OLLAMA_URL`/`OLLAMA_MODEL` env vars now read at call time in `ollama.ts` (not at import time) — enables reliable testing with per-test env var overrides

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
