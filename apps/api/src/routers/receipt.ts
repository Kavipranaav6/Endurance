import { router, publicProcedure } from "../trpc.js";
import { z } from "zod";
import {
  CreateReceiptInputSchema,
  ReceiptSummary,
} from "@stocksense/schemas";
import {
  createStockMove,
  transitionStockMove,
} from "../lib/ledger/ledgerEngine.js";
import { generateStockMoveReference } from "../lib/ledger/referenceGenerator.js";
import {
  memoryStockMoves,
  memoryProducts,
  memoryWarehouses,
  memoryLocations,
} from "../lib/ledger/derivedStock.js";
import { prisma } from "../lib/prisma.js";
import { ensureSeedData } from "./dashboard.js";

export const receiptRouter = router({
  getMetadata: publicProcedure.query(async () => {
    ensureSeedData();
    let warehouses: any[] = [];
    let locations: any[] = [];
    let products: any[] = [];

    if (process.env.DATABASE_URL) {
      try {
        [warehouses, locations, products] = await Promise.all([
          prisma.warehouse.findMany(),
          prisma.location.findMany(),
          prisma.product.findMany(),
        ]);
      } catch {
        warehouses = memoryWarehouses;
        locations = memoryLocations;
        products = memoryProducts;
      }
    } else {
      warehouses = memoryWarehouses;
      locations = memoryLocations;
      products = memoryProducts;
    }

    return {
      warehouses: warehouses.map((w) => ({
        id: w.id,
        name: w.name,
        shortCode: w.shortCode,
      })),
      locations: locations.map((l) => ({
        id: l.id,
        name: l.name,
        warehouseId: l.warehouseId,
      })),
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        unitOfMeasure: p.unitOfMeasure || "Units",
      })),
    };
  }),
  create: publicProcedure
    .input(CreateReceiptInputSchema)
    .mutation(async ({ input, ctx }) => {
      const responsibleUserId = ctx.user?.userId || input.responsibleUserId || null;

      // 1. Generate one single reference for this receipt: <Warehouse>/IN/<0001>
      const reference = await generateStockMoveReference(
        input.warehouseId,
        "IN"
      );

      const createdMoves: any[] = [];

      // 2. Route each product line through the Phase 2 ledger engine
      for (const line of input.lines) {
        const move = await createStockMove(
          {
            warehouseId: input.warehouseId,
            type: "IN",
            productId: line.productId,
            quantity: line.quantity,
            toLocationId: input.toLocationId,
            scheduleDate: input.scheduleDate,
            contact: input.contact,
            initialState: input.initialState || "draft",
          },
          responsibleUserId || undefined
        );

        // Ensure the move shares the master receipt reference
        if (move.reference !== reference) {
          move.reference = reference;
          if (process.env.DATABASE_URL) {
            try {
              await prisma.stockMove.update({
                where: { id: move.id },
                data: { reference },
              });
            } catch {
              // memory handled
            }
          }
        }

        createdMoves.push(move);
      }

      return {
        reference,
        moves: createdMoves,
        itemCount: createdMoves.length,
        totalQuantity: createdMoves.reduce((acc, m) => acc + m.quantity, 0),
      };
    }),

  list: publicProcedure
    .input(
      z
        .object({
          search: z.string().optional(),
          state: z.enum(["ALL", "draft", "waiting", "ready", "done", "cancelled"]).optional(),
        })
        .optional()
    )
    .query(async ({ input }): Promise<ReceiptSummary[]> => {
      ensureSeedData();
      let moves: any[] = [];

      if (process.env.DATABASE_URL) {
        try {
          moves = await prisma.stockMove.findMany({
            where: {
              type: "IN",
              ...(input?.state && input.state !== "ALL" ? { state: input.state } : {}),
            },
            include: {
              product: true,
              toLocation: { include: { warehouse: true } },
            },
            orderBy: { createdAt: "desc" },
          });
        } catch {
          moves = memoryStockMoves.filter((m) => m.type === "IN");
        }
      } else {
        moves = memoryStockMoves.filter((m) => m.type === "IN");
      }

      // Group moves by reference to represent multi-line receipts
      const groups = new Map<string, any[]>();
      for (const move of moves) {
        const ref = move.reference;
        if (!groups.has(ref)) {
          groups.set(ref, []);
        }
        groups.get(ref)!.push(move);
      }

      const summaries: ReceiptSummary[] = [];

      for (const [ref, refMoves] of groups.entries()) {
        const first = refMoves[0];
        const toLoc =
          first.toLocation ||
          memoryLocations.find((l) => l.id === first.toLocationId) || {
            name: "Default Location",
            warehouseId: "wh-main",
          };
        const wh =
          toLoc.warehouse ||
          memoryWarehouses.find((w) => w.id === toLoc.warehouseId) || {
            name: "Main Warehouse",
          };

        const lines = refMoves.map((m) => {
          const prod =
            m.product ||
            memoryProducts.find((p) => p.id === m.productId) || {
              name: "Product",
              sku: "SKU",
              unitOfMeasure: "Units",
            };
          return {
            productId: m.productId,
            productName: prod.name,
            sku: prod.sku,
            quantity: m.quantity,
            unitOfMeasure: prod.unitOfMeasure || "Units",
          };
        });

        const totalQuantity = lines.reduce((sum, l) => sum + l.quantity, 0);

        // Search filtering (reference or contact or product name)
        if (input?.search) {
          const s = input.search.toLowerCase();
          const matchRef = ref.toLowerCase().includes(s);
          const matchContact = first.contact?.toLowerCase().includes(s);
          const matchProd = lines.some((l) => l.productName?.toLowerCase().includes(s));
          if (!matchRef && !matchContact && !matchProd) {
            continue;
          }
        }

        if (input?.state && input.state !== "ALL" && first.state !== input.state) {
          continue;
        }

        summaries.push({
          id: first.id,
          reference: ref,
          contact: first.contact || "Standard Supplier",
          warehouseId: toLoc.warehouseId,
          warehouseName: wh.name,
          toLocationId: first.toLocationId,
          toLocationName: toLoc.name,
          state: first.state,
          scheduleDate: first.scheduleDate,
          doneAt: first.doneAt,
          responsibleUserId: first.responsibleUserId,
          itemCount: lines.length,
          totalQuantity,
          lines,
          createdAt: first.createdAt,
        });
      }

      return summaries;
    }),

  transition: publicProcedure
    .input(
      z.object({
        reference: z.string(),
        toState: z.enum(["ready", "done", "cancelled"]),
      })
    )
    .mutation(async ({ input }) => {
      // Find all moves for this receipt reference
      let moves: any[] = [];
      if (process.env.DATABASE_URL) {
        try {
          moves = await prisma.stockMove.findMany({
            where: { reference: input.reference, type: "IN" },
          });
        } catch {
          moves = memoryStockMoves.filter(
            (m) => m.reference === input.reference && m.type === "IN"
          );
        }
      } else {
        moves = memoryStockMoves.filter(
          (m) => m.reference === input.reference && m.type === "IN"
        );
      }

      if (moves.length === 0) {
        throw new Error(`Receipt ${input.reference} not found`);
      }

      // Transition every line through ledger engine
      const updatedMoves: any[] = [];
      for (const m of moves) {
        const updated = await transitionStockMove(m.id, input.toState);
        updatedMoves.push(updated);
      }

      return {
        reference: input.reference,
        state: input.toState,
        moves: updatedMoves,
      };
    }),
});
