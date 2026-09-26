import { router, publicProcedure } from "../trpc.js";
import { z } from "zod";
import {
  CreateStockMoveInputSchema,
  TransitionStockMoveInputSchema,
  DerivedStockQuerySchema,
} from "@stocksense/schemas";
import {
  createStockMove,
  transitionStockMove,
} from "../lib/ledger/ledgerEngine.js";
import {
  computeDerivedStock,
  memoryStockMoves,
} from "../lib/ledger/derivedStock.js";
import { prisma } from "../lib/prisma.js";
import { ensureSeedData } from "./dashboard.js";

export const ledgerRouter = router({
  createMove: publicProcedure
    .input(CreateStockMoveInputSchema)
    .mutation(async ({ input, ctx }) => {
      const responsibleUserId = ctx.user?.userId;
      return await createStockMove(input, responsibleUserId);
    }),

  transitionMove: publicProcedure
    .input(TransitionStockMoveInputSchema)
    .mutation(async ({ input }) => {
      return await transitionStockMove(input.id, input.toState);
    }),

  getDerivedStock: publicProcedure
    .input(DerivedStockQuerySchema.optional())
    .query(async ({ input }) => {
      return await computeDerivedStock(input || {});
    }),

  listMoves: publicProcedure
    .input(
      z
        .object({
          type: z.enum(["IN", "OUT", "INTERNAL", "ADJUSTMENT"]).optional(),
          state: z
            .enum(["draft", "waiting", "ready", "done", "cancelled"])
            .optional(),
          productId: z.string().optional(),
          search: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      ensureSeedData();
      if (process.env.DATABASE_URL) {
        try {
          return await prisma.stockMove.findMany({
            where: {
              ...(input?.type ? { type: input.type } : {}),
              ...(input?.state ? { state: input.state } : {}),
              ...(input?.productId ? { productId: input.productId } : {}),
              ...(input?.search
                ? {
                    OR: [
                      { reference: { contains: input.search, mode: "insensitive" } },
                      { contact: { contains: input.search, mode: "insensitive" } },
                    ],
                  }
                : {}),
            },
            include: {
              product: true,
              fromLocation: true,
              toLocation: true,
            },
            orderBy: { createdAt: "desc" },
          });
        } catch {
          // fallback to memory
        }
      }

      // Memory fallback search
      return memoryStockMoves
        .filter((m) => {
          if (input?.type && m.type !== input.type) return false;
          if (input?.state && m.state !== input.state) return false;
          if (input?.productId && m.productId !== input.productId) return false;
          if (input?.search) {
            const s = input.search.toLowerCase();
            const refMatch = m.reference?.toLowerCase().includes(s);
            const contactMatch = m.contact?.toLowerCase().includes(s);
            if (!refMatch && !contactMatch) return false;
          }
          return true;
        })
        .reverse();
    }),

  getMoveById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      if (process.env.DATABASE_URL) {
        try {
          return await prisma.stockMove.findUnique({
            where: { id: input.id },
            include: {
              product: true,
              fromLocation: true,
              toLocation: true,
            },
          });
        } catch {
          // fallback
        }
      }
      return memoryStockMoves.find((m) => m.id === input.id) || null;
    }),
});
