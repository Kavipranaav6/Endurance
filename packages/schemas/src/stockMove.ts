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
  scheduleDate: z.date().optional().nullable(),
  doneAt: z.date().optional().nullable(),
  responsibleUserId: z.string().optional().nullable(),
  contact: z.string().optional().nullable(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type StockMove = z.infer<typeof StockMoveSchema>;
