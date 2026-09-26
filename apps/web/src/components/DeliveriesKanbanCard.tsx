import React from "react";
import { DeliverySummary } from "@stocksense/schemas";
import { Clock, MapPin, User, Package, AlertTriangle } from "lucide-react";

interface DeliveriesKanbanCardProps {
  delivery: DeliverySummary;
  onSelect: (delivery: DeliverySummary) => void;
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
 * - Reference (font-mono font-semibold), Customer/Recipient, Date
 * - Stock Shortage alert flag
 * - Item count + total quantity summary
 * - Location indicator and Responsible user badge
 */
export const DeliveriesKanbanCard: React.FC<DeliveriesKanbanCardProps> = ({
  delivery,
  onSelect,
}) => {
  return (
    <div
      onClick={() => onSelect(delivery)}
      className={`bg-background border border-border border-t-4 ${
        statusTopBorder[delivery.state] || "border-t-gray-400"
      } rounded-md p-3.5 shadow-xs hover:shadow transition-all cursor-pointer select-none space-y-2.5`}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono font-semibold text-xs text-primary tracking-tight">
          {delivery.reference}
        </span>
        <span
          className={`px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded border ${
            statusBadgeStyles[delivery.state] || statusBadgeStyles.draft
          }`}
        >
          {delivery.state}
        </span>
      </div>

      <div>
        <p className="text-xs font-semibold text-primary truncate">
          {delivery.contact}
        </p>
        <p className="text-[11px] text-primary-muted flex items-center gap-1 mt-0.5 truncate">
          <MapPin className="w-3 h-3 flex-shrink-0" />
          <span>
            {delivery.warehouseName ? `${delivery.warehouseName} / ` : ""}
            {delivery.fromLocationName || "Stock"}
          </span>
        </p>
      </div>

      {delivery.state !== "done" && delivery.state !== "cancelled" && delivery.hasShortage && (
        <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 border border-amber-200 text-amber-800 text-[10px] rounded font-medium">
          <AlertTriangle className="w-3 h-3 flex-shrink-0 text-amber-600" />
          <span className="truncate">Insufficient inventory at source location</span>
        </div>
      )}

      <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] text-primary-muted">
        <span className="flex items-center gap-1">
          <Package className="w-3 h-3 text-primary-muted" />
          <span>
            <strong className="text-primary font-medium">{delivery.itemCount}</strong>{" "}
            item{delivery.itemCount !== 1 ? "s" : ""} •{" "}
            <strong className="text-primary font-medium">{delivery.totalQuantity}</strong> units
          </span>
        </span>

        {delivery.scheduleDate && (
          <span className="flex items-center gap-1 text-[10px]">
            <Clock className="w-2.5 h-2.5 text-primary-muted" />
            {new Date(delivery.scheduleDate).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </span>
        )}
      </div>

      {delivery.responsibleUserName && (
        <div className="flex items-center gap-1 text-[10px] text-primary-muted">
          <User className="w-2.5 h-2.5" />
          <span className="truncate">{delivery.responsibleUserName}</span>
        </div>
      )}
    </div>
  );
};
