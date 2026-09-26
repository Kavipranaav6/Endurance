import React, { useState, useEffect } from "react";
import {
  DeliverySummary,
  CreateDeliveryInput,
  DeliveryLineItem,
} from "@stocksense/schemas";
import { FormGroup } from "./FormGroup";
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
  Truck,
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

interface DeliveryFormModalProps {
  delivery: DeliverySummary | null; // null means "New Delivery Order"
  metadata: Metadata;
  onClose: () => void;
  onSubmitCreate: (data: CreateDeliveryInput) => Promise<void>;
  onTransition: (
    reference: string,
    toState: "waiting" | "ready" | "done" | "cancelled"
  ) => Promise<void>;
}

export const DeliveryFormModal: React.FC<DeliveryFormModalProps> = ({
  delivery,
  metadata,
  onClose,
  onSubmitCreate,
  onTransition,
}) => {
  const isNew = !delivery;

  // Form State
  const [customer, setCustomer] = useState(delivery?.contact || "");
  const [deliveryAddress, setDeliveryAddress] = useState(
    delivery?.deliveryAddress || ""
  );
  const [warehouseId, setWarehouseId] = useState(
    delivery?.warehouseId || metadata.warehouses[0]?.id || "wh-main"
  );
  const [fromLocationId, setFromLocationId] = useState(
    delivery?.fromLocationId ||
      metadata.locations.find(
        (l) => l.warehouseId === (delivery?.warehouseId || metadata.warehouses[0]?.id)
      )?.id ||
      metadata.locations[0]?.id ||
      "loc-rack-a"
  );
  const [scheduleDate, setScheduleDate] = useState<string>(
    delivery?.scheduleDate
      ? new Date(delivery.scheduleDate).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0]
  );

  const getAvailableStockForProduct = (prodId: string, locId: string): number => {
    if (!metadata.stockLevels) {
      const prod = metadata.products.find((p) => p.id === prodId);
      return prod ? prod.totalFree : 0;
    }
    const match = metadata.stockLevels.find(
      (s) => s.productId === prodId && s.locationId === locId
    );
    return match ? match.freeToUse : 0;
  };

  const [lines, setLines] = useState<DeliveryLineItem[]>(() => {
    if (delivery?.lines && delivery.lines.length > 0) {
      return delivery.lines;
    }
    const firstProduct = metadata.products[0];
    const initialLocation = metadata.locations[0]?.id || "loc-rack-a";
    const avail = firstProduct
      ? getAvailableStockForProduct(firstProduct.id, initialLocation)
      : 0;

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

  // Available locations filtered by warehouse
  const availableLocations = metadata.locations.filter(
    (l) => l.warehouseId === warehouseId
  );

  useEffect(() => {
    if (isNew && availableLocations.length > 0) {
      const match = availableLocations.find((l) => l.id === fromLocationId);
      if (!match) {
        setFromLocationId(availableLocations[0].id);
      }
    }
  }, [warehouseId, availableLocations, isNew, fromLocationId]);

  // Recalculate available stock per line when fromLocationId changes
  useEffect(() => {
    if (isNew) {
      setLines((prev) =>
        prev.map((l) => {
          const avail = getAvailableStockForProduct(l.productId, fromLocationId);
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
      ? getAvailableStockForProduct(firstProduct.id, fromLocationId)
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
    const avail = getAvailableStockForProduct(prod.id, fromLocationId);

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
    if (!customer.trim()) {
      setError("Customer / Recipient name is required");
      return;
    }
    if (!fromLocationId) {
      setError("Source location is required");
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
        contact: customer.trim(),
        deliveryAddress: deliveryAddress.trim() || undefined,
        scheduleDate: scheduleDate ? new Date(scheduleDate) : null,
        lines,
        initialState,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to create delivery order");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTransitionAction = async (
    toState: "waiting" | "ready" | "done" | "cancelled"
  ) => {
    if (!delivery) return;
    setError(null);
    try {
      setIsSubmitting(true);
      await onTransition(delivery.reference, toState);
      onClose();
    } catch (err: any) {
      setError(err.message || `Failed to transition delivery order to ${toState}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const totalUnits = lines.reduce((acc, l) => acc + (Number(l.quantity) || 0), 0);
  const isDone = delivery?.state === "done";
  const isCancelled = delivery?.state === "cancelled";
  const isImmutable = isDone || isCancelled;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs overflow-y-auto">
      <div className="bg-background border border-border rounded-lg shadow-xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-primary">
        {/* Printable Delivery / Packing Slip (Active during window.print()) */}
        <div className="hidden print:block p-8 bg-white text-black font-sans">
          <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold uppercase tracking-wider">
                StockSense ERP
              </h1>
              <p className="text-xs text-gray-600">Goods Delivery / Packing Slip</p>
            </div>
            <div className="text-right">
              <span className="text-xl font-mono font-bold">
                {delivery?.reference || "NEW DELIVERY"}
              </span>
              <p className="text-xs text-gray-600">
                Status: {delivery?.state?.toUpperCase() || "DRAFT"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs mb-6">
            <div>
              <p>
                <strong>Customer:</strong> {customer}
              </p>
              {deliveryAddress && (
                <p>
                  <strong>Ship To:</strong> {deliveryAddress}
                </p>
              )}
              <p>
                <strong>Source:</strong>{" "}
                {metadata.warehouses.find((w) => w.id === warehouseId)?.name} /{" "}
                {metadata.locations.find((l) => l.id === fromLocationId)?.name}
              </p>
            </div>
            <div className="text-right">
              <p>
                <strong>Dispatch Date:</strong> {scheduleDate}
              </p>
              <p>
                <strong>Total Lines:</strong> {lines.length} |{" "}
                <strong>Total Quantity:</strong> {totalUnits} units
              </p>
            </div>
          </div>

          <table className="w-full text-xs border-collapse border border-gray-400 mb-8">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-400 p-2 text-left">
                  Item Description
                </th>
                <th className="border border-gray-400 p-2 text-left">SKU</th>
                <th className="border border-gray-400 p-2 text-right">
                  Quantity Picked
                </th>
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
              <p className="mb-8">Picked & Packed By: ___________________</p>
              <p>Warehouse Dispatcher: ___________________</p>
            </div>
            <div className="text-right">
              <p className="mb-8">Carrier / Driver: ______________________</p>
              <p>Customer Receipt Sign: __________________</p>
            </div>
          </div>
        </div>

        {/* Screen Dialog View */}
        <div className="print:hidden flex flex-col h-full overflow-hidden">
          {/* Top Status Breadcrumb & Header Bar */}
          <div className="px-6 py-4 border-b border-border bg-background-subtle flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="font-mono text-base font-bold text-primary">
                {isNew ? "New Outbound Delivery Order" : delivery.reference}
              </div>
              {!isNew && (
                <span
                  className={`px-2 py-0.5 text-xs font-semibold uppercase tracking-wider rounded border ${
                    delivery.state === "done"
                      ? "text-status-done bg-green-50 border-status-done/20"
                      : delivery.state === "ready"
                      ? "text-status-ready bg-blue-50 border-status-ready/20"
                      : delivery.state === "waiting"
                      ? "text-status-waiting bg-amber-50 border-status-waiting/20"
                      : "text-gray-600 bg-gray-100 border-gray-200"
                  }`}
                >
                  {delivery.state}
                </span>
              )}
            </div>

            {/* Breadcrumb Steps */}
            <div className="flex items-center space-x-2 text-xs">
              <span
                className={`px-2 py-1 rounded font-medium ${
                  isNew || delivery?.state === "draft"
                    ? "bg-accent text-white"
                    : "text-primary-muted bg-background border border-border"
                }`}
              >
                1. Draft
              </span>
              <ArrowRight className="w-3 h-3 text-primary-muted" />
              <span
                className={`px-2 py-1 rounded font-medium ${
                  delivery?.state === "waiting"
                    ? "bg-status-waiting text-white"
                    : delivery?.state === "ready" || delivery?.state === "done"
                    ? "text-status-done bg-green-50 border border-status-done/20"
                    : "text-primary-muted bg-background border border-border"
                }`}
              >
                2. Waiting
              </span>
              <ArrowRight className="w-3 h-3 text-primary-muted" />
              <span
                className={`px-2 py-1 rounded font-medium ${
                  delivery?.state === "ready"
                    ? "bg-status-ready text-white"
                    : delivery?.state === "done"
                    ? "text-status-done bg-green-50 border border-status-done/20"
                    : "text-primary-muted bg-background border border-border"
                }`}
              >
                3. Ready
              </span>
              <ArrowRight className="w-3 h-3 text-primary-muted" />
              <span
                className={`px-2 py-1 rounded font-medium ${
                  delivery?.state === "done"
                    ? "bg-status-done text-white"
                    : "text-primary-muted bg-background border border-border"
                }`}
              >
                4. Done
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
                    onClick={() => handleSave("waiting")}
                    className="px-3 py-1.5 bg-status-waiting text-white font-medium rounded hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
                  >
                    Mark as Waiting
                  </button>
                  <button
                    disabled={isSubmitting || hasShortages}
                    onClick={() => handleSave("ready")}
                    className="px-3 py-1.5 bg-status-ready text-white font-medium rounded hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-40"
                    title={
                      hasShortages
                        ? "Cannot mark ready: insufficient stock for some items"
                        : ""
                    }
                  >
                    Mark as Ready
                  </button>
                  <button
                    disabled={isSubmitting || hasShortages}
                    onClick={() => handleSave("done")}
                    className="px-3 py-1.5 bg-status-done text-white font-medium rounded hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-40 flex items-center gap-1"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    Validate & Deliver (Deduct Stock)
                  </button>
                </>
              ) : (
                <>
                  {delivery.state === "draft" && (
                    <>
                      <button
                        disabled={isSubmitting}
                        onClick={() => handleTransitionAction("waiting")}
                        className="px-3 py-1.5 bg-status-waiting text-white font-medium rounded hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
                      >
                        Mark as Waiting
                      </button>
                      <button
                        disabled={isSubmitting || hasShortages}
                        onClick={() => handleTransitionAction("ready")}
                        className="px-3 py-1.5 bg-status-ready text-white font-medium rounded hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-40"
                      >
                        Mark as Ready
                      </button>
                    </>
                  )}

                  {delivery.state === "waiting" && (
                    <button
                      disabled={isSubmitting || hasShortages}
                      onClick={() => handleTransitionAction("ready")}
                      className="px-3 py-1.5 bg-status-ready text-white font-medium rounded hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-40"
                    >
                      Mark as Ready
                    </button>
                  )}

                  {delivery.state === "ready" && (
                    <button
                      disabled={isSubmitting}
                      onClick={() => handleTransitionAction("done")}
                      className="px-3 py-1.5 bg-status-done text-white font-medium rounded hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      Validate Delivery (Commit OUT to Ledger)
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
                    Print Packing Slip
                  </button>
                </>
              )}
            </div>

            {isDone && (
              <div className="flex items-center gap-1 text-[11px] text-status-done font-medium bg-green-50 border border-status-done/20 px-2 py-1 rounded">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Immutable Ledger Entry • Dispatched</span>
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
                id="delivery-customer"
                label="Customer / Recipient"
                placeholder="e.g. Modern Logistics Ltd"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                disabled={isImmutable}
                required
              />

              <FormGroup
                id="delivery-address"
                label="Delivery Address / Destination"
                placeholder="e.g. 742 Evergreen Terrace, Sector 4"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                disabled={isImmutable}
              />

              <div className="flex flex-col space-y-1 text-left">
                <label
                  htmlFor="delivery-warehouse"
                  className="text-[13px] font-medium text-primary-muted select-none flex items-center gap-1"
                >
                  <Building className="w-3 h-3 text-primary-muted" />
                  Source Warehouse
                </label>
                <select
                  id="delivery-warehouse"
                  value={warehouseId}
                  onChange={(e) => setWarehouseId(e.target.value)}
                  disabled={isImmutable || !isNew}
                  className="h-9 px-3 text-sm text-primary bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent disabled:bg-background-subtle disabled:cursor-not-allowed"
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
                  htmlFor="delivery-location"
                  className="text-[13px] font-medium text-primary-muted select-none"
                >
                  Source Location (Picking)
                </label>
                <select
                  id="delivery-location"
                  value={fromLocationId}
                  onChange={(e) => setFromLocationId(e.target.value)}
                  disabled={isImmutable || !isNew}
                  className="h-9 px-3 text-sm text-primary bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent disabled:bg-background-subtle disabled:cursor-not-allowed"
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
                  htmlFor="delivery-date"
                  className="text-[13px] font-medium text-primary-muted select-none flex items-center gap-1"
                >
                  <Calendar className="w-3 h-3 text-primary-muted" />
                  Scheduled Date
                </label>
                <input
                  id="delivery-date"
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  disabled={isImmutable}
                  className="h-9 px-3 text-sm text-primary bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent disabled:bg-background-subtle disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Approved Layout: Tabular Line Items with Option 1 Inline Warning Tag */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-primary">
                    Product Dispatch Lines
                  </h3>
                  <p className="text-[11px] text-primary-muted">
                    Stock availability is verified against the source picking location in real time.
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
                      <th className="px-4 py-2.5 w-44">Stock Availability</th>
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
                        {/* Option 1: Inline Warning Tag */}
                        <td className="px-4 py-2">
                          {line.isShortage ? (
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-red-50 text-status-late border border-status-late/20">
                              <AlertTriangle className="w-3 h-3 text-status-late shrink-0" />
                              <span>
                                Shortage: {line.availableStock ?? 0} on-hand (deficit:{" "}
                                {line.quantity - (line.availableStock ?? 0)})
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

              {/* Line Summary Footer */}
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 px-4 py-2 bg-background-subtle rounded border border-border text-xs">
                <span className="text-primary-muted">
                  Total Dispatch Lines:{" "}
                  <strong className="text-primary">{lines.length}</strong>
                </span>
                <div className="flex items-center space-x-4">
                  {hasShortages && (
                    <span className="text-status-late font-medium flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-status-late" />
                      Deficit detected in order
                    </span>
                  )}
                  <span className="text-primary font-mono">
                    Total Quantity:{" "}
                    <strong className="text-accent">{totalUnits} units</strong>
                  </span>
                </div>
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
