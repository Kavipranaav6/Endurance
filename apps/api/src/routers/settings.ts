import { router, publicProcedure } from "../trpc.js";
import { z } from "zod";
import {
  CreateWarehouseInputSchema,
  UpdateWarehouseInputSchema,
  CreateLocationInputSchema,
  UpdateLocationInputSchema,
  CreateProductInputSchema,
  UpdateProductInputSchema,
} from "@stocksense/schemas";
import {
  computeDerivedStock,
  memoryWarehouses,
  memoryLocations,
  memoryProducts,
} from "../lib/ledger/derivedStock.js";
import { createStockMove } from "../lib/ledger/ledgerEngine.js";
import { prisma } from "../lib/prisma.js";
import { ensureSeedData } from "./dashboard.js";

export const settingsRouter = router({
  // --- WAREHOUSE CRUD ---
  listWarehouses: publicProcedure.query(async () => {
    ensureSeedData();
    let warehouses: any[] = [];
    let locations: any[] = [];

    if (process.env.DATABASE_URL) {
      try {
        [warehouses, locations] = await Promise.all([
          prisma.warehouse.findMany({ include: { locations: true } }),
          prisma.location.findMany(),
        ]);
        return warehouses.map((w) => ({
          id: w.id,
          name: w.name,
          shortCode: w.shortCode,
          address: w.address,
          locationCount: w.locations ? w.locations.length : 0,
        }));
      } catch {
        warehouses = memoryWarehouses;
        locations = memoryLocations;
      }
    } else {
      warehouses = memoryWarehouses;
      locations = memoryLocations;
    }

    return warehouses.map((w) => ({
      id: w.id,
      name: w.name,
      shortCode: w.shortCode,
      address: w.address || "",
      locationCount: locations.filter((l) => l.warehouseId === w.id).length,
    }));
  }),

  createWarehouse: publicProcedure
    .input(CreateWarehouseInputSchema)
    .mutation(async ({ input }) => {
      ensureSeedData();
      const id = `wh-${Date.now()}`;
      const shortCode = input.shortCode.toUpperCase();

      if (process.env.DATABASE_URL) {
        try {
          return await prisma.warehouse.create({
            data: {
              name: input.name,
              shortCode,
              address: input.address,
            },
          });
        } catch {
          // memory fallback
        }
      }

      const wh = {
        id,
        name: input.name,
        shortCode,
        address: input.address || "",
      };
      memoryWarehouses.push(wh);
      return wh;
    }),

  updateWarehouse: publicProcedure
    .input(UpdateWarehouseInputSchema)
    .mutation(async ({ input }) => {
      ensureSeedData();
      const shortCode = input.shortCode.toUpperCase();

      if (process.env.DATABASE_URL) {
        try {
          return await prisma.warehouse.update({
            where: { id: input.id },
            data: {
              name: input.name,
              shortCode,
              address: input.address,
            },
          });
        } catch {
          // fallback
        }
      }

      const index = memoryWarehouses.findIndex((w) => w.id === input.id);
      if (index !== -1) {
        memoryWarehouses[index] = {
          ...memoryWarehouses[index],
          name: input.name,
          shortCode,
          address: input.address || "",
        };
        return memoryWarehouses[index];
      }
      throw new Error(`Warehouse ${input.id} not found`);
    }),

  deleteWarehouse: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      if (process.env.DATABASE_URL) {
        try {
          await prisma.warehouse.delete({ where: { id: input.id } });
          return { success: true };
        } catch {
          // fallback
        }
      }

      const index = memoryWarehouses.findIndex((w) => w.id === input.id);
      if (index !== -1) {
        memoryWarehouses.splice(index, 1);
        return { success: true };
      }
      throw new Error(`Warehouse ${input.id} not found`);
    }),

  // --- LOCATION CRUD ---
  listLocations: publicProcedure.query(async () => {
    ensureSeedData();
    let locations: any[] = [];
    let warehouses: any[] = [];

    if (process.env.DATABASE_URL) {
      try {
        locations = await prisma.location.findMany({
          include: { warehouse: true },
        });
        return locations.map((l) => ({
          id: l.id,
          name: l.name,
          shortCode: l.shortCode,
          warehouseId: l.warehouseId,
          warehouseName: l.warehouse?.name || "Main Warehouse",
        }));
      } catch {
        locations = memoryLocations;
        warehouses = memoryWarehouses;
      }
    } else {
      locations = memoryLocations;
      warehouses = memoryWarehouses;
    }

    return locations.map((l) => {
      const wh = warehouses.find((w) => w.id === l.warehouseId);
      return {
        id: l.id,
        name: l.name,
        shortCode: l.shortCode,
        warehouseId: l.warehouseId,
        warehouseName: wh ? wh.name : "Warehouse",
      };
    });
  }),

  createLocation: publicProcedure
    .input(CreateLocationInputSchema)
    .mutation(async ({ input }) => {
      ensureSeedData();
      const id = `loc-${Date.now()}`;
      const shortCode = input.shortCode.toUpperCase();

      if (process.env.DATABASE_URL) {
        try {
          return await prisma.location.create({
            data: {
              name: input.name,
              shortCode,
              warehouseId: input.warehouseId,
            },
          });
        } catch {
          // memory fallback
        }
      }

      const loc = {
        id,
        name: input.name,
        shortCode,
        warehouseId: input.warehouseId,
      };
      memoryLocations.push(loc);
      return loc;
    }),

  updateLocation: publicProcedure
    .input(UpdateLocationInputSchema)
    .mutation(async ({ input }) => {
      ensureSeedData();
      const shortCode = input.shortCode.toUpperCase();

      if (process.env.DATABASE_URL) {
        try {
          return await prisma.location.update({
            where: { id: input.id },
            data: {
              name: input.name,
              shortCode,
              warehouseId: input.warehouseId,
            },
          });
        } catch {
          // fallback
        }
      }

      const index = memoryLocations.findIndex((l) => l.id === input.id);
      if (index !== -1) {
        memoryLocations[index] = {
          ...memoryLocations[index],
          name: input.name,
          shortCode,
          warehouseId: input.warehouseId,
        };
        return memoryLocations[index];
      }
      throw new Error(`Location ${input.id} not found`);
    }),

  deleteLocation: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      if (process.env.DATABASE_URL) {
        try {
          await prisma.location.delete({ where: { id: input.id } });
          return { success: true };
        } catch {
          // fallback
        }
      }

      const index = memoryLocations.findIndex((l) => l.id === input.id);
      if (index !== -1) {
        memoryLocations.splice(index, 1);
        return { success: true };
      }
      throw new Error(`Location ${input.id} not found`);
    }),

  // --- PRODUCT CRUD ---
  listProducts: publicProcedure
    .input(
      z
        .object({
          search: z.string().optional(),
          category: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      ensureSeedData();
      let products: any[] = [];

      if (process.env.DATABASE_URL) {
        try {
          products = await prisma.product.findMany({
            orderBy: { name: "asc" },
          });
        } catch {
          products = memoryProducts;
        }
      } else {
        products = memoryProducts;
      }

      const stockLevels = await computeDerivedStock();

      const result = products.map((p) => {
        const prodStocks = stockLevels.filter((s) => s.productId === p.id);
        const onHand = prodStocks.reduce((sum, s) => sum + s.onHand, 0);
        const freeToUse = prodStocks.reduce((sum, s) => sum + s.freeToUse, 0);
        const reorderPoint = p.reorderPoint ?? 10;
        const isLowStock = onHand <= reorderPoint;

        return {
          id: p.id,
          name: p.name,
          sku: p.sku,
          category: p.category || "General",
          unitOfMeasure: p.unitOfMeasure || "Units",
          reorderPoint,
          onHand,
          freeToUse,
          isLowStock,
        };
      });

      if (input?.search) {
        const s = input.search.toLowerCase();
        return result.filter(
          (p) =>
            p.name.toLowerCase().includes(s) ||
            p.sku.toLowerCase().includes(s) ||
            p.category.toLowerCase().includes(s)
        );
      }

      if (input?.category && input.category !== "ALL") {
        return result.filter((p) => p.category === input.category);
      }

      return result;
    }),

  createProduct: publicProcedure
    .input(CreateProductInputSchema)
    .mutation(async ({ input, ctx }) => {
      ensureSeedData();
      const id = `prod-${Date.now()}`;
      const responsibleUserId = ctx.user?.userId;

      let createdProduct: any = null;

      if (process.env.DATABASE_URL) {
        try {
          createdProduct = await prisma.product.create({
            data: {
              name: input.name,
              sku: input.sku.toUpperCase(),
              unitOfMeasure: input.unitOfMeasure || "Units",
              reorderPoint: input.reorderPoint,
            },
          });
        } catch {
          // memory fallback
        }
      }

      if (!createdProduct) {
        createdProduct = {
          id,
          name: input.name,
          sku: input.sku.toUpperCase(),
          category: input.category || "General",
          unitOfMeasure: input.unitOfMeasure || "Units",
          reorderPoint: input.reorderPoint,
        };
        memoryProducts.push(createdProduct);
      }

      // If initial stock is provided, log an opening balance IN move via Phase 2 ledgerEngine!
      if (input.initialStock > 0 && input.initialLocationId && input.initialWarehouseId) {
        await createStockMove(
          {
            warehouseId: input.initialWarehouseId,
            type: "IN",
            productId: createdProduct.id,
            quantity: input.initialStock,
            toLocationId: input.initialLocationId,
            contact: "Opening Balance / Initial Inventory Setup",
            initialState: "done", // Immediately commits opening balance to the ledger
          },
          responsibleUserId
        );
      }

      return createdProduct;
    }),

  updateProduct: publicProcedure
    .input(UpdateProductInputSchema)
    .mutation(async ({ input }) => {
      ensureSeedData();
      if (process.env.DATABASE_URL) {
        try {
          return await prisma.product.update({
            where: { id: input.id },
            data: {
              name: input.name,
              sku: input.sku.toUpperCase(),
              unitOfMeasure: input.unitOfMeasure,
              reorderPoint: input.reorderPoint,
            },
          });
        } catch {
          // fallback
        }
      }

      const index = memoryProducts.findIndex((p) => p.id === input.id);
      if (index !== -1) {
        memoryProducts[index] = {
          ...memoryProducts[index],
          name: input.name,
          sku: input.sku.toUpperCase(),
          category: input.category || memoryProducts[index].category || "General",
          unitOfMeasure: input.unitOfMeasure || "Units",
          reorderPoint: input.reorderPoint,
        };
        return memoryProducts[index];
      }
      throw new Error(`Product ${input.id} not found`);
    }),

  deleteProduct: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      if (process.env.DATABASE_URL) {
        try {
          await prisma.product.delete({ where: { id: input.id } });
          return { success: true };
        } catch {
          // fallback
        }
      }

      const index = memoryProducts.findIndex((p) => p.id === input.id);
      if (index !== -1) {
        memoryProducts.splice(index, 1);
        return { success: true };
      }
      throw new Error(`Product ${input.id} not found`);
    }),

  // --- LOW-STOCK ALERT ENDPOINT ---
  getLowStockSummary: publicProcedure.query(async () => {
    ensureSeedData();
    const stockLevels = await computeDerivedStock();
    const lowStockItems = stockLevels.filter((s) => s.isLowStock);
    return {
      count: lowStockItems.length,
      items: lowStockItems.map((s) => ({
        productId: s.productId,
        productName: s.productName,
        sku: s.sku,
        locationName: s.locationName,
        onHand: s.onHand,
        reorderPoint: s.reorderPoint,
        deficit: Math.max(0, s.reorderPoint - s.onHand),
      })),
    };
  }),
});
