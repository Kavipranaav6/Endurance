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

## Phase 5 — Delivery Orders
- Layout choices (Approved):
  - Table Row: Option 1 (Dense ERP Data Row) with 44px (h-11) height, monospace reference, customer/contact, picking source location, date, item/quantity counts, shortage indicator tag, and status pills.
  - Kanban Card: Option 1 (Structured Header Card) with top accent border matching lifecycle state (`Draft`, `Waiting`, `Ready`, `Done`, `Cancelled`), customer name, source location, and real-time inventory shortage warning flag.
  - New Delivery Form: Option 1 (Odoo/Linear Standard Header + Tabular Lines) with 2-column header (Customer, Delivery Address, Source Warehouse, Picking Location, Scheduled Date), dynamic line item management, and multi-step action bar (`Draft → Waiting → Ready → Done`).
  - Row-Level Stock Warning: Option 1 (Dense ERP Inline Warning Tag) displaying exact free-to-use availability on each product line with amber/red deficit alert (`⚠️ Shortage: X on-hand (deficit: Y)`) preventing invalid dispatch.
- Outbound Ledger writes: Outbound shipments strictly write immutable `OUT` moves through Phase 2 ledger engine (`createStockMove`, `transitionStockMove`), decrementing derived stock and broadcasting live WebSocket notifications upon validation.
- Printable Delivery Note: Integrated packing slip template supporting `window.print()` with carrier and customer receipt sign-off blocks.

## Phase 6 — Internal Transfers & Stock Adjustments
- Layout choices (Approved):
  - Internal Transfer Form: Option 1 (Linear/Odoo Dual Location Selector + Line Items) with Source Location `→` Destination Location picker, real-time source inventory validation, and `Draft → Ready → Done` lifecycle.
  - Stock Adjustment Form: Option 1 (Inventory Count Sheet with Real-Time Delta Preview) allowing warehouse floor staff to enter physical counted quantities, previewing calculated discrepancy deltas (+/- units) with audit reasons before committing.
  - Page Architecture: Unified tabbed screen with Internal Transfers (List / Kanban views) and Stock Adjustments audit log.
- Ledger integration:
  - Transfers: Strictly writes `INTERNAL` moves through Phase 2 ledger engine (`createStockMove`, `transitionStockMove`) with reference `<WH>/INT/<0001>`. The derived stock engine confirms company-wide inventory total is conserved while location bins update.
  - Adjustments: Commits discrepancy deltas as immutable ledger `ADJUSTMENT` moves (`<WH>/ADJ/<0001>`), attributing surplus gains to `toLocationId` and deficit shrinkage to `fromLocationId`.
