import { z } from "zod";
import { StockMoveStateEnum } from "./stockMove.js";

export const DashboardFilterSchema = z.object({
  docType: z.enum(["ALL", "RECEIPT", "DELIVERY", "INTERNAL", "ADJUSTMENT"]).default("ALL"),
  status: z.enum(["ALL", "draft", "waiting", "ready", "done", "cancelled"]).default("ALL"),
  warehouseId: z.string().default("ALL"),
  category: z.string().default("ALL"),
});

export type DashboardFilter = z.infer<typeof DashboardFilterSchema>;

export const DashboardKPIsSchema = z.object({
  totalProducts: z.number(),
  lowStockCount: z.number(),
  outOfStockCount: z.number(),
  pendingReceiptsCount: z.number(),
  pendingDeliveriesCount: z.number(),
  scheduledTransfersCount: z.number(),
});

export type DashboardKPIs = z.infer<typeof DashboardKPIsSchema>;

export const OperationalWidgetSummarySchema = z.object({
  receipts: z.object({
    pendingCount: z.number(),
    readyCount: z.number(),
    items: z.array(z.any()),
  }),
  deliveries: z.object({
    pendingCount: z.number(),
    waitingCount: z.number(),
    readyCount: z.number(),
    items: z.array(z.any()),
  }),
});

export type OperationalWidgetSummary = z.infer<typeof OperationalWidgetSummarySchema>;
