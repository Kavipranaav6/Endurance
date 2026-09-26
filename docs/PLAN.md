# PLAN — StockSense

Repo: `Kavipranaav6/Endurance`

| # | github | email |
|---|---|---|
| M1 | harivarman-007 | harivarman1234@gmail.com |
| M2 | kavipranaav6 | kavipranaav6@gmail.com |
| M3 | prathes2k6 | prathes2k6@gmail.com |
| M4 | Bathri-Narayanan-123 | bathrinarayanan53@gmail.com |

Each phase is owned by one member end-to-end (design questions → code → docs update → commit →
PR). Ownership is fixed here so commit history reflects real, uneven work per person — see
`CONTRIBUTING.md` for why we're not padding commit counts artificially.

## Phase 0 — Foundation (Owner: M1)
Monorepo scaffold (pnpm + Turborepo), Prisma schema skeleton (Warehouse, Location, Product,
StockMove enums only — no business logic yet), Tailwind config with the UI_GUIDELINES tokens,
CI lint/build check, empty Fastify + tRPC server that boots.

## Phase 1 — Auth (Owner: M1)
Signup, login, JWT access/refresh, OTP-based password reset (email + Redis TTL), protected
route middleware, redirect to Dashboard on success.

## Phase 2 — Ledger engine & core data model (Owner: M2)
`StockMove` table (type: IN/OUT/INTERNAL/ADJUSTMENT, state: draft/waiting/ready/done/cancelled),
reference generator (`<Warehouse>/<Operation>/<auto-id>`, e.g. `WH/IN/0001`), derived stock view
(on-hand, free-to-use per product/location), WebSocket broadcast on every ledger write.

## Phase 3 — Dashboard (Owner: M3)
KPI tiles (Total products, Low/Out of stock, Pending receipts, Pending deliveries, Scheduled
transfers), dynamic filters (doc type / status / warehouse / category), live updates over the
Phase 2 WebSocket channel, Receipt/Delivery quick-access widgets as in the wireframe.

## Phase 4 — Receipts (Owner: M1)
List view + kanban toggle, search by reference/contact, create/validate/print/cancel, product
line items, `Draft → Ready → Done` flow, auto reference numbering, print-on-done.

## Phase 5 — Delivery Orders (Owner: M2)
Mirrors Phase 4 for outbound: `Draft → Waiting → Ready → Done`, alert on the line row if a
product isn't in stock, stock decreases on validate.

## Phase 6 — Internal Transfers & Stock Adjustments (Owner: M3)
Transfers between locations (stock total unchanged, location updated), adjustments (recorded
vs. counted quantity, auto-log the delta as a ledger entry).

## Phase 7 — Move History (Owner: M4)
Unified ledger view (list + kanban), color coding (late = red, waiting = amber/neutral,
on-time/done = green), search by reference/contact, groups multi-product references correctly.

## Phase 8 — Settings & Product Management (Owner: M4)
Warehouse CRUD (name, short code, address), Location CRUD (name, short code, parent warehouse),
Product CRUD (name, SKU, category, unit of measure, reorder rules), low-stock alert wiring.

## Phase 9 — Polish, QA, deploy (All members, smallest individual patches)
Empty states, loading states, responsive pass, Docker Compose for local dev, deployment,
demo script rehearsal.
