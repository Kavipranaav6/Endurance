import React from "react";
import {
  X,
  ShieldCheck,
  Package,
  Calendar,
  User,
  Clock,
  ArrowRight,
  FileText,
} from "lucide-react";

interface MoveHistoryDetailModalProps {
  move: any;
  onClose: () => void;
}

export const MoveHistoryDetailModal: React.FC<MoveHistoryDetailModalProps> = ({
  move,
  onClose,
}) => {
  if (!move) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs overflow-y-auto">
      <div className="bg-background border border-border rounded-lg shadow-xl w-full max-w-2xl overflow-hidden text-primary">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border bg-background-subtle flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="font-mono text-base font-bold text-primary">
              {move.reference}
            </div>
            <span className="px-2 py-0.5 text-xs font-mono font-bold rounded border bg-primary/10 text-primary border-primary/20">
              {move.type}
            </span>
            <span
              className={`px-2 py-0.5 text-xs font-semibold uppercase tracking-wider rounded border ${
                move.state === "done"
                  ? "text-status-done bg-green-50 border-status-done/20"
                  : move.state === "ready"
                  ? "text-status-ready bg-blue-50 border-status-ready/20"
                  : move.state === "waiting"
                  ? "text-status-waiting bg-amber-50 border-status-waiting/20"
                  : "text-gray-600 bg-gray-100 border-gray-200"
              }`}
            >
              {move.state}
            </span>
          </div>

          <button
            onClick={onClose}
            className="text-primary-muted hover:text-primary transition-colors p-1 cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Ledger Stamp Banner */}
        <div className="px-6 py-2.5 bg-emerald-50/60 border-b border-emerald-100 flex items-center justify-between text-xs text-emerald-800">
          <div className="flex items-center gap-1.5 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Append-Only Ledger Move • Immutable Audit Entry</span>
          </div>
          <span className="font-mono text-[11px] text-emerald-700">
            ID: {move.id}
          </span>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 text-xs">
          {/* Movement Route Card */}
          <div className="bg-background-subtle p-4 rounded-md border border-border space-y-2">
            <div className="text-[11px] font-medium text-primary-muted uppercase tracking-wider">
              Movement Route
            </div>
            <div className="flex items-center justify-between py-1">
              <div className="space-y-0.5">
                <span className="text-[11px] text-primary-muted">Origin / From</span>
                <p className="text-sm font-semibold text-primary">
                  {move.fromLocation?.name || (move.type === "IN" ? "External Vendor" : "None")}
                </p>
              </div>

              <div className="p-2 rounded-full bg-background border border-border">
                <ArrowRight className="w-4 h-4 text-accent" />
              </div>

              <div className="space-y-0.5 text-right">
                <span className="text-[11px] text-primary-muted">Destination / To</span>
                <p className="text-sm font-semibold text-accent">
                  {move.toLocation?.name || (move.type === "OUT" ? "Customer Recipient" : "None")}
                </p>
              </div>
            </div>
          </div>

          {/* Product & Quantity Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="border border-border p-3 rounded-md space-y-1">
              <span className="text-[11px] text-primary-muted flex items-center gap-1">
                <Package className="w-3 h-3" />
                Product Details
              </span>
              <p className="text-sm font-semibold text-primary">
                {move.product?.name || "Product"}
              </p>
              <p className="font-mono text-primary-muted text-[11px]">
                SKU: {move.product?.sku || "—"}
              </p>
            </div>

            <div className="border border-border p-3 rounded-md space-y-1">
              <span className="text-[11px] text-primary-muted flex items-center gap-1">
                <FileText className="w-3 h-3" />
                Ledger Quantity
              </span>
              <p className="text-lg font-mono font-bold text-primary">
                {move.quantity}{" "}
                <span className="text-xs font-normal text-primary-muted">
                  {move.product?.unitOfMeasure || "Units"}
                </span>
              </p>
              <p className="text-[11px] text-primary-muted">
                Operation: <strong className="capitalize">{move.type.toLowerCase()}</strong>
              </p>
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-4 pt-1">
            <div className="space-y-1">
              <span className="text-primary-muted flex items-center gap-1">
                <User className="w-3 h-3" />
                Contact / Partner
              </span>
              <p className="font-medium text-primary">
                {move.contact || "Standard Internal Record"}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-primary-muted flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Scheduled Date
              </span>
              <p className="font-medium text-primary">
                {move.scheduleDate
                  ? new Date(move.scheduleDate).toLocaleDateString(undefined, {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "Immediate execution"}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-primary-muted flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Logged / Created At
              </span>
              <p className="font-mono text-primary-muted text-[11px]">
                {new Date(move.createdAt).toLocaleString()}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-primary-muted flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                Finalized / Done At
              </span>
              <p className="font-mono text-primary-muted text-[11px]">
                {move.doneAt ? new Date(move.doneAt).toLocaleString() : "Pending"}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border bg-background-subtle flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 border border-border rounded text-primary hover:bg-background transition-colors text-xs cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
