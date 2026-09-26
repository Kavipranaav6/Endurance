import React from "react";
import { DeliverySummary } from "@stocksense/schemas";
import { Clock, AlertTriangle, Check } from "lucide-react";

interface DeliveriesTableRowProps {
  delivery: DeliverySummary;
  onSelect: (delivery: DeliverySummary) => void;
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
 * - Monospace reference, Customer/Recipient, Source Location, Scheduled Date
 * - Stock Shortage indicator pill, Items/Qty counts, Status pill
 */
export const DeliveriesTableRow: React.FC<DeliveriesTableRowProps> = ({
  delivery,
  onSelect,
}) => {
  return (
    <tr
      onClick={() => onSelect(delivery)}
      className="h-11 border-b border-border hover:bg-background-subtle cursor-pointer transition-colors text-xs select-none"
    >
      <td className="px-4 font-mono font-semibold text-primary">
        {delivery.reference}
      </td>
      <td className="px-4 font-medium text-primary">
        {delivery.contact}
      </td>
      <td className="px-4 text-primary-muted truncate max-w-[180px]">
        {delivery.warehouseName ? `${delivery.warehouseName} / ` : ""}
        {delivery.fromLocationName || "Stock"}
      </td>
      <td className="px-4 text-primary-muted">
        {delivery.scheduleDate ? (
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-primary-muted" />
            {new Date(delivery.scheduleDate).toLocaleDateString(undefined, {
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
        {delivery.itemCount} line{delivery.itemCount !== 1 ? "s" : ""} •{" "}
        <span className="font-semibold">{delivery.totalQuantity}</span> units
      </td>
      <td className="px-4 text-center">
        {delivery.state !== "done" && delivery.state !== "cancelled" ? (
          delivery.hasShortage ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded">
              <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
              Shortage
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded">
              <Check className="w-2.5 h-2.5 text-emerald-600" />
              In Stock
            </span>
          )
        ) : (
          <span className="text-primary-muted text-[11px]">—</span>
        )}
      </td>
      <td className="px-4 text-center">
        <span
          className={`inline-block px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded border ${
            statusPillStyles[delivery.state] || statusPillStyles.draft
          }`}
        >
          {delivery.state}
        </span>
      </td>
    </tr>
  );
};
