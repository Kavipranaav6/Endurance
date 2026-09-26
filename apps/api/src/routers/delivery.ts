import { router, publicProcedure } from "../trpc.js";
import { z } from "zod";
import {
  CreateDeliveryInputSchema,
  DeliverySummary,
  DeliveryLineItem,
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

export const deliveryRouter = router({
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

    // Compute live stock levels across all locations
    const stockItems = await computeDerivedStock();

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
        // Sum free to use across all locations or provide default
        const prodStocks = stockItems.filter((s) => s.productId === p.id);
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
      stockLevels: stockItems,
    };
  }),

  create: publicProcedure
    .input(CreateDeliveryInputSchema)
    .mutation(async ({ input, ctx }) => {
      ensureSeedData();
      const responsibleUserId = ctx.user?.userId || input.responsibleUserId || null;

      // 1. Generate unified reference: <Warehouse>/OUT/<0001>
      const reference = await generateStockMoveReference(
        input.warehouseId,
        "OUT"
      );

      const createdMoves: any[] = [];

      // 2. Route each product line through the Phase 2 ledger engine
      for (const line of input.lines) {
        const move = await createStockMove(
          {
            warehouseId: input.warehouseId,
            type: "OUT",
            productId: line.productId,
            quantity: line.quantity,
            fromLocationId: input.fromLocationId,
            scheduleDate: input.scheduleDate,
            contact: input.contact,
            initialState: input.initialState || "draft",
          },
          responsibleUserId || undefined
        );

        // Ensure the move shares the master delivery reference
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
    .query(async ({ input }): Promise<DeliverySummary[]> => {
      ensureSeedData();
      let moves: any[] = [];

      if (process.env.DATABASE_URL) {
        try {
          moves = await prisma.stockMove.findMany({
            where: {
              type: "OUT",
              ...(input?.state && input.state !== "ALL" ? { state: input.state } : {}),
            },
            include: {
              product: true,
              fromLocation: { include: { warehouse: true } },
            },
            orderBy: { createdAt: "desc" },
          });
        } catch {
          moves = memoryStockMoves.filter((m) => m.type === "OUT");
        }
      } else {
        moves = memoryStockMoves.filter((m) => m.type === "OUT");
      }

      // Group moves by reference to represent multi-line delivery orders
      const groups = new Map<string, any[]>();
      for (const move of moves) {
        const ref = move.reference;
        if (!groups.has(ref)) {
          groups.set(ref, []);
        }
        groups.get(ref)!.push(move);
      }

      // Compute live stock derived values to calculate shortages
      const derivedStock = await computeDerivedStock();

      const summaries: DeliverySummary[] = [];

      for (const [ref, refMoves] of groups.entries()) {
        const first = refMoves[0];
        const fromLoc =
          first.fromLocation ||
          memoryLocations.find((l) => l.id === first.fromLocationId) || {
            name: "Default Location",
            warehouseId: "wh-main",
          };
        const wh =
          fromLoc.warehouse ||
          memoryWarehouses.find((w) => w.id === fromLoc.warehouseId) || {
            name: "Main Warehouse",
          };

        let orderHasShortage = false;

        const lines: DeliveryLineItem[] = refMoves.map((m) => {
          const prod =
            m.product ||
            memoryProducts.find((p) => p.id === m.productId) || {
              name: "Product",
              sku: "SKU",
              unitOfMeasure: "Units",
            };

          // Find current stock at the source location
          const stock = derivedStock.find(
            (s) => s.productId === m.productId && s.locationId === first.fromLocationId
          );
          const availableStock = stock ? stock.freeToUse : 0;
          const isShortage = first.state !== "done" && m.quantity > availableStock;

          if (isShortage) {
            orderHasShortage = true;
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

        // Search filtering (reference, customer/contact, product name)
        if (input?.search) {
          const s = input.search.toLowerCase();
          const matchRef = ref.toLowerCase().includes(s);
          const matchContact = first.contact?.toLowerCase().includes(s);
          const matchProd = lines.some((l) =>
            l.productName?.toLowerCase().includes(s)
          );
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
          contact: first.contact || "Customer Recipient",
          warehouseId: fromLoc.warehouseId,
          warehouseName: wh.name,
          fromLocationId: first.fromLocationId,
          fromLocationName: fromLoc.name,
          state: first.state,
          scheduleDate: first.scheduleDate,
          doneAt: first.doneAt,
          responsibleUserId: first.responsibleUserId,
          itemCount: lines.length,
          totalQuantity,
          hasShortage: orderHasShortage,
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
            where: { reference: input.reference, type: "OUT" },
          });
        } catch {
          moves = memoryStockMoves.filter(
            (m) => m.reference === input.reference && m.type === "OUT"
          );
        }
      } else {
        moves = memoryStockMoves.filter(
          (m) => m.reference === input.reference && m.type === "OUT"
        );
      }

      if (moves.length === 0) {
        throw new Error(`Delivery Order ${input.reference} not found`);
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
