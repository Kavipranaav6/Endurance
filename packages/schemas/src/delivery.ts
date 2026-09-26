import { z } from "zod";
import { StockMoveStateEnum } from "./stockMove.js";

export const DeliveryLineItemSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  productName: z.string().optional(),
  sku: z.string().optional(),
  quantity: z.number().positive("Quantity must be greater than zero"),
  availableStock: z.number().optional().default(0),
  isShortage: z.boolean().optional().default(false),
  unitOfMeasure: z.string().optional().default("Units"),
});

export type DeliveryLineItem = z.infer<typeof DeliveryLineItemSchema>;

export const CreateDeliveryInputSchema = z.object({
  warehouseId: z.string().min(1, "Warehouse is required"),
  fromLocationId: z.string().min(1, "Source location is required"),
  contact: z.string().min(1, "Customer / Recipient is required"),
  deliveryAddress: z.string().optional().nullable(),
  scheduleDate: z.coerce.date().optional().nullable(),
  responsibleUserId: z.string().optional().nullable(),
  lines: z.array(DeliveryLineItemSchema).min(1, "At least one product line is required"),
  initialState: StockMoveStateEnum.optional().default("draft"),
});

export type CreateDeliveryInput = z.infer<typeof CreateDeliveryInputSchema>;

export const DeliverySummarySchema = z.object({
  id: z.string(),
  reference: z.string(),
  contact: z.string(),
  deliveryAddress: z.string().optional().nullable(),
  warehouseId: z.string(),
  warehouseName: z.string().optional(),
  fromLocationId: z.string(),
  fromLocationName: z.string().optional(),
  state: StockMoveStateEnum,
  scheduleDate: z.coerce.date().optional().nullable(),
  doneAt: z.coerce.date().optional().nullable(),
  responsibleUserId: z.string().optional().nullable(),
  responsibleUserName: z.string().optional().nullable(),
  itemCount: z.number(),
  totalQuantity: z.number(),
  hasShortage: z.boolean().optional().default(false),
  lines: z.array(DeliveryLineItemSchema),
  createdAt: z.coerce.date(),
});

export type DeliverySummary = z.infer<typeof DeliverySummarySchema>;
