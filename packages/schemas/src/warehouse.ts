import { z } from "zod";

export const WarehouseSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Warehouse name is required"),
  shortCode: z.string().min(1).max(10, "Short code must be 10 characters or less"),
  address: z.string().optional().nullable(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type Warehouse = z.infer<typeof WarehouseSchema>;
