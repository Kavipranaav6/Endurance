import { z } from "zod";

export const ProductSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Product name is required"),
  sku: z.string().min(1, "SKU is required"),
  categoryId: z.string().optional().nullable(),
  unitOfMeasure: z.string().default("Units"),
  reorderPoint: z.number().int().nonnegative().default(0),
  reorderQty: z.number().int().nonnegative().default(0),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type Product = z.infer<typeof ProductSchema>;
