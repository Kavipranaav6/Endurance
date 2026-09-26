import React from "react";
import { TransferSummary } from "@stocksense/schemas";
import { Clock, ArrowRight, Package, AlertTriangle } from "lucide-react";

interface TransfersKanbanCardProps {
  transfer: TransferSummary;
  onSelect: (transfer: TransferSummary) => void;
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

export const TransfersKanbanCard: React.FC<TransfersKanbanCardProps> = ({
  transfer,
  onSelect,
}) => {
  return (
    <div
      onClick={() => onSelect(transfer)}
      className={`bg-background border border-border border-t-4 ${
        statusTopBorder[transfer.state] || "border-t-gray-400"
      } rounded-md p-3.5 shadow-xs hover:shadow transition-all cursor-pointer select-none space-y-2.5`}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono font-semibold text-xs text-primary tracking-tight">
          {transfer.reference}
        </span>
        <span
          className={`px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded border ${
            statusBadgeStyles[transfer.state] || statusBadgeStyles.draft
          }`}
        >
          {transfer.state}
        </span>
      </div>

      <div className="text-xs">
        <div className="flex items-center gap-1.5 text-primary">
          <span className="font-medium truncate max-w-[110px]">
            {transfer.fromLocationName || "Source"}
          </span>
          <ArrowRight className="w-3 h-3 text-primary-muted shrink-0" />
          <span className="font-medium text-accent truncate max-w-[110px]">
            {transfer.toLocationName || "Destination"}
          </span>
        </div>
        <p className="text-[11px] text-primary-muted mt-0.5 truncate">
          {transfer.warehouseName || "Warehouse"}
        </p>
      </div>

      {transfer.state !== "done" && transfer.state !== "cancelled" && transfer.hasShortage && (
        <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 border border-amber-200 text-amber-800 text-[10px] rounded font-medium">
          <AlertTriangle className="w-3 h-3 flex-shrink-0 text-amber-600" />
          <span className="truncate">Insufficient inventory at source bin</span>
        </div>
      )}

      <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] text-primary-muted">
        <span className="flex items-center gap-1">
          <Package className="w-3 h-3 text-primary-muted" />
          <span>
            <strong className="text-primary font-medium">{transfer.itemCount}</strong>{" "}
            item{transfer.itemCount !== 1 ? "s" : ""} •{" "}
            <strong className="text-primary font-medium">{transfer.totalQuantity}</strong> units
          </span>
        </span>

        {transfer.scheduleDate && (
          <span className="flex items-center gap-1 text-[10px]">
            <Clock className="w-2.5 h-2.5 text-primary-muted" />
            {new Date(transfer.scheduleDate).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </span>
        )}
      </div>
    </div>
  );
};
