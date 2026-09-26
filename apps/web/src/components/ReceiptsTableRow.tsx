import React from "react";
import { ReceiptSummary } from "@stocksense/schemas";
import { Clock } from "lucide-react";

interface ReceiptsTableRowProps {
  receipt: ReceiptSummary;
  onSelect: (receipt: ReceiptSummary) => void;
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
 * - Bordered row (h-11, #E5E7EB bottom border), hover highlight (#FAFAFA)
 * - Columns: Reference (monospace bold #1A1A1A), Contact/Supplier (13px),
 *   Destination Location, Scheduled Date (#6B7280), Item Count / Total Qty, Status pill
 */
export const ReceiptsTableRow: React.FC<ReceiptsTableRowProps> = ({
  receipt,
  onSelect,
}) => {
  return (
    <tr
      onClick={() => onSelect(receipt)}
      className="h-11 border-b border-border hover:bg-background-subtle cursor-pointer transition-colors text-xs select-none"
    >
      <td className="px-4 font-mono font-semibold text-primary">
        {receipt.reference}
      </td>
      <td className="px-4 font-medium text-primary">
        {receipt.contact}
      </td>
      <td className="px-4 text-primary-muted truncate max-w-[180px]">
        {receipt.warehouseName ? `${receipt.warehouseName} / ` : ""}
        {receipt.toLocationName || "Warehouse"}
      </td>
      <td className="px-4 text-primary-muted">
        {receipt.scheduleDate ? (
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-primary-muted" />
            {new Date(receipt.scheduleDate).toLocaleDateString(undefined, {
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
        {receipt.itemCount} line{receipt.itemCount !== 1 ? "s" : ""} •{" "}
        <span className="font-semibold">{receipt.totalQuantity}</span> units
      </td>
      <td className="px-4 text-center">
        <span
          className={`inline-block px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded border ${
            statusPillStyles[receipt.state] || statusPillStyles.draft
          }`}
        >
          {receipt.state}
        </span>
      </td>
    </tr>
  );
};
