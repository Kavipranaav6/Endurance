import {
  CreateStockMoveInput,
  StockMoveState,
  StockLedgerEvent,
} from "@stocksense/schemas";
import { TRPCError } from "@trpc/server";
import { prisma } from "../prisma.js";
import { generateStockMoveReference } from "./referenceGenerator.js";
import { wsManager } from "../websocket.js";
import {
  computeDerivedStock,
  memoryStockMoves,
  memoryProducts,
} from "./derivedStock.js";

const VALID_TRANSITIONS: Record<StockMoveState, StockMoveState[]> = {
  draft: ["waiting", "ready", "cancelled"],
  waiting: ["ready", "cancelled"],
  ready: ["done", "cancelled"],
  done: [], // Immutable
  cancelled: [], // Terminal
};

export async function createStockMove(
  input: CreateStockMoveInput,
  responsibleUserId?: string
) {
  const reference = await generateStockMoveReference(
    input.warehouseId,
    input.type
  );

  const moveData = {
    reference,
    type: input.type,
    state: input.initialState || "draft",
    productId: input.productId,
    quantity: input.quantity,
    fromLocationId: input.fromLocationId || null,
    toLocationId: input.toLocationId || null,
    scheduleDate: input.scheduleDate || null,
    contact: input.contact || null,
    responsibleUserId: responsibleUserId || null,
    doneAt: input.initialState === "done" ? new Date() : null,
  };

  let createdMove: any;

  if (process.env.DATABASE_URL) {
    try {
      createdMove = await prisma.stockMove.create({
        data: moveData,
        include: {
          product: true,
          fromLocation: true,
          toLocation: true,
        },
      });
    } catch {
      createdMove = createInMemoryMove(moveData);
    }
  } else {
    createdMove = createInMemoryMove(moveData);
  }

  // Real-time broadcast
  const event: StockLedgerEvent = {
    type: "LEDGER_WRITE",
    timestamp: new Date().toISOString(),
    data: createdMove,
  };
  wsManager.broadcast(event);

  // Check low stock if move is immediately done
  if (createdMove.state === "done") {
    await checkAndBroadcastLowStock(createdMove.productId);
  }

  return createdMove;
}

export async function transitionStockMove(id: string, toState: StockMoveState) {
  let existingMove: any;

  if (process.env.DATABASE_URL) {
    try {
      existingMove = await prisma.stockMove.findUnique({
        where: { id },
      });
    } catch {
      existingMove = memoryStockMoves.find((m) => m.id === id);
    }
  } else {
    existingMove = memoryStockMoves.find((m) => m.id === id);
  }

  if (!existingMove) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: `Stock move with ID ${id} not found`,
    });
  }

  // Check immutability
  if (existingMove.state === "done") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "Stock move is already 'done' and is immutable. Ledger corrections require a new adjusting move.",
    });
  }

  if (existingMove.state === "cancelled") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Cancelled stock moves cannot be transitioned.",
    });
  }

  // Validate state transition sequence
  const allowed = VALID_TRANSITIONS[existingMove.state as StockMoveState] || [];
  if (!allowed.includes(toState)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Invalid state transition from '${existingMove.state}' to '${toState}'. Allowed: ${allowed.join(
        ", "
      )}`,
    });
  }

  const updateData: any = {
    state: toState,
    updatedAt: new Date(),
  };

  if (toState === "done") {
    updateData.doneAt = new Date();
  }

  let updatedMove: any;

  if (process.env.DATABASE_URL) {
    try {
      updatedMove = await prisma.stockMove.update({
        where: { id },
        data: updateData,
        include: {
          product: true,
          fromLocation: true,
          toLocation: true,
        },
      });
    } catch {
      updatedMove = updateInMemoryMove(id, updateData);
    }
  } else {
    updatedMove = updateInMemoryMove(id, updateData);
  }

  // Real-time broadcast for state transition
  const transitionEvent: StockLedgerEvent = {
    type: "STATE_TRANSITION",
    timestamp: new Date().toISOString(),
    data: {
      id: updatedMove.id,
      reference: updatedMove.reference,
      previousState: existingMove.state,
      newState: toState,
      doneAt: updatedMove.doneAt,
      move: updatedMove,
    },
  };
  wsManager.broadcast(transitionEvent);

  // Evaluate low-stock threshold crossing on done transition
  if (toState === "done") {
    await checkAndBroadcastLowStock(updatedMove.productId);
  }

  return updatedMove;
}

async function checkAndBroadcastLowStock(productId: string) {
  try {
    const stockItems = await computeDerivedStock({ productId });
    for (const item of stockItems) {
      if (item.isLowStock) {
        const alertEvent: StockLedgerEvent = {
          type: "LOW_STOCK_ALERT",
          timestamp: new Date().toISOString(),
          data: {
            productId: item.productId,
            productName: item.productName,
            sku: item.sku,
            locationId: item.locationId,
            locationName: item.locationName,
            onHand: item.onHand,
            reorderPoint: item.reorderPoint,
            deficit: item.reorderPoint - item.onHand,
          },
        };
        wsManager.broadcast(alertEvent);
      }
    }
  } catch (err) {
    console.warn("Failed to evaluate low stock alerts:", err);
  }
}

function createInMemoryMove(data: any) {
  const id = `sm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const product = memoryProducts.find((p) => p.id === data.productId) || {
    id: data.productId,
    name: "Sample Product",
    sku: "SKU-001",
    reorderPoint: 10,
  };

  const move = {
    id,
    ...data,
    product,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  memoryStockMoves.push(move);
  return move;
}

function updateInMemoryMove(id: string, updates: any) {
  const index = memoryStockMoves.findIndex((m) => m.id === id);
  if (index === -1) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: `Move ${id} not found in memory`,
    });
  }

  const updated = {
    ...memoryStockMoves[index],
    ...updates,
  };
  memoryStockMoves[index] = updated;
  return updated;
}
