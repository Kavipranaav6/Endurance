import React from "react";
import { TransferSummary } from "@stocksense/schemas";
import { Clock, ArrowRight, AlertTriangle, Check } from "lucide-react";

interface TransfersTableRowProps {
  transfer: TransferSummary;
  onSelect: (transfer: TransferSummary) => void;
}

const statusPillStyles: Record<string, string> = {
  draft: "text-status-draft bg-gray-100 border-gray-200",
  waiting: "text-status-waiting bg-amber-50 border-status-waiting/20",
  ready: "text-status-ready bg-blue-50 border-status-ready/20",
  done: "text-status-done bg-green-50 border-status-done/20",
  cancelled: "text-status-cancelled bg-gray-100 border-gray-300",
};

/**
 * Approved Layout: Option 1 (Dense ERP Data Row)
 * - 44px (h-11) height, bordered row, hover highlight
 * - Reference, Source Location -> Destination Location route, Date, Items & Qty, Status
 */
export const TransfersTableRow: React.FC<TransfersTableRowProps> = ({
  transfer,
  onSelect,
}) => {
  return (
    <tr
      onClick={() => onSelect(transfer)}
      className="h-11 border-b border-border hover:bg-background-subtle cursor-pointer transition-colors text-xs select-none"
    >
      <td className="px-4 font-mono font-semibold text-primary">
        {transfer.reference}
      </td>
      <td className="px-4 text-primary">
        <div className="flex items-center gap-1.5 truncate max-w-[280px]">
          <span className="font-medium text-primary">
            {transfer.fromLocationName || "Source"}
          </span>
          <ArrowRight className="w-3 h-3 text-primary-muted shrink-0" />
          <span className="font-medium text-accent">
            {transfer.toLocationName || "Destination"}
          </span>
        </div>
      </td>
      <td className="px-4 text-primary-muted">
        {transfer.scheduleDate ? (
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-primary-muted" />
            {new Date(transfer.scheduleDate).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        ) : (
          "—"
        )}
      </td>
      <td className="px-4 font-mono text-right text-primary">
        {transfer.itemCount} line{transfer.itemCount !== 1 ? "s" : ""} •{" "}
        <span className="font-semibold">{transfer.totalQuantity}</span> units
      </td>
      <td className="px-4 text-center">
        {transfer.state !== "done" && transfer.state !== "cancelled" ? (
          transfer.hasShortage ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded">
              <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
              Source Low
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded">
              <Check className="w-2.5 h-2.5 text-emerald-600" />
              Available
            </span>
          )
        ) : (
          <span className="text-primary-muted text-[11px]">—</span>
        )}
      </td>
      <td className="px-4 text-center">
        <span
          className={`inline-block px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded border ${
            statusPillStyles[transfer.state] || statusPillStyles.draft
          }`}
        >
          {transfer.state}
        </span>
      </td>
    </tr>
  );
};
