# TASKS — StockSense

Check items off as they land. Antigravity: update this file at the end of every phase.

## Phase 0 — Foundation
- [x] `pnpm-workspace.yaml` + Turborepo pipeline (`dev`, `build`, `lint`, `typecheck`)
- [x] `apps/api` Fastify server boots with a health-check route
- [x] `apps/web` Vite + React shell boots, Tailwind wired to UI_GUIDELINES tokens
- [x] `packages/schemas` with placeholder Zod types shared FE/BE
- [x] Prisma schema: `Warehouse`, `Location`, `Product`, `StockMove` (fields + enums only)
- [x] CI workflow: lint + typecheck + build on PR

## Phase 1 — Auth
- [x] Signup (email, password, confirm password)
- [x] Login (id/email + password) → JWT access + refresh
- [x] Forgot password → OTP email → verify OTP → reset
- [x] Protected route wrapper on the frontend, redirect unauth'd users to Login
- [x] Redirect to Dashboard after login

## Phase 2 — Ledger engine
- [x] `StockMove` write path (validated, immutable once `done`)
- [x] Reference generator: `<WarehouseCode>/<IN|OUT>/<zero-padded-id>`
- [x] Derived stock view: on-hand + free-to-use per product per location
- [x] WebSocket server broadcasts on every state transition
- [x] Postgres trigger/notify for low-stock threshold crossing

## Phase 3 — Dashboard
- [x] KPI tiles: total products, low/out of stock, pending receipts, pending deliveries, scheduled transfers
- [x] Filters: doc type, status, warehouse/location, category
- [x] Receipt/Delivery widgets ("N to receive", "N to deliver") matching the wireframe
- [x] Live update via WebSocket, no manual refresh

## Phase 4 — Receipts
- [ ] List view with search by reference & contact
- [ ] Kanban view toggle, grouped by status
- [ ] New receipt form: supplier, schedule date, responsible (defaults to logged-in user)
- [ ] Add/remove product lines with quantity
- [ ] Validate → ledger IN move created, stock increases
- [ ] Print, Cancel actions
- [ ] Status badge: Draft / Ready / Done

## Phase 5 — Delivery Orders
- [ ] List + kanban, search by reference & contact
- [ ] New delivery form: delivery address, schedule date, responsible, operation type
- [ ] Row-level warning if a line's product isn't currently in stock
- [ ] Validate → ledger OUT move created, stock decreases
- [ ] Status badge: Draft / Waiting / Ready / Done

## Phase 6 — Transfers & Adjustments
- [ ] Internal transfer form (from-location → to-location, product, quantity)
- [ ] Transfer does not change total stock, only location
- [ ] Adjustment form: select product/location, enter counted quantity
- [ ] System computes delta vs. recorded quantity and logs it as a ledger entry

## Phase 7 — Move History
- [ ] Unified list of all ledger moves (reference, date, from, to, contact, quantity, status)
- [ ] Kanban view toggle by status
- [ ] Color coding: late (schedule date < today) = red, waiting = neutral/amber, done = green
- [ ] Search by reference & contact
- [ ] Multi-product references expand into multiple rows correctly

## Phase 8 — Settings & Products
- [ ] Warehouse CRUD (name, short code, address)
- [ ] Location CRUD (name, short code, parent warehouse)
- [ ] Product CRUD (name, SKU/code, category, unit of measure, initial stock, reorder rule)
- [ ] Low-stock alert badge wired into nav + dashboard

## Phase 9 — Polish & Deploy
- [ ] Empty/loading/error states across all list views
- [ ] Responsive pass (tablet width minimum, this is a warehouse-floor app)
- [ ] Docker Compose (web, api, postgres, redis)
- [ ] Deploy (Railway/Render/Vercel — pick one, document in DECISIONS.md)
- [ ] Demo script: the exact click-path from the "Simplified Example" in the problem statement
