# Architecture & Implementation Decisions — StockSense

Log deviations from `docs/ARCHITECTURE.md` or `docs/PLAN.md` here.

## Phase 0 — Foundation
- No deviations from `ARCHITECTURE.md` or `PLAN.md`.
- Placed `schema.prisma` in `apps/api/prisma/schema.prisma` to keep the Prisma client generation aligned with the Fastify tRPC service layer without requiring an extra db package.

## Phase 1 — Auth
- Layout choice: Approved Option A (Stacked Compact) applied across all form groups.
- Local resilience: Implemented graceful in-memory fallbacks for Redis OTP storage and Prisma connection checks when Postgres/Redis daemons are offline in local development.

## Phase 2 — Ledger Engine
- No deviations from `ARCHITECTURE.md` or `PLAN.md`.
- OperationSequence model: Added `OperationSequence` to schema to atomically generate monotonically incrementing zero-padded references per warehouse and operation type (`<WarehouseShortCode>/<IN|OUT|INT|ADJ>/<0001>`).
- WebSocket architecture: Integrated `@fastify/websocket` directly on `/ws` route broadcasting ledger events (`LEDGER_WRITE`, `STATE_TRANSITION`, `LOW_STOCK_ALERT`).
- Immutability guarantee: Enforced strict server-level immutability rejecting any state mutations or content alterations on moves marked `done` or `cancelled`.

## Phase 3 — Dashboard
- Layout choices (Approved):
  - KPI Tiles: Option 1 (Calm ERP Metric Card) with subdued 12px uppercase labels, 24px numerical values, discrete Lucide icons, and quiet red alert styling when threshold is crossed.
  - Filter Bar: Option 1 (Integrated Tooling Bar) with 40px height toolbar, segmented dropdowns, and live WebSocket connection indicator.
  - Operational Widgets: Option 1 (Split Dual-Panel Ledger Card) for Receipts ("N to receive") and Deliveries ("N to deliver") with dense tabular preview rows and action buttons.
- Ledger consumption: Reused Phase 2's `computeDerivedStock` and ledger queries directly; zero duplicate stock calculation logic.

## Phase 4 — Receipts
- Layout choices (Approved):
  - Table Row: Option 1 (Dense ERP Data Row) with 44px (h-11) height, monospace reference, supplier, putaway destination, date, item/quantity counts, and status pills.
  - Kanban Card: Option 1 (Structured Header Card) with top accent border matching state, partner contact, location, item count + total quantity, and date.
  - New Receipt Form: Option 1 (Odoo/Linear Standard Header + Tabular Lines) with 2-column header (Option A FormGroups), dynamic tabular product lines with add/remove rows, and status progression action bar (`Draft` → `Ready` → `Done`).
- Ledger integration: All receipt creation and validation strictly route through Phase 2 ledger engine (`createStockMove` and `transitionStockMove`), guaranteeing immutability upon reaching `done` state and real-time broadcasting.
- Multi-line receipt architecture: Multi-line inbound shipments share the atomic sequential reference (`<WarehouseShortCode>/IN/<0001>`) generated via Phase 2 `generateStockMoveReference`.
- Printable Voucher: Integrated printable Goods Receipt Voucher (GRV) layout triggering cleanly via browser `window.print()` with sign-off inspection blocks.
