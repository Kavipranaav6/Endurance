# StockSense — Antigravity Build Prompt

Paste this whole file as your first message to Antigravity in the repo `Kavipranaav6/Endurance`.

## Context
You are building **StockSense**, an Inventory Management System for an Odoo hackathon.
Read `docs/PLAN.md`, `docs/TASKS.md`, `docs/ARCHITECTURE.md`, `docs/UI_GUIDELINES.md`, and
`docs/CONTRIBUTING.md` in full before writing any code. These five files are the source of
truth — if anything I say later conflicts with them, ask me which one wins.

## Non-negotiable working rules
1. **No browser automation and no self-taken screenshots.** Do not use any browser tool to
   "verify" the UI yourself. After finishing a phase, stop and describe in plain text what
   you built and which files changed. I will review it manually in my own browser.
2. **Ask before building any new UI component for the first time.** The first time you touch
   a KPI card, a receipt/delivery table row, a kanban card, a modal, a sidebar nav item, or a
   form group, stop and give me 2–3 short text-described layout options. Wait for me to pick
   one before writing code. Never guess and ship a first-of-its-kind component.
3. **One phase at a time.** Only work on the phase I explicitly tell you to start. Fully
   finish it and get my sign-off before touching the next phase's files.
4. **Keep the docs alive.** At the end of every phase: check off the completed items in
   `docs/TASKS.md`, and if you deviated from `docs/ARCHITECTURE.md` or `docs/PLAN.md` for any
   reason, log a one-line entry in `docs/DECISIONS.md` explaining why.
5. **Commit only the phase you were told to build.** Follow the branch/commit convention in
   `docs/CONTRIBUTING.md` exactly. Do not bundle two phases into one commit, and do not commit
   on behalf of a phase owner other than the one currently working.
6. Restate the phase's scope back to me in 3 bullets before you start coding it. If I don't
   correct you, proceed.

## Design language (strict — read docs/UI_GUIDELINES.md for the full spec)
- White / near-white background always. No dark mode by default.
- No neon colors, no purple-blue "AI-generated dashboard" gradients, no glassmorphism, no
  glowing shadows, no emoji anywhere in the UI.
- One accent color maximum (near-black/charcoal or a single muted brand color) plus neutrals.
- Professional typeface only: Inter or IBM Plex Sans. No decorative or rounded display fonts.
- Symmetric grid, consistent spacing scale, aligned columns — this should read like a
  professional ERP (Odoo, Linear, Notion), not a consumer app or a hackathon demo.
- Simple line icons only (Lucide). No illustrations, no 3D icons, no stock photography.
- Data-heavy screens (Receipts, Delivery, Move History) are dense, tabular, and calm — not
  card-and-gradient dashboards.

## Tech stack — use exactly this
- **Monorepo:** pnpm workspaces + Turborepo (`apps/web`, `apps/api`, `packages/schemas`)
- **Frontend:** React 19 + TypeScript + Vite, TanStack Router, TanStack Query, Zustand for
  local UI state, Tailwind CSS (configured to the tokens in UI_GUIDELINES.md, not defaults),
  shadcn/ui as unstyled primitives only, Recharts for the dashboard KPIs, React Hook Form + Zod.
- **Backend:** Node.js + Fastify + tRPC (shared Zod schemas from `packages/schemas` — the same
  validation runs on both client and server, so a bad request can't reach the ledger).
- **Database:** PostgreSQL + Prisma.
- **The core differentiator — an append-only Stock Ledger:** every Receipt, Delivery, Internal
  Transfer and Adjustment writes an immutable `StockMove` row. There is no "quantity" column
  you update in place anywhere. "On-hand" and "free to use" per product/location are always a
  *derived* view computed from the ledger (materialized view refreshed via Postgres trigger, or
  computed on read for the hackathon timeline). This mirrors how Odoo's own `stock.move` /
  `stock.quant` model actually works internally — call this out explicitly in the demo.
- **Real-time:** a WebSocket channel (`ws` or Socket.IO) broadcasts ledger writes so the
  Dashboard counters and the Move History kanban update live with zero refresh, during the demo.
- **Low-stock alerts:** Postgres `LISTEN/NOTIFY` on the derived stock view → pushed over the
  same WebSocket channel → toast + red badge in the nav.
- **Auth:** JWT access/refresh tokens, OTP password reset via email (Nodemailer), OTP codes
  stored in Redis with a short TTL.
- **Stretch (only after every core phase is done and signed off):** an offline-first PWA mode
  for the Warehouse Staff persona — service worker + IndexedDB action queue so picking/packing
  can happen with no signal and syncs to the ledger when connectivity returns.

## Why this stack (for your own memory, and for the demo pitch)
- The ledger design is the single most "Odoo-native" thing you can build — it's not a generic
  CRUD inventory app, it's the same accounting-style pattern Odoo itself uses.
- tRPC + shared Zod schemas removes an entire class of live-demo bugs (mismatched request
  shapes) without hand-writing an OpenAPI spec under time pressure.
- The WebSocket live-update is a genuine "wow" moment for judges: open two browser windows,
  validate a receipt in one, watch stock and the dashboard update in the other with no refresh.
- The offline PWA stretch directly answers the "Warehouse Staff" persona in the problem
  statement, which most competing teams will ignore.

## Start here
Begin with **Phase 0** only, owned by `harivarman-007`. Do not scaffold anything from a later
phase. When Phase 0 is done, stop and wait for my review.
