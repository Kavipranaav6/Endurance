import { z } from "zod";
import { StockMoveStateEnum } from "./stockMove.js";

export const ReceiptLineItemSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  productName: z.string().optional(),
  sku: z.string().optional(),
  quantity: z.number().positive("Quantity must be greater than zero"),
  unitOfMeasure: z.string().optional().default("Units"),
});

export type ReceiptLineItem = z.infer<typeof ReceiptLineItemSchema>;

export const CreateReceiptInputSchema = z.object({
  warehouseId: z.string().min(1, "Warehouse is required"),
  toLocationId: z.string().min(1, "Destination location is required"),
  contact: z.string().min(1, "Supplier/Contact is required"),
  scheduleDate: z.coerce.date().optional().nullable(),
  responsibleUserId: z.string().optional().nullable(),
  lines: z.array(ReceiptLineItemSchema).min(1, "At least one product line is required"),
  initialState: StockMoveStateEnum.optional().default("draft"),
});

export type CreateReceiptInput = z.infer<typeof CreateReceiptInputSchema>;

export const ReceiptSummarySchema = z.object({
  id: z.string(),
  reference: z.string(),
  contact: z.string(),
  warehouseId: z.string(),
  warehouseName: z.string().optional(),
  toLocationId: z.string(),
  toLocationName: z.string().optional(),
  state: StockMoveStateEnum,
  scheduleDate: z.coerce.date().optional().nullable(),
  doneAt: z.coerce.date().optional().nullable(),
  responsibleUserId: z.string().optional().nullable(),
  responsibleUserName: z.string().optional().nullable(),
  itemCount: z.number(),
  totalQuantity: z.number(),
  lines: z.array(ReceiptLineItemSchema),
  createdAt: z.coerce.date(),
});

export type ReceiptSummary = z.infer<typeof ReceiptSummarySchema>;
