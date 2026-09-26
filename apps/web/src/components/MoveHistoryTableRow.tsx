import React from "react";
import { StockMove } from "@stocksense/schemas";
import { Clock, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";

interface MoveHistoryTableRowProps {
  move: StockMove & {
    product?: { name: string; sku: string; unitOfMeasure?: string };
    fromLocation?: { name: string; warehouse?: { name: string } };
    toLocation?: { name: string; warehouse?: { name: string } };
  };
  onSelect: (move: any) => void;
}

const typeBadgeStyles: Record<string, string> = {
  IN: "text-emerald-700 bg-emerald-50 border-emerald-200",
  OUT: "text-amber-700 bg-amber-50 border-amber-200",
  INTERNAL: "text-blue-700 bg-blue-50 border-blue-200",
  ADJUSTMENT: "text-purple-700 bg-purple-50 border-purple-200",
};

const statusPillStyles: Record<string, string> = {
  draft: "text-status-draft bg-gray-100 border-gray-200",
  waiting: "text-status-waiting bg-amber-50 border-status-waiting/20",
  ready: "text-status-ready bg-blue-50 border-status-ready/20",
  done: "text-status-done bg-green-50 border-status-done/20",
  cancelled: "text-status-cancelled bg-gray-100 border-gray-300",
};

export const MoveHistoryTableRow: React.FC<MoveHistoryTableRowProps> = ({
  move,
  onSelect,
}) => {
  // Check if move is late / overdue
  const isLate =
    Boolean(move.scheduleDate) &&
    new Date(move.scheduleDate!) < new Date() &&
    move.state !== "done" &&
    move.state !== "cancelled";

  return (
    <tr
      onClick={() => onSelect(move)}
      className="h-11 border-b border-border hover:bg-background-subtle cursor-pointer transition-colors text-xs select-none"
    >
      {/* Monospace Reference */}
      <td className="px-4 font-mono font-semibold text-primary">
        {move.reference}
      </td>

      {/* Operation Type Badge */}
      <td className="px-3 text-center">
        <span
          className={`inline-block px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded border ${
            typeBadgeStyles[move.type] || "bg-gray-100 text-gray-700"
          }`}
        >
          {move.type}
        </span>
      </td>

      {/* Product & SKU */}
      <td className="px-4">
        <div className="flex flex-col">
          <span className="font-medium text-primary truncate max-w-[200px]">
            {move.product?.name || "Product"}
          </span>
          <span className="font-mono text-[10px] text-primary-muted">
            {move.product?.sku || "SKU"}
          </span>
        </div>
      </td>

      {/* Route: From -> To */}
      <td className="px-4 text-primary-muted">
        <div className="flex items-center gap-1.5 truncate max-w-[220px]">
          <span className="font-medium text-primary truncate">
            {move.fromLocation?.name || (move.type === "IN" ? "Vendor / Supplier" : "—")}
          </span>
          <ArrowRight className="w-3 h-3 text-primary-muted shrink-0" />
          <span className="font-medium text-accent truncate">
            {move.toLocation?.name || (move.type === "OUT" ? "Customer / Recipient" : "—")}
          </span>
        </div>
      </td>

      {/* Partner / Contact / Reason */}
      <td className="px-4 text-primary truncate max-w-[160px]">
        {move.contact || "—"}
      </td>

      {/* Quantity & UoM */}
      <td className="px-4 font-mono text-right text-primary">
        <span className="font-semibold">{move.quantity}</span>{" "}
        <span className="text-[10px] text-primary-muted">
          {move.product?.unitOfMeasure || "Units"}
        </span>
      </td>

      {/* Scheduled / Done Date with Color Coding */}
      <td className="px-4">
        {isLate ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-status-late bg-red-50 px-1.5 py-0.5 rounded border border-status-late/20">
            <AlertCircle className="w-3 h-3 text-status-late" />
            <span>
              Late (
              {new Date(move.scheduleDate!).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
              )
            </span>
          </span>
        ) : move.state === "done" && move.doneAt ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-status-done">
            <CheckCircle2 className="w-3 h-3 text-status-done" />
            <span>
              {new Date(move.doneAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </span>
          </span>
        ) : move.scheduleDate ? (
          <span className="flex items-center gap-1 text-[11px] text-primary-muted">
            <Clock className="w-3 h-3 text-primary-muted" />
            <span>
              {new Date(move.scheduleDate).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </span>
          </span>
        ) : (
          <span className="text-primary-muted text-[11px]">—</span>
        )}
      </td>

      {/* Status Pill */}
      <td className="px-4 text-center">
        <span
          className={`inline-block px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded border ${
            statusPillStyles[move.state] || statusPillStyles.draft
          }`}
        >
          {move.state}
        </span>
      </td>
    </tr>
  );
};
