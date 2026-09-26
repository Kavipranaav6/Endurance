import React, { useState, useEffect } from "react";
import {
  ReceiptSummary,
  CreateReceiptInput,
  ReceiptLineItem,
} from "@stocksense/schemas";
import { FormGroup } from "./FormGroup";
import {
  X,
  Plus,
  Trash2,
  CheckCircle2,
  Printer,
  Ban,
  ArrowRight,
  ShieldCheck,
  Building,
  Calendar,
} from "lucide-react";

interface Metadata {
  warehouses: Array<{ id: string; name: string; shortCode: string }>;
  locations: Array<{ id: string; name: string; warehouseId: string }>;
  products: Array<{ id: string; name: string; sku: string; unitOfMeasure: string }>;
}

interface ReceiptFormModalProps {
  receipt: ReceiptSummary | null; // null means "Create New Receipt"
  metadata: Metadata;
  onClose: () => void;
  onSubmitCreate: (data: CreateReceiptInput) => Promise<void>;
  onTransition: (reference: string, toState: "ready" | "done" | "cancelled") => Promise<void>;
}

export const ReceiptFormModal: React.FC<ReceiptFormModalProps> = ({
  receipt,
  metadata,
  onClose,
  onSubmitCreate,
  onTransition,
}) => {
  const isNew = !receipt;

  // Form State
  const [supplier, setSupplier] = useState(receipt?.contact || "");
  const [warehouseId, setWarehouseId] = useState(
    receipt?.warehouseId || metadata.warehouses[0]?.id || "wh-main"
  );
  const [toLocationId, setToLocationId] = useState(
    receipt?.toLocationId ||
      metadata.locations.find((l) => l.warehouseId === (receipt?.warehouseId || metadata.warehouses[0]?.id))?.id ||
      metadata.locations[0]?.id ||
      "loc-rack-a"
  );
  const [scheduleDate, setScheduleDate] = useState<string>(
    receipt?.scheduleDate
      ? new Date(receipt.scheduleDate).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0]
  );

  const [lines, setLines] = useState<ReceiptLineItem[]>(() => {
    if (receipt?.lines && receipt.lines.length > 0) {
      return receipt.lines;
    }
    const firstProduct = metadata.products[0];
    return [
      {
        productId: firstProduct?.id || "prod-1",
        productName: firstProduct?.name || "Product",
        sku: firstProduct?.sku || "SKU-001",
        quantity: 10,
        unitOfMeasure: firstProduct?.unitOfMeasure || "Units",
      },
    ];
  });

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update available locations when warehouse changes
  const availableLocations = metadata.locations.filter(
    (l) => l.warehouseId === warehouseId
  );

  useEffect(() => {
    if (isNew && availableLocations.length > 0) {
      const match = availableLocations.find((l) => l.id === toLocationId);
      if (!match) {
        setToLocationId(availableLocations[0].id);
      }
    }
  }, [warehouseId, availableLocations, isNew, toLocationId]);

  const handleAddLine = () => {
    const firstProduct = metadata.products[0];
    setLines((prev) => [
      ...prev,
      {
        productId: firstProduct?.id || "",
        productName: firstProduct?.name || "",
        sku: firstProduct?.sku || "",
        quantity: 1,
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
    setLines((prev) =>
      prev.map((l, i) =>
        i === index
          ? {
              ...l,
              productId: prod.id,
              productName: prod.name,
              sku: prod.sku,
              unitOfMeasure: prod.unitOfMeasure,
            }
          : l
      )
    );
  };

  const handleQuantityChange = (index: number, qty: number) => {
    setLines((prev) =>
      prev.map((l, i) => (i === index ? { ...l, quantity: Math.max(1, qty) } : l))
    );
  };

  const handleSave = async (initialState: "draft" | "ready" | "done" = "draft") => {
    setError(null);
    if (!supplier.trim()) {
      setError("Supplier / Vendor name is required");
      return;
    }
    if (!toLocationId) {
      setError("Destination location is required");
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
        toLocationId,
        contact: supplier.trim(),
        scheduleDate: scheduleDate ? new Date(scheduleDate) : null,
        lines,
        initialState,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to create receipt");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTransitionAction = async (toState: "ready" | "done" | "cancelled") => {
    if (!receipt) return;
    setError(null);
    try {
      setIsSubmitting(true);
      await onTransition(receipt.reference, toState);
      onClose();
    } catch (err: any) {
      setError(err.message || `Failed to transition receipt to ${toState}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const totalUnits = lines.reduce((acc, l) => acc + (Number(l.quantity) || 0), 0);
  const isDone = receipt?.state === "done";
  const isCancelled = receipt?.state === "cancelled";
  const isImmutable = isDone || isCancelled;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs overflow-y-auto">
      <div className="bg-background border border-border rounded-lg shadow-xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-primary">
        {/* Printable Voucher Section (Active during window.print()) */}
        <div className="hidden print:block p-8 bg-white text-black font-sans">
          <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold uppercase tracking-wider">StockSense ERP</h1>
              <p className="text-xs text-gray-600">Goods Receipt Voucher (GRV)</p>
            </div>
            <div className="text-right">
              <span className="text-xl font-mono font-bold">{receipt?.reference || "NEW RECEIPT"}</span>
              <p className="text-xs text-gray-600">Status: {receipt?.state?.toUpperCase() || "DRAFT"}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs mb-6">
            <div>
              <p><strong>Supplier:</strong> {supplier}</p>
              <p><strong>Destination:</strong> {metadata.warehouses.find(w => w.id === warehouseId)?.name} / {metadata.locations.find(l => l.id === toLocationId)?.name}</p>
            </div>
            <div className="text-right">
              <p><strong>Date:</strong> {scheduleDate}</p>
              <p><strong>Total Lines:</strong> {lines.length} | <strong>Total Quantity:</strong> {totalUnits}</p>
            </div>
          </div>

          <table className="w-full text-xs border-collapse border border-gray-400 mb-8">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-400 p-2 text-left">Item / Description</th>
                <th className="border border-gray-400 p-2 text-left">SKU</th>
                <th className="border border-gray-400 p-2 text-right">Qty Received</th>
                <th className="border border-gray-400 p-2 text-left">UoM</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, idx) => (
                <tr key={idx}>
                  <td className="border border-gray-400 p-2">{l.productName || l.productId}</td>
                  <td className="border border-gray-400 p-2 font-mono">{l.sku || "—"}</td>
                  <td className="border border-gray-400 p-2 text-right font-bold">{l.quantity}</td>
                  <td className="border border-gray-400 p-2">{l.unitOfMeasure || "Units"}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="grid grid-cols-2 gap-8 text-xs pt-8 border-t border-gray-300">
            <div>
              <p className="mb-8">Received By: __________________________</p>
              <p>Signature: ______________________________</p>
            </div>
            <div className="text-right">
              <p className="mb-8">Quality Inspection: ___________________</p>
              <p>Date: ___________________________________</p>
            </div>
          </div>
        </div>

        {/* Screen Dialog View */}
        <div className="print:hidden flex flex-col h-full overflow-hidden">
          {/* Top Workflow Status & Header Bar */}
          <div className="px-6 py-4 border-b border-border bg-background-subtle flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="font-mono text-base font-bold text-primary">
                {isNew ? "New Incoming Receipt" : receipt.reference}
              </div>
              {!isNew && (
                <span
                  className={`px-2 py-0.5 text-xs font-semibold uppercase tracking-wider rounded border ${
                    receipt.state === "done"
                      ? "text-status-done bg-green-50 border-status-done/20"
                      : receipt.state === "ready"
                      ? "text-status-ready bg-blue-50 border-status-ready/20"
                      : receipt.state === "waiting"
                      ? "text-status-waiting bg-amber-50 border-status-waiting/20"
                      : "text-gray-600 bg-gray-100 border-gray-200"
                  }`}
                >
                  {receipt.state}
                </span>
              )}
            </div>

            {/* Breadcrumb Steps */}
            <div className="flex items-center space-x-2 text-xs">
              <span
                className={`px-2 py-1 rounded font-medium ${
                  isNew || receipt?.state === "draft"
                    ? "bg-accent text-white"
                    : "text-primary-muted bg-background border border-border"
                }`}
              >
                1. Draft
              </span>
              <ArrowRight className="w-3 h-3 text-primary-muted" />
              <span
                className={`px-2 py-1 rounded font-medium ${
                  receipt?.state === "ready"
                    ? "bg-status-ready text-white"
                    : receipt?.state === "done"
                    ? "text-status-done bg-green-50 border border-status-done/20"
                    : "text-primary-muted bg-background border border-border"
                }`}
              >
                2. Ready
              </span>
              <ArrowRight className="w-3 h-3 text-primary-muted" />
              <span
                className={`px-2 py-1 rounded font-medium ${
                  receipt?.state === "done"
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
                    disabled={isSubmitting}
                    onClick={() => handleSave("ready")}
                    className="px-3 py-1.5 bg-status-ready text-white font-medium rounded hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
                  >
                    Mark as Ready
                  </button>
                  <button
                    disabled={isSubmitting}
                    onClick={() => handleSave("done")}
                    className="px-3 py-1.5 bg-status-done text-white font-medium rounded hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Validate & Commit to Ledger
                  </button>
                </>
              ) : (
                <>
                  {receipt.state === "draft" && (
                    <button
                      disabled={isSubmitting}
                      onClick={() => handleTransitionAction("ready")}
                      className="px-3 py-1.5 bg-status-ready text-white font-medium rounded hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
                    >
                      Mark as Ready
                    </button>
                  )}

                  {receipt.state === "ready" && (
                    <button
                      disabled={isSubmitting}
                      onClick={() => handleTransitionAction("done")}
                      className="px-3 py-1.5 bg-status-done text-white font-medium rounded hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Validate Receipt (Write to Ledger)
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
                    onClick={handlePrint}
                    className="px-3 py-1.5 border border-border text-primary rounded hover:bg-background-subtle transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print Voucher
                  </button>
                </>
              )}
            </div>

            {isDone && (
              <div className="flex items-center gap-1 text-[11px] text-status-done font-medium bg-green-50 border border-status-done/20 px-2 py-1 rounded">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Immutable Ledger Entry • Verified</span>
              </div>
            )}
          </div>

          {/* Form Content Body */}
          <div className="p-6 overflow-y-auto space-y-6">
            {error && (
              <div className="p-3 bg-red-50 border border-status-late/20 text-status-late text-xs rounded">
                {error}
              </div>
            )}

            {/* Approved Layout: 2-Column Header with Option A FormGroups */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-background-subtle p-4 rounded-md border border-border">
              <FormGroup
                id="receipt-supplier"
                label="Supplier / Partner"
                placeholder="e.g. Apex Industrial Supplies"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                disabled={isImmutable}
                required
              />

              <div className="flex flex-col space-y-1 text-left">
                <label
                  htmlFor="receipt-warehouse"
                  className="text-[13px] font-medium text-primary-muted select-none flex items-center gap-1"
                >
                  <Building className="w-3 h-3 text-primary-muted" />
                  Warehouse
                </label>
                <select
                  id="receipt-warehouse"
                  value={warehouseId}
                  onChange={(e) => {
                    const newWhId = e.target.value;
                    setWarehouseId(newWhId);
                    const matchingLocs = metadata.locations.filter((l) => l.warehouseId === newWhId);
                    setToLocationId(matchingLocs[0]?.id || "");
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
                  htmlFor="receipt-location"
                  className="text-[13px] font-medium text-primary-muted select-none"
                >
                  Destination Location (Putaway)
                </label>
                <select
                  id="receipt-location"
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
                    No putaway location found for this warehouse. Please add one in Settings.
                  </span>
                )}
              </div>

              <div className="flex flex-col space-y-1 text-left">
                <label
                  htmlFor="receipt-date"
                  className="text-[13px] font-medium text-primary-muted select-none flex items-center gap-1"
                >
                  <Calendar className="w-3 h-3 text-primary-muted" />
                  Scheduled Date
                </label>
                <input
                  id="receipt-date"
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  disabled={isImmutable}
                  className="h-9 px-3 text-sm text-primary bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent disabled:bg-background-subtle disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Approved Layout: Tabular Line Items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-primary">
                  Product Line Items
                </h3>
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
                      <th className="px-4 py-2.5 text-right w-32">Quantity</th>
                      <th className="px-4 py-2.5 w-24">UoM</th>
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
                              onChange={(e) => handleProductChange(idx, e.target.value)}
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
                                handleQuantityChange(idx, parseInt(e.target.value) || 1)
                              }
                              className="w-24 h-8 px-2 text-right font-mono text-xs bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent"
                            />
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

              {/* Line Summary Footer */}
              <div className="flex justify-between items-center px-4 py-2 bg-background-subtle rounded border border-border text-xs">
                <span className="text-primary-muted">
                  Total Items: <strong className="text-primary">{lines.length}</strong>
                </span>
                <span className="text-primary font-mono">
                  Total Received Quantity: <strong className="text-accent">{totalUnits}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Modal Bottom Actions */}
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
