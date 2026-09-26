import { router, publicProcedure } from "../trpc.js";

export const appRouter = router({
  health: publicProcedure.query(() => {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "stocksense-api",
    };
  }),
});

export type AppRouter = typeof appRouter;
