import { router, publicProcedure } from "../trpc.js";
import { authRouter } from "./auth.js";
import { ledgerRouter } from "./ledger.js";
import { dashboardRouter } from "./dashboard.js";
import { receiptRouter } from "./receipt.js";
import { deliveryRouter } from "./delivery.js";
import { transferRouter, adjustmentRouter } from "./transfer.js";

export const appRouter = router({
  health: publicProcedure.query(() => {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "stocksense-api",
    };
  }),
  auth: authRouter,
  ledger: ledgerRouter,
  dashboard: dashboardRouter,
  receipt: receiptRouter,
  delivery: deliveryRouter,
  transfer: transferRouter,
  adjustment: adjustmentRouter,
});

export type AppRouter = typeof appRouter;
