import { router, publicProcedure } from "../trpc.js";
import { authRouter } from "./auth.js";
import { ledgerRouter } from "./ledger.js";

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
});

export type AppRouter = typeof appRouter;
