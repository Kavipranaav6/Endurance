import { z } from "zod";

export const LocationSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Location name is required"),
  shortCode: z.string().min(1).max(10, "Short code must be 10 characters or less"),
  warehouseId: z.string().uuid("Invalid warehouse id"),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type Location = z.infer<typeof LocationSchema>;
