import { z } from "zod";

export const StockMoveTypeEnum = z.enum(["IN", "OUT", "INTERNAL", "ADJUSTMENT"]);
export type StockMoveType = z.infer<typeof StockMoveTypeEnum>;

export const StockMoveStateEnum = z.enum([
  "draft",
  "waiting",
  "ready",
  "done",
  "cancelled",
]);
export type StockMoveState = z.infer<typeof StockMoveStateEnum>;

export const StockMoveSchema = z.object({
  id: z.string().uuid().optional(),
  reference: z.string().min(1, "Reference is required"),
  type: StockMoveTypeEnum,
  state: StockMoveStateEnum.default("draft"),
  fromLocationId: z.string().uuid().optional().nullable(),
  toLocationId: z.string().uuid().optional().nullable(),
  productId: z.string().uuid("Product ID is required"),
  quantity: z.number().positive("Quantity must be greater than zero"),
  scheduleDate: z.coerce.date().optional().nullable(),
  doneAt: z.coerce.date().optional().nullable(),
  responsibleUserId: z.string().optional().nullable(),
  contact: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});

export type StockMove = z.infer<typeof StockMoveSchema>;

export const CreateStockMoveInputSchema = z.object({
  warehouseId: z.string().min(1, "Warehouse ID is required"),
  type: StockMoveTypeEnum,
  productId: z.string().min(1, "Product ID is required"),
  quantity: z.number().positive("Quantity must be greater than zero"),
  fromLocationId: z.string().optional().nullable(),
  toLocationId: z.string().optional().nullable(),
  scheduleDate: z.coerce.date().optional().nullable(),
  contact: z.string().optional().nullable(),
  initialState: StockMoveStateEnum.optional().default("draft"),
}).refine((data) => {
  if (data.type === "IN") return !!data.toLocationId;
  if (data.type === "OUT") return !!data.fromLocationId;
  if (data.type === "INTERNAL") return !!data.fromLocationId && !!data.toLocationId;
  return true;
}, {
  message: "Invalid locations for specified operation type",
  path: ["toLocationId"],
});

export type CreateStockMoveInput = z.infer<typeof CreateStockMoveInputSchema>;

export const TransitionStockMoveInputSchema = z.object({
  id: z.string().min(1, "Stock Move ID is required"),
  toState: StockMoveStateEnum,
});

export type TransitionStockMoveInput = z.infer<typeof TransitionStockMoveInputSchema>;

export const DerivedStockQuerySchema = z.object({
  productId: z.string().optional(),
  locationId: z.string().optional(),
  warehouseId: z.string().optional(),
});

export type DerivedStockQuery = z.infer<typeof DerivedStockQuerySchema>;

export const DerivedStockItemSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  sku: z.string(),
  locationId: z.string(),
  locationName: z.string(),
  warehouseId: z.string(),
  warehouseName: z.string(),
  onHand: z.number(),
  reserved: z.number(),
  freeToUse: z.number(),
  reorderPoint: z.number(),
  isLowStock: z.boolean(),
});

export type DerivedStockItem = z.infer<typeof DerivedStockItemSchema>;

export const StockLedgerEventSchema = z.object({
  type: z.enum(["LEDGER_WRITE", "STATE_TRANSITION", "LOW_STOCK_ALERT"]),
  timestamp: z.string(),
  data: z.any(),
});

export type StockLedgerEvent = z.infer<typeof StockLedgerEventSchema>;
