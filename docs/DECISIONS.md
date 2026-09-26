# Architecture & Implementation Decisions — StockSense

Log deviations from `docs/ARCHITECTURE.md` or `docs/PLAN.md` here.

## Phase 0 — Foundation
- No deviations from `ARCHITECTURE.md` or `PLAN.md`.
- Placed `schema.prisma` in `apps/api/prisma/schema.prisma` to keep the Prisma client generation aligned with the Fastify tRPC service layer without requiring an extra db package.
