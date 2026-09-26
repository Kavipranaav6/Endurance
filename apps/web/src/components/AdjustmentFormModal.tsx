import React, { useState, useEffect } from "react";
import { CreateAdjustmentInput } from "@stocksense/schemas";
import {
  X,
  Building,
  MapPin,
  ClipboardList,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { trpcCall } from "../lib/api";

interface Metadata {
  warehouses: Array<{ id: string; name: string; shortCode: string }>;
  locations: Array<{ id: string; name: string; warehouseId: string }>;
  products: Array<{
    id: string;
    name: string;
    sku: string;
    unitOfMeasure: string;
    totalOnHand: number;
    totalFree: number;
  }>;
}

interface AdjustmentFormModalProps {
  metadata: Metadata;
  onClose: () => void;
  onSuccess: () => Promise<void>;
}

interface CountItem {
  productId: string;
  productName: string;
  sku: string;
  unitOfMeasure: string;
  recordedQuantity: number;
  countedQuantity: number;
}

const REASONS = [
  "Cycle Count / Periodic Inventory Audit",
  "Damaged Goods / Scrap",
  "Lost Inventory / Unaccounted Shortage",
  "Found Surplus Inventory",
  "Manual Ledger Discrepancy Correction",
];

export const AdjustmentFormModal: React.FC<AdjustmentFormModalProps> = ({
  metadata,
  onClose,
  onSuccess,
}) => {
  const [warehouseId, setWarehouseId] = useState(
    metadata.warehouses[0]?.id || "wh-main"
  );
  const [locationId, setLocationId] = useState(
    metadata.locations.find((l) => l.warehouseId === warehouseId)?.id ||
      metadata.locations[0]?.id ||
      "loc-rack-a"
  );
  const [reason, setReason] = useState(REASONS[0]);
  const [countItems, setCountItems] = useState<CountItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableLocations = metadata.locations.filter(
    (l) => l.warehouseId === warehouseId
  );

  useEffect(() => {
    if (availableLocations.length > 0) {
      const match = availableLocations.find((l) => l.id === locationId);
      if (!match) {
        setLocationId(availableLocations[0].id);
      }
    }
  }, [warehouseId, availableLocations, locationId]);

  // Fetch current stock at selected location
  useEffect(() => {
    let isCancelled = false;
    async function loadLocationStock() {
      if (!locationId) return;
      setIsLoading(true);
      try {
        const data = await trpcCall<any[]>(
          "adjustment.getInventoryByLocation",
          "query",
          { locationId }
        );

        if (!isCancelled) {
          const items: CountItem[] = metadata.products.map((p) => {
            const match = data?.find((d) => d.productId === p.id);
            const recorded = match ? match.recordedQuantity : 0;
            return {
              productId: p.id,
              productName: p.name,
              sku: p.sku,
              unitOfMeasure: p.unitOfMeasure,
              recordedQuantity: recorded,
              countedQuantity: recorded, // Default matches recorded
            };
          });
          setCountItems(items);
        }
      } catch (err: any) {
        if (!isCancelled) {
          setError(err.message || "Failed to load location inventory");
        }
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }

    loadLocationStock();
    return () => {
      isCancelled = true;
    };
  }, [locationId, metadata.products]);

  const handleCountChange = (productId: string, val: number) => {
    const safeVal = Math.max(0, val);
    setCountItems((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, countedQuantity: safeVal } : item
      )
    );
  };

  // Discrepancy calculations
  const discrepancies = countItems.filter(
    (item) => item.countedQuantity !== item.recordedQuantity
  );
  const totalDelta = discrepancies.reduce(
    (acc, item) => acc + (item.countedQuantity - item.recordedQuantity),
    0
  );

  const handleCommitAdjustments = async () => {
    if (discrepancies.length === 0) {
      setError("No discrepancies between physical counts and system records.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      // Execute each adjustment move via tRPC
      for (const disc of discrepancies) {
        const input: CreateAdjustmentInput = {
          warehouseId,
          locationId,
          productId: disc.productId,
          recordedQuantity: disc.recordedQuantity,
          countedQuantity: disc.countedQuantity,
          reason,
        };
        await trpcCall("adjustment.create", "mutation", input);
      }

      await onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to commit stock adjustments");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs overflow-y-auto">
      <div className="bg-background border border-border rounded-lg shadow-xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-primary">
        {/* Modal Top Header */}
        <div className="px-6 py-4 border-b border-border bg-background-subtle flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="p-1.5 bg-accent/10 text-accent rounded">
              <ClipboardList className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-primary">
                Physical Inventory Count & Stock Adjustment
              </h2>
              <p className="text-xs text-primary-muted">
                Audit location bins and log immutable discrepancy deltas to the ledger
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-primary-muted hover:text-primary transition-colors p-1"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Location & Reason Filter Header */}
        <div className="p-6 border-b border-border bg-background-subtle/50 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="flex flex-col space-y-1 text-left">
            <label
              htmlFor="adj-warehouse"
              className="text-[13px] font-medium text-primary-muted select-none flex items-center gap-1"
            >
              <Building className="w-3 h-3 text-primary-muted" />
              Warehouse
            </label>
            <select
              id="adj-warehouse"
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              className="h-9 px-3 text-xs text-primary bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent"
            >
              {metadata.warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.shortCode})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col space-y-1 text-left">
            <label
              htmlFor="adj-location"
              className="text-[13px] font-medium text-primary-muted select-none flex items-center gap-1"
            >
              <MapPin className="w-3 h-3 text-primary-muted" />
              Location Bin to Count
            </label>
            <select
              id="adj-location"
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="h-9 px-3 text-xs text-primary bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent"
            >
              {availableLocations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col space-y-1 text-left">
            <label
              htmlFor="adj-reason"
              className="text-[13px] font-medium text-primary-muted select-none"
            >
              Audit Reason
            </label>
            <select
              id="adj-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="h-9 px-3 text-xs text-primary bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent"
            >
              {REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Count Sheet Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-status-late/20 text-status-late text-xs rounded">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-12 text-primary-muted text-xs animate-pulse">
              Loading inventory at selected location bin...
            </div>
          ) : (
            <div className="border border-border rounded-md overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-background-subtle border-b border-border text-primary-muted font-medium">
                  <tr>
                    <th className="px-4 py-2.5">Product</th>
                    <th className="px-4 py-2.5">SKU</th>
                    <th className="px-4 py-2.5 text-right w-32">Recorded Stock</th>
                    <th className="px-4 py-2.5 text-right w-36">Physical Count</th>
                    <th className="px-4 py-2.5 text-center w-36">Calculated Delta</th>
                    <th className="px-4 py-2.5 w-20">UoM</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {countItems.map((item) => {
                    const delta = item.countedQuantity - item.recordedQuantity;
                    return (
                      <tr key={item.productId} className="hover:bg-background-subtle/50">
                        <td className="px-4 py-2 font-medium text-primary">
                          {item.productName}
                        </td>
                        <td className="px-4 py-2 font-mono text-primary-muted">
                          {item.sku}
                        </td>
                        <td className="px-4 py-2 text-right font-mono font-semibold text-primary">
                          {item.recordedQuantity}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <input
                            type="number"
                            min="0"
                            value={item.countedQuantity}
                            onChange={(e) =>
                              handleCountChange(
                                item.productId,
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="w-24 h-8 px-2 text-right font-mono font-bold text-xs bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent"
                          />
                        </td>
                        <td className="px-4 py-2 text-center">
                          {delta === 0 ? (
                            <span className="inline-block px-2 py-0.5 text-[10px] font-mono font-medium text-gray-500 bg-gray-100 rounded border border-gray-200">
                              0 (Match)
                            </span>
                          ) : delta > 0 ? (
                            <span className="inline-block px-2 py-0.5 text-[10px] font-mono font-semibold text-emerald-700 bg-emerald-50 rounded border border-emerald-200">
                              +{delta} (Surplus Gain)
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 text-[10px] font-mono font-semibold text-status-late bg-red-50 rounded border border-status-late/20">
                              {delta} (Deficit Loss)
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-primary-muted">
                          {item.unitOfMeasure || "Units"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Audit Discrepancy Summary */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 p-3 bg-background-subtle rounded border border-border text-xs">
            <div className="flex items-center space-x-3 text-primary-muted">
              <span>
                Audited Products: <strong className="text-primary">{countItems.length}</strong>
              </span>
              <span>•</span>
              <span>
                Discrepancies Found:{" "}
                <strong
                  className={
                    discrepancies.length > 0 ? "text-status-late font-bold" : "text-primary"
                  }
                >
                  {discrepancies.length}
                </strong>
              </span>
            </div>

            <div className="flex items-center space-x-3 font-mono">
              <span>
                Net Discrepancy:{" "}
                <strong
                  className={
                    totalDelta > 0
                      ? "text-status-done font-bold"
                      : totalDelta < 0
                      ? "text-status-late font-bold"
                      : "text-primary font-medium"
                  }
                >
                  {totalDelta > 0 ? `+${totalDelta}` : totalDelta} units
                </strong>
              </span>
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="px-6 py-3 border-t border-border bg-background-subtle flex justify-between items-center text-xs">
          <div className="flex items-center gap-1.5 text-primary-muted text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-accent" />
            <span>Logs immutable ledger entry directly into StockMove ledger</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-border rounded text-primary hover:bg-background transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              disabled={isSubmitting || discrepancies.length === 0}
              onClick={handleCommitAdjustments}
              className="px-4 py-2 bg-primary text-white font-medium rounded hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-40 flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>
                {discrepancies.length === 0
                  ? "Counts Match (No Adjustments)"
                  : `Commit ${discrepancies.length} Adjustment${
                      discrepancies.length !== 1 ? "s" : ""
                    } to Ledger`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
