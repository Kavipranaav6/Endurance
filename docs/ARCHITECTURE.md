# ARCHITECTURE — StockSense

## Monorepo layout
```
apps/web        React + TypeScript + Vite frontend
apps/api        Fastify + tRPC backend
packages/schemas  Zod schemas shared by web and api
```

## Data model (core tables)
- **Warehouse**: id, name, shortCode, address
- **Location**: id, name, shortCode, warehouseId
- **Product**: id, name, sku, categoryId, unitOfMeasure, reorderPoint, reorderQty
- **StockMove** (the ledger — append-only):
  - id, reference (`WH/IN/0001` style, auto-incrementing per warehouse+type)
  - type: `IN | OUT | INTERNAL | ADJUSTMENT`
  - state: `draft | waiting | ready | done | cancelled`
  - fromLocationId (nullable for IN), toLocationId (nullable for OUT)
  - productId, quantity, scheduleDate, doneAt, responsibleUserId, contact
  - Once `state = done`, the row is immutable. Corrections are new ledger entries, never edits.

## Derived state (never stored directly)
- **On-hand stock** per product/location = sum of `done` StockMove quantities in minus out at
  that location.
- **Free-to-use** = on-hand minus quantity reserved by any `draft`/`waiting`/`ready` outbound
  move for that product.
- Implemented as a Postgres view (or materialized view refreshed on write for performance) —
  never as a mutable `quantity` column anywhere. This is the load-bearing design decision for
  the whole app; don't add a shortcut column that bypasses it.

## Reference numbering
`<WarehouseShortCode>/<IN|OUT|INT|ADJ>/<zero-padded sequence>`, sequence increments per
warehouse + operation type, generated server-side inside the same transaction that creates the
StockMove row (never client-generated).

## Real-time
- WebSocket channel per authenticated session.
- Every ledger state transition (`draft→waiting→ready→done`) publishes an event; the Dashboard,
  Receipts/Delivery kanban, and Move History all subscribe and patch their local TanStack Query
  cache instead of refetching.
- Low-stock crossing publishes a separate `alert` event consumed by a nav badge + toast.

## Auth
- JWT access token (short-lived) + refresh token (httpOnly cookie).
- Password reset: generate 6-digit OTP, store in Redis with a 5–10 minute TTL keyed by user id,
  email it, verify against Redis on submit, invalidate after use or expiry.

## API layer
- tRPC routers per domain: `auth`, `warehouse`, `location`, `product`, `receipt`, `delivery`,
  `transfer`, `adjustment`, `moveHistory`, `dashboard`.
- Every mutation input is a Zod schema from `packages/schemas`, reused unmodified on the
  frontend form validation — one schema, one source of truth.

## Stretch: offline-first PWA (Phase 9+, only if core phases are all signed off)
- Service worker caches the app shell.
- Picking/packing actions taken offline are queued in IndexedDB with a client-generated
  idempotency key, replayed against the ledger API on reconnect, server dedupes on the key.
