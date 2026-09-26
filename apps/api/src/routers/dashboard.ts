import { router, publicProcedure } from "../trpc.js";
import {
  DashboardFilterSchema,
  DashboardKPIs,
  OperationalWidgetSummary,
} from "@stocksense/schemas";
import {
  computeDerivedStock,
  memoryProducts,
  memoryWarehouses,
  memoryLocations,
  memoryStockMoves,
} from "../lib/ledger/derivedStock.js";
import { prisma } from "../lib/prisma.js";

// Ensure initial realistic sample data is present in memory if DB is offline or empty
function ensureSeedData() {
  if (memoryWarehouses.length === 0) {
    memoryWarehouses.push(
      { id: "wh-main", name: "Main Warehouse", shortCode: "WH", address: "100 Logistics Blvd" },
      { id: "wh-north", name: "North Terminal", shortCode: "NT", address: "45 Port Road" }
    );
  }

  if (memoryLocations.length === 0) {
    memoryLocations.push(
      { id: "loc-rack-a", name: "Rack A-01", shortCode: "RA01", warehouseId: "wh-main" },
      { id: "loc-rack-b", name: "Rack B-02", shortCode: "RB02", warehouseId: "wh-main" },
      { id: "loc-dock", name: "Dock 1", shortCode: "DK01", warehouseId: "wh-north" }
    );
  }

  if (memoryProducts.length === 0) {
    memoryProducts.push(
      { id: "prod-1", name: "Acoustic Insulation Foam", sku: "ISO-FOAM-01", category: "Raw Materials", unitOfMeasure: "Sheets", reorderPoint: 40 },
      { id: "prod-2", name: "Heavy Duty Ball Bearings", sku: "BER-HD-500", category: "Hardware", unitOfMeasure: "Units", reorderPoint: 100 },
      { id: "prod-3", name: "Precision Stepper Motor", sku: "MTR-STP-12V", category: "Electronics", unitOfMeasure: "Units", reorderPoint: 15 },
      { id: "prod-4", name: "Polyurethane Sealant Tube", sku: "SLT-PUR-300", category: "Chemicals", unitOfMeasure: "Cartridges", reorderPoint: 25 },
      { id: "prod-5", name: "Aluminum Extrusion 2020", sku: "EXT-AL-2020", category: "Hardware", unitOfMeasure: "Meters", reorderPoint: 50 }
    );
  }

  if (memoryStockMoves.length === 0) {
    // Initial completed IN moves to give on-hand inventory
    memoryStockMoves.push(
      {
        id: "mv-init-1",
        reference: "WH/IN/0001",
        type: "IN",
        state: "done",
        productId: "prod-1",
        quantity: 120,
        toLocationId: "loc-rack-a",
        contact: "Apex Acoustic Corp",
        scheduleDate: new Date(Date.now() - 86400000 * 3),
        doneAt: new Date(Date.now() - 86400000 * 3),
        createdAt: new Date(Date.now() - 86400000 * 3),
      },
      {
        id: "mv-init-2",
        reference: "WH/IN/0002",
        type: "IN",
        state: "done",
        productId: "prod-2",
        quantity: 80, // Below reorderPoint 100 -> Low stock!
        toLocationId: "loc-rack-b",
        contact: "Vortex Machinery",
        scheduleDate: new Date(Date.now() - 86400000 * 2),
        doneAt: new Date(Date.now() - 86400000 * 2),
        createdAt: new Date(Date.now() - 86400000 * 2),
      },
      {
        id: "mv-init-3",
        reference: "WH/IN/0003",
        type: "IN",
        state: "done",
        productId: "prod-3",
        quantity: 50,
        toLocationId: "loc-rack-a",
        contact: "NanoTech Drives",
        scheduleDate: new Date(Date.now() - 86400000),
        doneAt: new Date(Date.now() - 86400000),
        createdAt: new Date(Date.now() - 86400000),
      },
      // Pending Receipts ("to receive")
      {
        id: "mv-rec-1",
        reference: "WH/IN/0004",
        type: "IN",
        state: "ready",
        productId: "prod-4",
        quantity: 60,
        toLocationId: "loc-rack-b",
        contact: "ChemSupply Global",
        scheduleDate: new Date(Date.now() + 86400000),
        createdAt: new Date(),
      },
      {
        id: "mv-rec-2",
        reference: "WH/IN/0005",
        type: "IN",
        state: "draft",
        productId: "prod-5",
        quantity: 100,
        toLocationId: "loc-rack-a",
        contact: "MetalForge Extrusions",
        scheduleDate: new Date(Date.now() + 86400000 * 2),
        createdAt: new Date(),
      },
      // Pending Deliveries ("to deliver")
      {
        id: "mv-del-1",
        reference: "WH/OUT/0001",
        type: "OUT",
        state: "ready",
        productId: "prod-1",
        quantity: 25,
        fromLocationId: "loc-rack-a",
        contact: "BuildRight Construction",
        scheduleDate: new Date(Date.now() + 86400000),
        createdAt: new Date(),
      },
      {
        id: "mv-del-2",
        reference: "WH/OUT/0002",
        type: "OUT",
        state: "waiting",
        productId: "prod-2",
        quantity: 40,
        fromLocationId: "loc-rack-b",
        contact: "Precision Assembly Ltd",
        scheduleDate: new Date(Date.now() + 86400000 * 3),
        createdAt: new Date(),
      },
      // Scheduled internal transfer
      {
        id: "mv-trn-1",
        reference: "WH/INT/0001",
        type: "INTERNAL",
        state: "ready",
        productId: "prod-3",
        quantity: 15,
        fromLocationId: "loc-rack-a",
        toLocationId: "loc-dock",
        contact: "Internal Rebalance",
        scheduleDate: new Date(Date.now() + 86400000 * 2),
        createdAt: new Date(),
      }
    );
  }
}

