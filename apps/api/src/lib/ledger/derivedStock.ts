import { DerivedStockItem } from "@stocksense/schemas";
import { prisma } from "../prisma.js";

// Memory storage fallback when DB is offline
export const memoryStockMoves: any[] = [];
export const memoryWarehouses: any[] = [];
export const memoryLocations: any[] = [];
export const memoryProducts: any[] = [];

export interface ComputeStockOptions {
  productId?: string;
  locationId?: string;
  warehouseId?: string;
}

export async function computeDerivedStock(
  options: ComputeStockOptions = {}
): Promise<DerivedStockItem[]> {
  if (process.env.DATABASE_URL) {
    try {
      return await computeFromDatabase(options);
    } catch {
      return computeFromMemory(options);
    }
  }
  return computeFromMemory(options);
}

async function computeFromDatabase(
  options: ComputeStockOptions
): Promise<DerivedStockItem[]> {
  const { productId, locationId, warehouseId } = options;

  // Fetch relevant products and locations
  const products = await prisma.product.findMany({
    where: productId ? { id: productId } : undefined,
  });

  const locations = await prisma.location.findMany({
    where: {
      ...(locationId ? { id: locationId } : {}),
      ...(warehouseId ? { warehouseId } : {}),
    },
    include: { warehouse: true },
  });

  const items: DerivedStockItem[] = [];

  for (const product of products) {
    for (const location of locations) {
      // 1. Calculate On-Hand: sum of 'done' IN moves minus 'done' OUT moves at this location
      const inMoves = await prisma.stockMove.aggregate({
        where: {
          productId: product.id,
          toLocationId: location.id,
          state: "done",
        },
        _sum: { quantity: true },
      });

      const outMoves = await prisma.stockMove.aggregate({
        where: {
          productId: product.id,
          fromLocationId: location.id,
          state: "done",
        },
        _sum: { quantity: true },
      });

      const totalIn = inMoves._sum.quantity || 0;
      const totalOut = outMoves._sum.quantity || 0;
      const onHand = Math.max(0, totalIn - totalOut);

      // 2. Calculate Reserved: pending moves (draft, waiting, ready) departing from this location
      const reservedMoves = await prisma.stockMove.aggregate({
        where: {
          productId: product.id,
          fromLocationId: location.id,
          state: { in: ["draft", "waiting", "ready"] },
        },
        _sum: { quantity: true },
      });

      const reserved = reservedMoves._sum.quantity || 0;
      const freeToUse = Math.max(0, onHand - reserved);
      const isLowStock = onHand <= product.reorderPoint;

      // Only return rows that either have stock, have reservations, or have explicit filters
      if (onHand > 0 || reserved > 0 || productId || locationId) {
        items.push({
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          locationId: location.id,
          locationName: location.name,
          warehouseId: location.warehouseId,
          warehouseName: location.warehouse.name,
          onHand,
          reserved,
          freeToUse,
          reorderPoint: product.reorderPoint,
          isLowStock,
        });
      }
    }
  }

  return items;
}

function computeFromMemory(options: ComputeStockOptions): DerivedStockItem[] {
  const { productId, locationId, warehouseId } = options;

  const products = memoryProducts.filter((p) => (productId ? p.id === productId : true));
  const locations = memoryLocations.filter(
    (l) => (locationId ? l.id === locationId : true) && (warehouseId ? l.warehouseId === warehouseId : true)
  );

  const items: DerivedStockItem[] = [];

  for (const product of products) {
    for (const location of locations) {
      const warehouse = memoryWarehouses.find((w) => w.id === location.warehouseId) || {
        name: "Main Warehouse",
      };

      let totalIn = 0;
      let totalOut = 0;
      let reserved = 0;

      for (const move of memoryStockMoves) {
        if (move.productId !== product.id) continue;

        if (move.state === "done") {
          if (move.toLocationId === location.id) totalIn += move.quantity;
          if (move.fromLocationId === location.id) totalOut += move.quantity;
        } else if (["draft", "waiting", "ready"].includes(move.state)) {
          if (move.fromLocationId === location.id) reserved += move.quantity;
        }
      }

      const onHand = Math.max(0, totalIn - totalOut);
      const freeToUse = Math.max(0, onHand - reserved);
      const isLowStock = onHand <= (product.reorderPoint || 0);

      items.push({
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        locationId: location.id,
        locationName: location.name,
        warehouseId: location.warehouseId,
        warehouseName: warehouse.name,
        onHand,
        reserved,
        freeToUse,
        reorderPoint: product.reorderPoint || 0,
        isLowStock,
      });
    }
  }

  return items;
}
