# Architecture & Implementation Decisions — StockSense

Log deviations from `docs/ARCHITECTURE.md` or `docs/PLAN.md` here.

## Phase 0 — Foundation
- No deviations from `ARCHITECTURE.md` or `PLAN.md`.
- Placed `schema.prisma` in `apps/api/prisma/schema.prisma` to keep the Prisma client generation aligned with the Fastify tRPC service layer without requiring an extra db package.

## Phase 1 — Auth
- Layout choice: Approved Option A (Stacked Compact) applied across all form groups.
- Local resilience: Implemented graceful in-memory fallbacks for Redis OTP storage and Prisma connection checks when Postgres/Redis daemons are offline in local development.
