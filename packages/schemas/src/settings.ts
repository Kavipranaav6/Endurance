import { z } from "zod";

export const CreateWarehouseInputSchema = z.object({
  name: z.string().min(1, "Warehouse name is required"),
  shortCode: z.string().min(1, "Short code is required").max(10),
  address: z.string().optional().nullable(),
});

export type CreateWarehouseInput = z.infer<typeof CreateWarehouseInputSchema>;

export const UpdateWarehouseInputSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, "Warehouse name is required"),
  shortCode: z.string().min(1).max(10),
  address: z.string().optional().nullable(),
});

export type UpdateWarehouseInput = z.infer<typeof UpdateWarehouseInputSchema>;

export const CreateLocationInputSchema = z.object({
  name: z.string().min(1, "Location name is required"),
  shortCode: z.string().min(1, "Short code is required").max(10),
  warehouseId: z.string().min(1, "Parent warehouse is required"),
});

export type CreateLocationInput = z.infer<typeof CreateLocationInputSchema>;

export const UpdateLocationInputSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, "Location name is required"),
  shortCode: z.string().min(1).max(10),
  warehouseId: z.string().min(1),
});

export type UpdateLocationInput = z.infer<typeof UpdateLocationInputSchema>;

export const CreateProductInputSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  sku: z.string().min(1, "SKU is required"),
  category: z.string().optional().default("General"),
  unitOfMeasure: z.string().optional().default("Units"),
  reorderPoint: z.number().int().min(0, "Reorder point must be 0 or more").default(10),
  initialStock: z.number().int().min(0).default(0),
  initialWarehouseId: z.string().optional().nullable(),
  initialLocationId: z.string().optional().nullable(),
});

export type CreateProductInput = z.infer<typeof CreateProductInputSchema>;

export const UpdateProductInputSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, "Product name is required"),
  sku: z.string().min(1, "SKU is required"),
  category: z.string().optional().default("General"),
  unitOfMeasure: z.string().optional().default("Units"),
  reorderPoint: z.number().int().min(0).default(10),
});

export type UpdateProductInput = z.infer<typeof UpdateProductInputSchema>;
