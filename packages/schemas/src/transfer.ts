import { z } from "zod";
import { StockMoveStateEnum } from "./stockMove.js";

export const TransferLineItemSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  productName: z.string().optional(),
  sku: z.string().optional(),
  quantity: z.number().positive("Quantity must be greater than zero"),
  availableStock: z.number().optional().default(0),
  isShortage: z.boolean().optional().default(false),
  unitOfMeasure: z.string().optional().default("Units"),
});

export type TransferLineItem = z.infer<typeof TransferLineItemSchema>;

export const CreateTransferInputSchema = z.object({
  warehouseId: z.string().min(1, "Warehouse is required"),
  fromLocationId: z.string().min(1, "Source location is required"),
  toLocationId: z.string().min(1, "Destination location is required"),
  scheduleDate: z.coerce.date().optional().nullable(),
  responsibleUserId: z.string().optional().nullable(),
  lines: z.array(TransferLineItemSchema).min(1, "At least one product line is required"),
  initialState: StockMoveStateEnum.optional().default("draft"),
});

export type CreateTransferInput = z.infer<typeof CreateTransferInputSchema>;

export const TransferSummarySchema = z.object({
  id: z.string(),
  reference: z.string(),
  warehouseId: z.string(),
  warehouseName: z.string().optional(),
  fromLocationId: z.string(),
  fromLocationName: z.string().optional(),
  toLocationId: z.string(),
  toLocationName: z.string().optional(),
  state: StockMoveStateEnum,
  scheduleDate: z.coerce.date().optional().nullable(),
  doneAt: z.coerce.date().optional().nullable(),
  responsibleUserId: z.string().optional().nullable(),
  responsibleUserName: z.string().optional().nullable(),
  itemCount: z.number(),
  totalQuantity: z.number(),
  hasShortage: z.boolean().optional().default(false),
  lines: z.array(TransferLineItemSchema),
  createdAt: z.coerce.date(),
});

export type TransferSummary = z.infer<typeof TransferSummarySchema>;

export const CreateAdjustmentInputSchema = z.object({
  warehouseId: z.string().min(1, "Warehouse is required"),
  locationId: z.string().min(1, "Location is required"),
  productId: z.string().min(1, "Product is required"),
  recordedQuantity: z.number(),
  countedQuantity: z.number().min(0, "Counted quantity cannot be negative"),
  reason: z.string().optional().default("Cycle Count"),
});

export type CreateAdjustmentInput = z.infer<typeof CreateAdjustmentInputSchema>;

export const AdjustmentSummarySchema = z.object({
  id: z.string(),
  reference: z.string(),
  warehouseId: z.string(),
  warehouseName: z.string().optional(),
  locationId: z.string(),
  locationName: z.string().optional(),
  productId: z.string(),
  productName: z.string(),
  sku: z.string(),
  unitOfMeasure: z.string().optional().default("Units"),
  recordedQuantity: z.number(),
  countedQuantity: z.number(),
  delta: z.number(),
  reason: z.string(),
  createdAt: z.coerce.date(),
});

export type AdjustmentSummary = z.infer<typeof AdjustmentSummarySchema>;
