import React, { useState } from "react";
import { CreateProductInput, UpdateProductInput } from "@stocksense/schemas";
import { FormGroup } from "./FormGroup";
import { X, Package, ShieldCheck } from "lucide-react";

interface ProductFormModalProps {
  product: any | null; // null for Create
  warehouses: Array<{ id: string; name: string }>;
  locations: Array<{ id: string; name: string; warehouseId: string }>;
  onClose: () => void;
  onSubmitCreate: (data: CreateProductInput) => Promise<void>;
  onSubmitUpdate: (data: UpdateProductInput) => Promise<void>;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  product,
  warehouses,
  locations,
  onClose,
  onSubmitCreate,
  onSubmitUpdate,
}) => {
  const isNew = !product;

  const [name, setName] = useState(product?.name || "");
  const [sku, setSku] = useState(product?.sku || "");
  const [category, setCategory] = useState(product?.category || "General");
  const [unitOfMeasure, setUnitOfMeasure] = useState(product?.unitOfMeasure || "Units");
  const [reorderPoint, setReorderPoint] = useState<number>(
    product?.reorderPoint ?? 10
  );

  // Initial stock setup for new products
  const [initialStock, setInitialStock] = useState<number>(0);
  const [initialWarehouseId, setInitialWarehouseId] = useState(
    warehouses[0]?.id || ""
  );
  const [initialLocationId, setInitialLocationId] = useState(
    locations.find((l) => l.warehouseId === warehouses[0]?.id)?.id ||
      locations[0]?.id ||
      ""
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableLocations = locations.filter(
    (l) => l.warehouseId === initialWarehouseId
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !sku.trim()) {
      setError("Product Name and SKU are required.");
      return;
    }

    try {
      setIsSubmitting(true);
      if (isNew) {
        await onSubmitCreate({
          name: name.trim(),
          sku: sku.trim().toUpperCase(),
          category: category.trim(),
          unitOfMeasure: unitOfMeasure.trim(),
          reorderPoint: Number(reorderPoint) || 0,
          initialStock: Number(initialStock) || 0,
          initialWarehouseId: initialStock > 0 ? initialWarehouseId : undefined,
          initialLocationId: initialStock > 0 ? initialLocationId : undefined,
        });
      } else {
        await onSubmitUpdate({
          id: product.id,
          name: name.trim(),
          sku: sku.trim().toUpperCase(),
          category: category.trim(),
          unitOfMeasure: unitOfMeasure.trim(),
          reorderPoint: Number(reorderPoint) || 0,
        });
      }
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save product.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs overflow-y-auto">
      <div className="bg-background border border-border rounded-lg shadow-xl w-full max-w-lg overflow-hidden text-primary">
        <div className="px-6 py-4 border-b border-border bg-background-subtle flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="p-1.5 bg-accent/10 text-accent rounded">
              <Package className="w-5 h-5" />
            </span>
            <h2 className="text-base font-bold text-primary">
              {isNew ? "Create New Product" : `Edit Product — ${product.sku}`}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-primary-muted hover:text-primary transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-red-50 border border-status-late/20 text-status-late rounded text-xs">
              {error}
            </div>
          )}

          <FormGroup
            id="prod-name"
            label="Product Name"
            placeholder="e.g. High Precision Ball Bearings"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <FormGroup
              id="prod-sku"
              label="SKU / Barcode"
              placeholder="e.g. BRG-500"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              required
            />
            <FormGroup
              id="prod-category"
              label="Category"
              placeholder="e.g. Hardware, Electronics"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormGroup
              id="prod-uom"
              label="Unit of Measure"
              placeholder="e.g. Units, Sheets, Meters"
              value={unitOfMeasure}
              onChange={(e) => setUnitOfMeasure(e.target.value)}
            />
            <div className="flex flex-col space-y-1 text-left">
              <label
                htmlFor="prod-reorder"
                className="text-[13px] font-medium text-primary-muted select-none"
              >
                Reorder Rule (Min Threshold)
              </label>
              <input
                id="prod-reorder"
                type="number"
                min="0"
                value={reorderPoint}
                onChange={(e) => setReorderPoint(parseInt(e.target.value) || 0)}
                className="h-9 px-3 text-sm text-primary bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>

          {/* Initial Opening Balance Option (Creation Mode Only) */}
          {isNew && (
            <div className="pt-3 border-t border-border space-y-3">
              <div className="flex items-center gap-1.5 text-primary font-medium text-xs">
                <ShieldCheck className="w-4 h-4 text-accent" />
                <span>Initial Opening Balance Setup (Ledger IN Move)</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col space-y-1 text-left">
                  <label
                    htmlFor="prod-init-stock"
                    className="text-[12px] text-primary-muted"
                  >
                    Opening Stock Qty
                  </label>
                  <input
                    id="prod-init-stock"
                    type="number"
                    min="0"
                    value={initialStock}
                    onChange={(e) =>
                      setInitialStock(parseInt(e.target.value) || 0)
                    }
                    className="h-9 px-3 text-sm font-mono text-primary bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>

                {initialStock > 0 && (
                  <>
                    <div className="flex flex-col space-y-1 text-left">
                      <label
                        htmlFor="prod-init-wh"
                        className="text-[12px] text-primary-muted"
                      >
                        Target Warehouse
                      </label>
                      <select
                        id="prod-init-wh"
                        value={initialWarehouseId}
                        onChange={(e) => setInitialWarehouseId(e.target.value)}
                        className="h-9 px-2 text-xs bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent"
                      >
                        {warehouses.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col space-y-1 text-left">
                      <label
                        htmlFor="prod-init-loc"
                        className="text-[12px] text-primary-muted"
                      >
                        Destination Bin
                      </label>
                      <select
                        id="prod-init-loc"
                        value={initialLocationId}
                        onChange={(e) => setInitialLocationId(e.target.value)}
                        className="h-9 px-2 text-xs bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent"
                      >
                        {availableLocations.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-border flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-border rounded text-primary hover:bg-background-subtle transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-primary text-white font-medium rounded hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting
                ? "Saving..."
                : isNew
                ? "Create Product"
                : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
