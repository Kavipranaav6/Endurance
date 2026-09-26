import React from "react";
import { ReceiptSummary } from "@stocksense/schemas";
import { Clock, MapPin, User, Package } from "lucide-react";

interface ReceiptsKanbanCardProps {
  receipt: ReceiptSummary;
  onSelect: (receipt: ReceiptSummary) => void;
}

const statusTopBorder: Record<string, string> = {
  draft: "border-t-gray-400",
  waiting: "border-t-status-waiting",
  ready: "border-t-status-ready",
  done: "border-t-status-done",
  cancelled: "border-t-gray-500",
};

const statusBadgeStyles: Record<string, string> = {
  draft: "text-gray-600 bg-gray-100 border-gray-200",
  waiting: "text-status-waiting bg-amber-50 border-status-waiting/20",
  ready: "text-status-ready bg-blue-50 border-status-ready/20",
  done: "text-status-done bg-green-50 border-status-done/20",
  cancelled: "text-gray-500 bg-gray-100 border-gray-300",
};

/**
 * Approved Layout: Option 1 (Structured Header Card)
 * - 1px border with status top border accent
 * - Reference (font-mono font-semibold), Date, Supplier/Partner
 * - Item count + total quantity summary
 * - Location indicator and Responsible user badge
 */
export const ReceiptsKanbanCard: React.FC<ReceiptsKanbanCardProps> = ({
  receipt,
  onSelect,
}) => {
  return (
    <div
      onClick={() => onSelect(receipt)}
      className={`bg-background border border-border border-t-4 ${
        statusTopBorder[receipt.state] || "border-t-gray-400"
      } rounded-md p-3.5 shadow-sm hover:shadow transition-all cursor-pointer select-none space-y-2.5`}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono font-semibold text-xs text-primary tracking-tight">
          {receipt.reference}
        </span>
        <span
          className={`px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded border ${
            statusBadgeStyles[receipt.state] || statusBadgeStyles.draft
          }`}
        >
          {receipt.state}
        </span>
      </div>

      <div>
        <p className="text-xs font-semibold text-primary truncate">
          {receipt.contact}
        </p>
        <p className="text-[11px] text-primary-muted flex items-center gap-1 mt-0.5 truncate">
          <MapPin className="w-3 h-3 flex-shrink-0" />
          <span>
            {receipt.warehouseName ? `${receipt.warehouseName} / ` : ""}
            {receipt.toLocationName || "Stock"}
          </span>
        </p>
      </div>

      <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] text-primary-muted">
        <span className="flex items-center gap-1">
          <Package className="w-3 h-3 text-primary-muted" />
          <span>
            <strong className="text-primary font-medium">{receipt.itemCount}</strong>{" "}
            item{receipt.itemCount !== 1 ? "s" : ""} •{" "}
            <strong className="text-primary font-medium">{receipt.totalQuantity}</strong> units
          </span>
        </span>

        {receipt.scheduleDate && (
          <span className="flex items-center gap-1 text-[10px]">
            <Clock className="w-2.5 h-2.5 text-primary-muted" />
            {new Date(receipt.scheduleDate).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </span>
        )}
      </div>

      {receipt.responsibleUserName && (
        <div className="flex items-center gap-1 text-[10px] text-primary-muted">
          <User className="w-2.5 h-2.5" />
          <span className="truncate">{receipt.responsibleUserName}</span>
        </div>
      )}
    </div>
  );
};
