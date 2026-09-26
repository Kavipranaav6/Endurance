import React from "react";
import { StockMove } from "@stocksense/schemas";
import { Clock, ArrowRight, AlertCircle, Package } from "lucide-react";

interface MoveHistoryKanbanCardProps {
  move: StockMove & {
    product?: { name: string; sku: string; unitOfMeasure?: string };
    fromLocation?: { name: string };
    toLocation?: { name: string };
  };
  onSelect: (move: any) => void;
}

const statusTopBorder: Record<string, string> = {
  draft: "border-t-gray-400",
  waiting: "border-t-status-waiting",
  ready: "border-t-status-ready",
  done: "border-t-status-done",
  cancelled: "border-t-gray-500",
};

const typeBadgeStyles: Record<string, string> = {
  IN: "text-emerald-700 bg-emerald-50 border-emerald-200",
  OUT: "text-amber-700 bg-amber-50 border-amber-200",
  INTERNAL: "text-blue-700 bg-blue-50 border-blue-200",
  ADJUSTMENT: "text-purple-700 bg-purple-50 border-purple-200",
};

export const MoveHistoryKanbanCard: React.FC<MoveHistoryKanbanCardProps> = ({
  move,
  onSelect,
}) => {
  const isLate =
    Boolean(move.scheduleDate) &&
    new Date(move.scheduleDate!) < new Date() &&
    move.state !== "done" &&
    move.state !== "cancelled";

  return (
    <div
      onClick={() => onSelect(move)}
      className={`bg-background border border-border border-t-4 ${
        statusTopBorder[move.state] || "border-t-gray-400"
      } rounded-md p-3.5 shadow-xs hover:shadow transition-all cursor-pointer select-none space-y-2.5`}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono font-semibold text-xs text-primary">
          {move.reference}
        </span>
        <span
          className={`px-1.5 py-0.5 text-[9px] font-mono font-bold rounded border ${
            typeBadgeStyles[move.type] || "bg-gray-100 text-gray-700"
          }`}
        >
          {move.type}
        </span>
      </div>

      <div>
        <p className="text-xs font-semibold text-primary truncate">
          {move.product?.name || "Product"}
        </p>
        <p className="text-[10px] font-mono text-primary-muted">
          {move.product?.sku || "SKU"}
        </p>
      </div>

      <div className="text-[11px] text-primary-muted flex items-center gap-1.5 truncate">
        <span className="truncate">{move.fromLocation?.name || "External"}</span>
        <ArrowRight className="w-3 h-3 text-primary-muted shrink-0" />
        <span className="truncate text-accent">{move.toLocation?.name || "External"}</span>
      </div>

      {isLate && (
        <div className="flex items-center gap-1 px-2 py-0.5 bg-red-50 border border-status-late/20 text-status-late text-[10px] rounded font-medium">
          <AlertCircle className="w-3 h-3 flex-shrink-0" />
          <span>Scheduled date passed (Overdue)</span>
        </div>
      )}

      <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] text-primary-muted">
        <span className="flex items-center gap-1 font-mono">
          <Package className="w-3 h-3 text-primary-muted" />
          <strong className="text-primary">{move.quantity}</strong>{" "}
          <span>{move.product?.unitOfMeasure || "units"}</span>
        </span>

        {move.scheduleDate && (
          <span className="flex items-center gap-1 text-[10px]">
            <Clock className="w-2.5 h-2.5 text-primary-muted" />
            {new Date(move.scheduleDate).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </span>
        )}
      </div>
    </div>
  );
};