export const dashboardRouter = router({
  getMetrics: publicProcedure
    .input(DashboardFilterSchema.optional())
    .query(async ({ input }) => {
      ensureSeedData();

      const filter = input || {
        docType: "ALL",
        status: "ALL",
        warehouseId: "ALL",
        category: "ALL",
      };

      // 1. Compute Derived Stock Metrics
      const stockItems = await computeDerivedStock(
        filter.warehouseId !== "ALL" ? { warehouseId: filter.warehouseId } : {}
      );

      // Filter by category if specified
      const filteredStock = stockItems.filter((item) => {
        if (filter.category === "ALL") return true;
        const prod = memoryProducts.find((p) => p.id === item.productId);
        return prod?.category === filter.category;
      });

      const uniqueProductIds = new Set(filteredStock.map((s) => s.productId));
      const totalProducts = uniqueProductIds.size || memoryProducts.length;

      let lowStockCount = 0;
      let outOfStockCount = 0;

      for (const item of filteredStock) {
        if (item.onHand === 0) {
          outOfStockCount++;
        } else if (item.isLowStock) {
          lowStockCount++;
        }
      }

      // 2. Fetch and aggregate moves
      let moves = memoryStockMoves;
      if (process.env.DATABASE_URL) {
        try {
          moves = await prisma.stockMove.findMany({
            include: { product: true, fromLocation: true, toLocation: true },
          });
        } catch {
          moves = memoryStockMoves;
        }
      }

      // Filter moves according to filter parameters
      const filteredMoves = moves.filter((m) => {
        if (filter.status !== "ALL" && m.state !== filter.status) return false;
        if (filter.docType === "RECEIPT" && m.type !== "IN") return false;
        if (filter.docType === "DELIVERY" && m.type !== "OUT") return false;
        if (filter.docType === "INTERNAL" && m.type !== "INTERNAL") return false;
        if (filter.docType === "ADJUSTMENT" && m.type !== "ADJUSTMENT") return false;
        return true;
      });

      const pendingReceiptsCount = filteredMoves.filter(
        (m) => m.type === "IN" && ["draft", "waiting", "ready"].includes(m.state)
      ).length;

      const pendingDeliveriesCount = filteredMoves.filter(
        (m) => m.type === "OUT" && ["draft", "waiting", "ready"].includes(m.state)
      ).length;

      const scheduledTransfersCount = filteredMoves.filter(
        (m) => m.type === "INTERNAL" && ["draft", "waiting", "ready"].includes(m.state)
      ).length;

      const kpis: DashboardKPIs = {
        totalProducts,
        lowStockCount,
        outOfStockCount,
        pendingReceiptsCount,
        pendingDeliveriesCount,
        scheduledTransfersCount,
      };

      // 3. Operational Widgets breakdown
      const receiptMoves = filteredMoves
        .filter((m) => m.type === "IN" && ["draft", "waiting", "ready"].includes(m.state))
        .map((m) => {
          const prod = memoryProducts.find((p) => p.id === m.productId);
          return {
            ...m,
            productName: m.product?.name || prod?.name || "Product",
            sku: m.product?.sku || prod?.sku || "—",
          };
        });

      const deliveryMoves = filteredMoves
        .filter((m) => m.type === "OUT" && ["draft", "waiting", "ready"].includes(m.state))
        .map((m) => {
          const prod = memoryProducts.find((p) => p.id === m.productId);
          return {
            ...m,
            productName: m.product?.name || prod?.name || "Product",
            sku: m.product?.sku || prod?.sku || "—",
          };
        });

      const widgets: OperationalWidgetSummary = {
        receipts: {
          pendingCount: pendingReceiptsCount,
          readyCount: receiptMoves.filter((m) => m.state === "ready").length,
          items: receiptMoves.slice(0, 6),
        },
        deliveries: {
          pendingCount: pendingDeliveriesCount,
          waitingCount: deliveryMoves.filter((m) => m.state === "waiting").length,
          readyCount: deliveryMoves.filter((m) => m.state === "ready").length,
          items: deliveryMoves.slice(0, 6),
        },
      };

      return {
        kpis,
        widgets,
        warehouses: memoryWarehouses,
        categories: ["Raw Materials", "Hardware", "Electronics", "Chemicals"],
      };
    }),
});
