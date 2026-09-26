import { StockMoveType } from "@stocksense/schemas";
import { prisma } from "../prisma.js";
import { memoryWarehouses } from "./derivedStock.js";

const opCodeMap: Record<StockMoveType, string> = {
  IN: "IN",
  OUT: "OUT",
  INTERNAL: "INT",
  ADJUSTMENT: "ADJ",
};

// Memory fallback sequence counter
const memorySequences = new Map<string, number>();

export async function generateStockMoveReference(
  warehouseId: string,
  type: StockMoveType,
  warehouseCode?: string
): Promise<string> {
  let shortCode = warehouseCode;
  let nextSeq = 1;

  if (process.env.DATABASE_URL) {
    try {
      const warehouse = await prisma.warehouse.findUnique({
        where: { id: warehouseId },
        select: { shortCode: true },
      });

      if (warehouse) {
        shortCode = warehouse.shortCode;
      }

      const seqRecord = await prisma.operationSequence.upsert({
        where: {
          warehouseId_type: { warehouseId, type },
        },
        create: {
          warehouseId,
          type,
          lastSequence: 1,
        },
        update: {
          lastSequence: { increment: 1 },
        },
      });

      nextSeq = seqRecord.lastSequence;
    } catch {
      // fallback to memory
      const memWh = memoryWarehouses.find((w) => w.id === warehouseId);
      if (memWh) shortCode = memWh.shortCode;
      const key = `${warehouseId}_${type}`;
      nextSeq = (memorySequences.get(key) || 0) + 1;
      memorySequences.set(key, nextSeq);
    }
  } else {
    const memWh = memoryWarehouses.find((w) => w.id === warehouseId);
    if (memWh) shortCode = memWh.shortCode;
    const key = `${warehouseId}_${type}`;
    nextSeq = (memorySequences.get(key) || 0) + 1;
    memorySequences.set(key, nextSeq);
  }

  const prefix = shortCode ? shortCode.toUpperCase() : "WH";
  const op = opCodeMap[type] || "OP";
  const padded = nextSeq.toString().padStart(4, "0");

  return `${prefix}/${op}/${padded}`;
}
