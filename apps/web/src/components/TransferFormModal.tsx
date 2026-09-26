import React, { useState, useEffect } from "react";
import {
  TransferSummary,
  CreateTransferInput,
  TransferLineItem,
} from "@stocksense/schemas";
import {
  X,
  Plus,
  Trash2,
  Printer,
  Ban,
  ArrowRight,
  ShieldCheck,
  Building,
  Calendar,
  AlertTriangle,
  Check,
  ArrowLeftRight,
} from "lucide-react";

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
  stockLevels?: Array<{
    productId: string;
    locationId: string;
    onHand: number;
    freeToUse: number;
  }>;
}

interface TransferFormModalProps {
  transfer: TransferSummary | null;
  metadata: Metadata;
  onClose: () => void;
  onSubmitCreate: (data: CreateTransferInput) => Promise<void>;
  onTransition: (
    reference: string,
    toState: "waiting" | "ready" | "done" | "cancelled"
  ) => Promise<void>;
}

export const TransferFormModal: React.FC<TransferFormModalProps> = ({
  transfer,
  metadata,
  onClose,
  onSubmitCreate,
  onTransition,
}) => {
  const isNew = !transfer;

  const [warehouseId, setWarehouseId] = useState(
    transfer?.warehouseId || metadata.warehouses[0]?.id || "wh-main"
  );
  const [fromLocationId, setFromLocationId] = useState(
    transfer?.fromLocationId ||
      metadata.locations.find((l) => l.warehouseId === warehouseId)?.id ||
      metadata.locations[0]?.id ||
      "loc-rack-a"
  );
  const [toLocationId, setToLocationId] = useState(
    transfer?.toLocationId ||
      metadata.locations.find(
        (l) => l.warehouseId === warehouseId && l.id !== fromLocationId
      )?.id ||
      metadata.locations[1]?.id ||
      "loc-rack-b"
  );
  const [scheduleDate, setScheduleDate] = useState<string>(
    transfer?.scheduleDate
      ? new Date(transfer.scheduleDate).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0]
  );

  const getAvailableStock = (prodId: string, locId: string): number => {
    if (!metadata.stockLevels) {
      const prod = metadata.products.find((p) => p.id === prodId);
      return prod ? prod.totalFree : 0;
    }
    const match = metadata.stockLevels.find(
      (s) => s.productId === prodId && s.locationId === locId
    );
    return match ? match.freeToUse : 0;
  };

  const [lines, setLines] = useState<TransferLineItem[]>(() => {
    if (transfer?.lines && transfer.lines.length > 0) {
      return transfer.lines;
    }
    const firstProduct = metadata.products[0];
    const initialFrom = metadata.locations[0]?.id || "loc-rack-a";
    const avail = firstProduct ? getAvailableStock(firstProduct.id, initialFrom) : 0;

    return [
      {
        productId: firstProduct?.id || "prod-1",
        productName: firstProduct?.name || "Product",
        sku: firstProduct?.sku || "SKU-001",
        quantity: 5,
        availableStock: avail,
        isShortage: 5 > avail,
        unitOfMeasure: firstProduct?.unitOfMeasure || "Units",
      },
    ];
  });

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableLocations = metadata.locations.filter(
    (l) => l.warehouseId === warehouseId
  );

  useEffect(() => {
    if (isNew) {
      setLines((prev) =>
        prev.map((l) => {
          const avail = getAvailableStock(l.productId, fromLocationId);
          return {
            ...l,
            availableStock: avail,
            isShortage: l.quantity > avail,
          };
        })
      );
    }
  }, [fromLocationId, isNew]);

  const handleAddLine = () => {
    const firstProduct = metadata.products[0];
    const avail = firstProduct
      ? getAvailableStock(firstProduct.id, fromLocationId)
      : 0;
    setLines((prev) => [
      ...prev,
      {
        productId: firstProduct?.id || "",
        productName: firstProduct?.name || "",
        sku: firstProduct?.sku || "",
        quantity: 1,
        availableStock: avail,
        isShortage: 1 > avail,
        unitOfMeasure: firstProduct?.unitOfMeasure || "Units",
      },
    ]);
  };

  const handleRemoveLine = (index: number) => {
    if (lines.length <= 1) return;
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProductChange = (index: number, prodId: string) => {
    const prod = metadata.products.find((p) => p.id === prodId);
    if (!prod) return;
    const avail = getAvailableStock(prod.id, fromLocationId);

    setLines((prev) =>
      prev.map((l, i) =>
        i === index
          ? {
              ...l,
              productId: prod.id,
              productName: prod.name,
              sku: prod.sku,
              availableStock: avail,
              isShortage: l.quantity > avail,
              unitOfMeasure: prod.unitOfMeasure,
            }
          : l
      )
    );
  };

  const handleQuantityChange = (index: number, qty: number) => {
    const safeQty = Math.max(1, qty);
    setLines((prev) =>
      prev.map((l, i) =>
        i === index
          ? {
              ...l,
              quantity: safeQty,
              isShortage: safeQty > (l.availableStock || 0),
            }
          : l
      )
    );
  };

  const hasShortages = lines.some((l) => l.isShortage);

  const handleSave = async (
    initialState: "draft" | "waiting" | "ready" | "done" = "draft"
  ) => {
    setError(null);
    if (fromLocationId === toLocationId) {
      setError("Source and destination locations must be different.");
      return;
    }
    if (lines.length === 0 || lines.some((l) => l.quantity <= 0)) {
      setError("Please ensure all line items have valid quantities > 0");
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmitCreate({
        warehouseId,
        fromLocationId,
        toLocationId,
        scheduleDate: scheduleDate ? new Date(scheduleDate) : null,
        lines,
        initialState: initialState === "waiting" ? "draft" : initialState,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to create internal transfer");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTransitionAction = async (
    toState: "waiting" | "ready" | "done" | "cancelled"
  ) => {
    if (!transfer) return;
    setError(null);
    try {
      setIsSubmitting(true);
      await onTransition(transfer.reference, toState);
      onClose();
    } catch (err: any) {
      setError(err.message || `Failed to transition transfer to ${toState}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalUnits = lines.reduce((acc, l) => acc + (Number(l.quantity) || 0), 0);
  const isDone = transfer?.state === "done";
  const isCancelled = transfer?.state === "cancelled";
  const isImmutable = isDone || isCancelled;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs overflow-y-auto">
      <div className="bg-background border border-border rounded-lg shadow-xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-primary">
        {/* Printable Transfer Note (Active during print) */}
        <div className="hidden print:block p-8 bg-white text-black font-sans">
          <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold uppercase tracking-wider">
                StockSense ERP
              </h1>
              <p className="text-xs text-gray-600">Internal Stock Transfer Note</p>
            </div>
            <div className="text-right">
              <span className="text-xl font-mono font-bold">
                {transfer?.reference || "NEW TRANSFER"}
              </span>
              <p className="text-xs text-gray-600">
                Status: {transfer?.state?.toUpperCase() || "DRAFT"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs mb-6">
            <div>
              <p>
                <strong>From:</strong>{" "}
                {metadata.locations.find((l) => l.id === fromLocationId)?.name}
              </p>
              <p>
                <strong>To:</strong>{" "}
                {metadata.locations.find((l) => l.id === toLocationId)?.name}
              </p>
            </div>
            <div className="text-right">
              <p>
                <strong>Scheduled Date:</strong> {scheduleDate}
              </p>
              <p>
                <strong>Total Transfer Units:</strong> {totalUnits} units
              </p>
            </div>
          </div>

          <table className="w-full text-xs border-collapse border border-gray-400 mb-8">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-400 p-2 text-left">Item</th>
                <th className="border border-gray-400 p-2 text-left">SKU</th>
                <th className="border border-gray-400 p-2 text-right">Quantity</th>
                <th className="border border-gray-400 p-2 text-left">UoM</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, idx) => (
                <tr key={idx}>
                  <td className="border border-gray-400 p-2">
                    {l.productName || l.productId}
                  </td>
                  <td className="border border-gray-400 p-2 font-mono">
                    {l.sku || "—"}
                  </td>
                  <td className="border border-gray-400 p-2 text-right font-bold">
                    {l.quantity}
                  </td>
                  <td className="border border-gray-400 p-2">
                    {l.unitOfMeasure || "Units"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="grid grid-cols-2 gap-8 text-xs pt-8 border-t border-gray-300">
            <div>
              <p className="mb-8">Released By: __________________________</p>
            </div>
            <div className="text-right">
              <p className="mb-8">Received At Destination: _______________</p>
            </div>
          </div>
        </div>

        {/* Screen View */}
        <div className="print:hidden flex flex-col h-full overflow-hidden">
          {/* Top Status Breadcrumb */}
          <div className="px-6 py-4 border-b border-border bg-background-subtle flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="font-mono text-base font-bold text-primary">
                {isNew ? "New Internal Transfer" : transfer.reference}
              </div>
              {!isNew && (
                <span
                  className={`px-2 py-0.5 text-xs font-semibold uppercase tracking-wider rounded border ${
                    transfer.state === "done"
                      ? "text-status-done bg-green-50 border-status-done/20"
                      : transfer.state === "ready"
                      ? "text-status-ready bg-blue-50 border-status-ready/20"
                      : "text-gray-600 bg-gray-100 border-gray-200"
                  }`}
                >
                  {transfer.state}
                </span>
              )}
            </div>

            {/* Breadcrumb Steps */}
            <div className="flex items-center space-x-2 text-xs">
              <span
                className={`px-2 py-1 rounded font-medium ${
                  isNew || transfer?.state === "draft"
                    ? "bg-accent text-white"
                    : "text-primary-muted bg-background border border-border"
                }`}
              >
                1. Draft
              </span>
              <ArrowRight className="w-3 h-3 text-primary-muted" />
              <span
                className={`px-2 py-1 rounded font-medium ${
                  transfer?.state === "ready"
                    ? "bg-status-ready text-white"
                    : transfer?.state === "done"
                    ? "text-status-done bg-green-50 border border-status-done/20"
                    : "text-primary-muted bg-background border border-border"
                }`}
              >
                2. Ready
              </span>
              <ArrowRight className="w-3 h-3 text-primary-muted" />
              <span
                className={`px-2 py-1 rounded font-medium ${
                  transfer?.state === "done"
                    ? "bg-status-done text-white"
                    : "text-primary-muted bg-background border border-border"
                }`}
              >
                3. Done
              </span>

              <button
                onClick={onClose}
                className="ml-4 text-primary-muted hover:text-primary transition-colors p-1"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="px-6 py-2.5 bg-background border-b border-border flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              {isNew ? (
                <>
                  <button
                    disabled={isSubmitting}
                    onClick={() => handleSave("draft")}
                    className="px-3 py-1.5 bg-primary text-white font-medium rounded hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Save as Draft
                  </button>
                  <button
                    disabled={isSubmitting || hasShortages}
                    onClick={() => handleSave("ready")}
                    className="px-3 py-1.5 bg-status-ready text-white font-medium rounded hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-40"
                  >
                    Mark as Ready
                  </button>
                  <button
                    disabled={isSubmitting || hasShortages}
                    onClick={() => handleSave("done")}
                    className="px-3 py-1.5 bg-status-done text-white font-medium rounded hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-40 flex items-center gap-1"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                    Validate Transfer (Update Locations)
                  </button>
                </>
              ) : (
                <>
                  {transfer.state === "draft" && (
                    <button
                      disabled={isSubmitting || hasShortages}
                      onClick={() => handleTransitionAction("ready")}
                      className="px-3 py-1.5 bg-status-ready text-white font-medium rounded hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-40"
                    >
                      Mark as Ready
                    </button>
                  )}

                  {transfer.state === "ready" && (
                    <button
                      disabled={isSubmitting}
                      onClick={() => handleTransitionAction("done")}
                      className="px-3 py-1.5 bg-status-done text-white font-medium rounded hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5" />
                      Validate Transfer (Commit to Ledger)
                    </button>
                  )}

                  {!isImmutable && (
                    <button
                      disabled={isSubmitting}
                      onClick={() => handleTransitionAction("cancelled")}
                      className="px-3 py-1.5 border border-status-late text-status-late rounded hover:bg-status-late/10 transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1"
                    >
                      <Ban className="w-3 h-3" />
                      Cancel
                    </button>
                  )}

                  <button
                    onClick={() => window.print()}
                    className="px-3 py-1.5 border border-border text-primary rounded hover:bg-background-subtle transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print Transfer Slip
                  </button>
                </>
              )}
            </div>

            {isDone && (
              <div className="flex items-center gap-1 text-[11px] text-status-done font-medium bg-green-50 border border-status-done/20 px-2 py-1 rounded">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Total Company Stock Unchanged • Bins Updated</span>
              </div>
            )}
          </div>

          {/* Form Content */}
          <div className="p-6 overflow-y-auto space-y-6">
            {error && (
              <div className="p-3 bg-red-50 border border-status-late/20 text-status-late text-xs rounded">
                {error}
              </div>
            )}

            {/* Approved Layout: Dual Location Selector */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-background-subtle p-4 rounded-md border border-border">
              <div className="flex flex-col space-y-1 text-left">
                <label
                  htmlFor="transfer-warehouse"
                  className="text-[13px] font-medium text-primary-muted select-none flex items-center gap-1"
                >
                  <Building className="w-3 h-3 text-primary-muted" />
                  Warehouse
                </label>
                <select
                  id="transfer-warehouse"
                  value={warehouseId}
                  onChange={(e) => {
                    const newWhId = e.target.value;
                    setWarehouseId(newWhId);
                    const matchingLocs = metadata.locations.filter((l) => l.warehouseId === newWhId);
                    setFromLocationId(matchingLocs[0]?.id || "");
                    setToLocationId(matchingLocs[1]?.id || matchingLocs[0]?.id || "");
                  }}
                  disabled={isImmutable || !isNew}
                  className="h-9 px-3 text-sm text-primary bg-white border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent disabled:bg-background-subtle disabled:cursor-not-allowed cursor-pointer"
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
                  htmlFor="transfer-date"
                  className="text-[13px] font-medium text-primary-muted select-none flex items-center gap-1"
                >
                  <Calendar className="w-3 h-3 text-primary-muted" />
                  Scheduled Date
                </label>
                <input
                  id="transfer-date"
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  disabled={isImmutable}
                  className="h-9 px-3 text-sm text-primary bg-white border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent disabled:bg-background-subtle disabled:cursor-not-allowed"
                />
              </div>

              <div className="flex flex-col space-y-1 text-left">
                <label
                  htmlFor="transfer-from"
                  className="text-[13px] font-medium text-primary-muted select-none"
                >
                  Source Location (From)
                </label>
                <select
                  id="transfer-from"
                  value={fromLocationId}
                  onChange={(e) => setFromLocationId(e.target.value)}
                  disabled={isImmutable || !isNew}
                  className="h-9 px-3 text-sm text-primary bg-white border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent disabled:bg-background-subtle disabled:cursor-not-allowed cursor-pointer"
                >
                  {availableLocations.length === 0 ? (
                    <option value="" disabled>
                      No locations found for this warehouse
                    </option>
                  ) : (
                    availableLocations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="flex flex-col space-y-1 text-left">
                <label
                  htmlFor="transfer-to"
                  className="text-[13px] font-medium text-primary-muted select-none"
                >
                  Destination Location (To)
                </label>
                <select
                  id="transfer-to"
                  value={toLocationId}
                  onChange={(e) => setToLocationId(e.target.value)}
                  disabled={isImmutable || !isNew}
                  className="h-9 px-3 text-sm text-primary bg-white border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent disabled:bg-background-subtle disabled:cursor-not-allowed cursor-pointer"
                >
                  {availableLocations.length === 0 ? (
                    <option value="" disabled>
                      No locations found for this warehouse
                    </option>
                  ) : (
                    availableLocations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))
                  )}
                </select>
                {availableLocations.length === 0 && (
                  <span className="text-[11px] text-status-waiting mt-0.5">
                    No locations found for this warehouse. Please add locations in Settings.
                  </span>
                )}
              </div>
            </div>

            {/* Line Items Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-primary">
                    Products to Transfer
                  </h3>
                  <p className="text-[11px] text-primary-muted">
                    Stock will move between bins while preserving total company inventory.
                  </p>
                </div>
                {!isImmutable && (
                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="text-xs font-medium text-accent hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add a Line
                  </button>
                )}
              </div>

              <div className="border border-border rounded-md overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-background-subtle border-b border-border text-primary-muted font-medium">
                    <tr>
                      <th className="px-4 py-2.5">Product</th>
                      <th className="px-4 py-2.5">SKU</th>
                      <th className="px-4 py-2.5 text-right w-28">Quantity</th>
                      <th className="px-4 py-2.5 w-44">Source Bin Stock</th>
                      <th className="px-4 py-2.5 w-20">UoM</th>
                      {!isImmutable && <th className="px-3 py-2.5 w-12 text-center"></th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {lines.map((line, idx) => (
                      <tr key={idx} className="hover:bg-background-subtle/50">
                        <td className="px-4 py-2">
                          {isImmutable || !isNew ? (
                            <span className="font-medium text-primary">
                              {line.productName || line.productId}
                            </span>
                          ) : (
                            <select
                              value={line.productId}
                              onChange={(e) =>
                                handleProductChange(idx, e.target.value)
                              }
                              className="w-full h-8 px-2 text-xs bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent"
                            >
                              {metadata.products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td className="px-4 py-2 font-mono text-primary-muted">
                          {line.sku || "—"}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {isImmutable || !isNew ? (
                            <span className="font-mono font-semibold text-primary">
                              {line.quantity}
                            </span>
                          ) : (
                            <input
                              type="number"
                              min="1"
                              value={line.quantity}
                              onChange={(e) =>
                                handleQuantityChange(
                                  idx,
                                  parseInt(e.target.value) || 1
                                )
                              }
                              className="w-24 h-8 px-2 text-right font-mono text-xs bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent"
                            />
                          )}
                        </td>
                        <td className="px-4 py-2">
                          {line.isShortage ? (
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-red-50 text-status-late border border-status-late/20">
                              <AlertTriangle className="w-3 h-3 text-status-late shrink-0" />
                              <span>
                                Shortage: {line.availableStock ?? 0} in source
                              </span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-status-done border border-status-done/20">
                              <Check className="w-3 h-3 text-status-done shrink-0" />
                              <span>In Stock ({line.availableStock ?? 0} avail)</span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-2 text-primary-muted">
                          {line.unitOfMeasure || "Units"}
                        </td>
                        {!isImmutable && (
                          <td className="px-3 py-2 text-center">
                            {lines.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveLine(idx)}
                                className="text-primary-muted hover:text-status-late transition-colors p-1 cursor-pointer"
                                title="Remove line"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center px-4 py-2 bg-background-subtle rounded border border-border text-xs">
                <span className="text-primary-muted">
                  Lines: <strong className="text-primary">{lines.length}</strong>
                </span>
                <span className="text-primary font-mono">
                  Total Rebalanced Quantity:{" "}
                  <strong className="text-accent">{totalUnits} units</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="px-6 py-3 border-t border-border bg-background-subtle flex justify-end items-center space-x-2 text-xs">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-border rounded text-primary hover:bg-background transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
