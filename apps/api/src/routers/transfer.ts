import { router, publicProcedure } from "../trpc.js";
import { z } from "zod";
import {
  CreateTransferInputSchema,
  TransferSummary,
  TransferLineItem,
  CreateAdjustmentInputSchema,
  AdjustmentSummary,
} from "@stocksense/schemas";
import {
  createStockMove,
  transitionStockMove,
} from "../lib/ledger/ledgerEngine.js";
import { generateStockMoveReference } from "../lib/ledger/referenceGenerator.js";
import {
  computeDerivedStock,
  memoryStockMoves,
  memoryProducts,
  memoryWarehouses,
  memoryLocations,
} from "../lib/ledger/derivedStock.js";
import { prisma } from "../lib/prisma.js";
import { ensureSeedData } from "./dashboard.js";

export const transferRouter = router({
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

    const stockLevels = await computeDerivedStock();

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
      products: products.map((p) => {
        const prodStocks = stockLevels.filter((s) => s.productId === p.id);
        const totalOnHand = prodStocks.reduce((sum, s) => sum + s.onHand, 0);
        const totalFree = prodStocks.reduce((sum, s) => sum + s.freeToUse, 0);
        return {
          id: p.id,
          name: p.name,
          sku: p.sku,
          unitOfMeasure: p.unitOfMeasure || "Units",
          totalOnHand,
          totalFree,
        };
      }),
      stockLevels,
    };
  }),

  create: publicProcedure
    .input(CreateTransferInputSchema)
    .mutation(async ({ input, ctx }) => {
      ensureSeedData();
      const responsibleUserId = ctx.user?.userId || input.responsibleUserId || null;

      // 1. Generate reference: <Warehouse>/INT/<0001>
      const reference = await generateStockMoveReference(
        input.warehouseId,
        "INTERNAL"
      );

      const createdMoves: any[] = [];

      // 2. Route each product line through the Phase 2 ledger engine as an INTERNAL move
      for (const line of input.lines) {
        const move = await createStockMove(
          {
            warehouseId: input.warehouseId,
            type: "INTERNAL",
            productId: line.productId,
            quantity: line.quantity,
            fromLocationId: input.fromLocationId,
            toLocationId: input.toLocationId,
            scheduleDate: input.scheduleDate,
            contact: "Internal Warehouse Transfer",
            initialState: input.initialState || "draft",
          },
          responsibleUserId || undefined
        );

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
          state: z
            .enum(["ALL", "draft", "waiting", "ready", "done", "cancelled"])
            .optional(),
        })
        .optional()
    )
    .query(async ({ input }): Promise<TransferSummary[]> => {
      ensureSeedData();
      let moves: any[] = [];

      if (process.env.DATABASE_URL) {
        try {
          moves = await prisma.stockMove.findMany({
            where: {
              type: "INTERNAL",
              ...(input?.state && input.state !== "ALL" ? { state: input.state } : {}),
            },
            include: {
              product: true,
              fromLocation: { include: { warehouse: true } },
              toLocation: { include: { warehouse: true } },
            },
            orderBy: { createdAt: "desc" },
          });
        } catch {
          moves = memoryStockMoves.filter((m) => m.type === "INTERNAL");
        }
      } else {
        moves = memoryStockMoves.filter((m) => m.type === "INTERNAL");
      }

      const groups = new Map<string, any[]>();
      for (const move of moves) {
        const ref = move.reference;
        if (!groups.has(ref)) {
          groups.set(ref, []);
        }
        groups.get(ref)!.push(move);
      }

      const derivedStock = await computeDerivedStock();
      const summaries: TransferSummary[] = [];

      for (const [ref, refMoves] of groups.entries()) {
        const first = refMoves[0];
        const fromLoc =
          first.fromLocation ||
          memoryLocations.find((l) => l.id === first.fromLocationId) || {
            name: "Source Location",
            warehouseId: "wh-main",
          };
        const toLoc =
          first.toLocation ||
          memoryLocations.find((l) => l.id === first.toLocationId) || {
            name: "Destination Location",
            warehouseId: "wh-main",
          };
        const wh =
          fromLoc.warehouse ||
          memoryWarehouses.find((w) => w.id === fromLoc.warehouseId) || {
            name: "Main Warehouse",
          };

        let hasShortage = false;

        const lines: TransferLineItem[] = refMoves.map((m) => {
          const prod =
            m.product ||
            memoryProducts.find((p) => p.id === m.productId) || {
              name: "Product",
              sku: "SKU",
              unitOfMeasure: "Units",
            };

          const stock = derivedStock.find(
            (s) => s.productId === m.productId && s.locationId === first.fromLocationId
          );
          const availableStock = stock ? stock.freeToUse : 0;
          const isShortage = first.state !== "done" && m.quantity > availableStock;

          if (isShortage) {
            hasShortage = true;
          }

          return {
            productId: m.productId,
            productName: prod.name,
            sku: prod.sku,
            quantity: m.quantity,
            availableStock,
            isShortage,
            unitOfMeasure: prod.unitOfMeasure || "Units",
          };
        });

        const totalQuantity = lines.reduce((sum, l) => sum + l.quantity, 0);

        if (input?.search) {
          const s = input.search.toLowerCase();
          const matchRef = ref.toLowerCase().includes(s);
          const matchFrom = fromLoc.name?.toLowerCase().includes(s);
          const matchTo = toLoc.name?.toLowerCase().includes(s);
          const matchProd = lines.some((l) =>
            l.productName?.toLowerCase().includes(s)
          );
          if (!matchRef && !matchFrom && !matchTo && !matchProd) {
            continue;
          }
        }

        if (input?.state && input.state !== "ALL" && first.state !== input.state) {
          continue;
        }

        summaries.push({
          id: first.id,
          reference: ref,
          warehouseId: fromLoc.warehouseId,
          warehouseName: wh.name,
          fromLocationId: first.fromLocationId,
          fromLocationName: fromLoc.name,
          toLocationId: first.toLocationId,
          toLocationName: toLoc.name,
          state: first.state,
          scheduleDate: first.scheduleDate,
          doneAt: first.doneAt,
          responsibleUserId: first.responsibleUserId,
          itemCount: lines.length,
          totalQuantity,
          hasShortage,
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
        toState: z.enum(["waiting", "ready", "done", "cancelled"]),
      })
    )
    .mutation(async ({ input }) => {
      ensureSeedData();
      let moves: any[] = [];
      if (process.env.DATABASE_URL) {
        try {
          moves = await prisma.stockMove.findMany({
            where: { reference: input.reference, type: "INTERNAL" },
          });
        } catch {
          moves = memoryStockMoves.filter(
            (m) => m.reference === input.reference && m.type === "INTERNAL"
          );
        }
      } else {
        moves = memoryStockMoves.filter(
          (m) => m.reference === input.reference && m.type === "INTERNAL"
        );
      }

      if (moves.length === 0) {
        throw new Error(`Transfer ${input.reference} not found`);
      }

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

export const adjustmentRouter = router({
  getInventoryByLocation: publicProcedure
    .input(z.object({ locationId: z.string() }))
    .query(async ({ input }) => {
      ensureSeedData();
      const stock = await computeDerivedStock({ locationId: input.locationId });
      return stock.map((s) => ({
        productId: s.productId,
        productName: s.productName,
        sku: s.sku,
        recordedQuantity: s.onHand,
        freeToUse: s.freeToUse,
      }));
    }),

  create: publicProcedure
    .input(CreateAdjustmentInputSchema)
    .mutation(async ({ input, ctx }) => {
      ensureSeedData();
      const responsibleUserId = ctx.user?.userId;
      const delta = input.countedQuantity - input.recordedQuantity;

      const reference = await generateStockMoveReference(
        input.warehouseId,
        "ADJUSTMENT"
      );

      let createdMove: any = null;

      // If delta !== 0, log immutable ADJUSTMENT ledger move
      if (delta !== 0) {
        const isGain = delta > 0;
        const absQty = Math.abs(delta);

        createdMove = await createStockMove(
          {
            warehouseId: input.warehouseId,
            type: "ADJUSTMENT",
            productId: input.productId,
            quantity: absQty,
            fromLocationId: isGain ? null : input.locationId,
            toLocationId: isGain ? input.locationId : null,
            contact: `Audit: ${input.reason || "Physical Count"}`,
            initialState: "done", // Adjustments immediately commit to the ledger
          },
          responsibleUserId
        );

        if (createdMove.reference !== reference) {
          createdMove.reference = reference;
          if (process.env.DATABASE_URL) {
            try {
              await prisma.stockMove.update({
                where: { id: createdMove.id },
                data: { reference },
              });
            } catch {
              // memory handled
            }
          }
        }
      }

      return {
        reference,
        delta,
        recordedQuantity: input.recordedQuantity,
        countedQuantity: input.countedQuantity,
        move: createdMove,
      };
    }),

  list: publicProcedure
    .input(z.object({ search: z.string().optional() }).optional())
    .query(async ({ input }): Promise<AdjustmentSummary[]> => {
      ensureSeedData();
      let moves: any[] = [];

      if (process.env.DATABASE_URL) {
        try {
          moves = await prisma.stockMove.findMany({
            where: { type: "ADJUSTMENT" },
            include: {
              product: true,
              fromLocation: { include: { warehouse: true } },
              toLocation: { include: { warehouse: true } },
            },
            orderBy: { createdAt: "desc" },
          });
        } catch {
          moves = memoryStockMoves.filter((m) => m.type === "ADJUSTMENT");
        }
      } else {
        moves = memoryStockMoves.filter((m) => m.type === "ADJUSTMENT");
      }

      const summaries: AdjustmentSummary[] = [];

      for (const m of moves) {
        const prod =
          m.product ||
          memoryProducts.find((p) => p.id === m.productId) || {
            name: "Product",
            sku: "SKU",
            unitOfMeasure: "Units",
          };

        const locId = m.toLocationId || m.fromLocationId;
        const loc =
          (m.toLocationId ? m.toLocation : m.fromLocation) ||
          memoryLocations.find((l) => l.id === locId) || {
            name: "Location",
            warehouseId: "wh-main",
          };
        const wh =
          loc.warehouse ||
          memoryWarehouses.find((w) => w.id === loc.warehouseId) || {
            name: "Main Warehouse",
          };

        const isGain = Boolean(m.toLocationId);
        const delta = isGain ? m.quantity : -m.quantity;
        const recorded = 0; // Reference base
        const counted = delta;

        if (input?.search) {
          const s = input.search.toLowerCase();
          const matchRef = m.reference?.toLowerCase().includes(s);
          const matchProd = prod.name?.toLowerCase().includes(s);
          const matchLoc = loc.name?.toLowerCase().includes(s);
          if (!matchRef && !matchProd && !matchLoc) {
            continue;
          }
        }

        summaries.push({
          id: m.id,
          reference: m.reference,
          warehouseId: loc.warehouseId,
          warehouseName: wh.name,
          locationId: locId || "loc-rack-a",
          locationName: loc.name,
          productId: m.productId,
          productName: prod.name,
          sku: prod.sku,
          unitOfMeasure: prod.unitOfMeasure || "Units",
          recordedQuantity: recorded,
          countedQuantity: counted,
          delta,
          reason: m.contact || "Cycle Count Adjustment",
          createdAt: m.createdAt,
        });
      }

      return summaries;
    }),
});
