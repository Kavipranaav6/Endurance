import React from "react";
import { Filter, RotateCcw, Radio } from "lucide-react";
import { DashboardFilter } from "@stocksense/schemas";

interface DashboardFilterBarProps {
  filter: DashboardFilter;
  onChange: (updated: DashboardFilter) => void;
  warehouses: Array<{ id: string; name: string }>;
  categories: string[];
  isWsConnected: boolean;
}

/**
 * Approved Layout: Option 1 (Integrated Tooling Bar)
 * - 40px height toolbar with 1px border
 * - Segmented filter controls with subtle borders and clear/reset indicator
 * - Real-time WebSocket connection pulse badge
 */
export const DashboardFilterBar: React.FC<DashboardFilterBarProps> = ({
  filter,
  onChange,
  warehouses,
  categories,
  isWsConnected,
}) => {
  const isFiltered =
    filter.docType !== "ALL" ||
    filter.status !== "ALL" ||
    filter.warehouseId !== "ALL" ||
    filter.category !== "ALL";

  const handleReset = () => {
    onChange({
      docType: "ALL",
      status: "ALL",
      warehouseId: "ALL",
      category: "ALL",
    });
  };

  return (
    <div className="w-full h-11 px-3 border border-border rounded bg-surface flex items-center justify-between gap-3 text-xs">
      <div className="flex items-center gap-2 overflow-x-auto py-1">
        <div className="flex items-center gap-1.5 text-primary-muted font-medium pr-2 border-r border-border">
          <Filter className="w-3.5 h-3.5" />
          <span>Filters</span>
        </div>

        {/* Doc Type Selector */}
        <select
          value={filter.docType}
          onChange={(e) => onChange({ ...filter, docType: e.target.value as any })}
          className="h-7 px-2 bg-background border border-border rounded text-primary focus:outline-none focus:ring-1 focus:ring-accent"
        >
          <option value="ALL">All Documents</option>
          <option value="RECEIPT">Receipts (IN)</option>
          <option value="DELIVERY">Delivery Orders (OUT)</option>
          <option value="INTERNAL">Internal Transfers</option>
          <option value="ADJUSTMENT">Adjustments</option>
        </select>

        {/* Status Selector */}
        <select
          value={filter.status}
          onChange={(e) => onChange({ ...filter, status: e.target.value as any })}
          className="h-7 px-2 bg-background border border-border rounded text-primary focus:outline-none focus:ring-1 focus:ring-accent"
        >
          <option value="ALL">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="waiting">Waiting</option>
          <option value="ready">Ready</option>
          <option value="done">Done</option>
        </select>

        {/* Warehouse Selector */}
        <select
          value={filter.warehouseId}
          onChange={(e) => onChange({ ...filter, warehouseId: e.target.value })}
          className="h-7 px-2 bg-background border border-border rounded text-primary focus:outline-none focus:ring-1 focus:ring-accent"
        >
          <option value="ALL">All Warehouses</option>
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>

        {/* Category Selector */}
        <select
          value={filter.category}
          onChange={(e) => onChange({ ...filter, category: e.target.value })}
          className="h-7 px-2 bg-background border border-border rounded text-primary focus:outline-none focus:ring-1 focus:ring-accent"
        >
          <option value="ALL">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        {/* Clear Filters Button */}
        {isFiltered && (
          <button
            onClick={handleReset}
            className="h-7 px-2 text-primary-muted hover:text-primary flex items-center gap-1 border border-dashed border-border rounded transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Live WebSocket status indicator */}
      <div className="flex items-center gap-2 pl-3 border-l border-border shrink-0">
        <span
          className={`w-2 h-2 rounded-full ${
            isWsConnected ? "bg-status-done animate-pulse" : "bg-status-waiting"
          }`}
        />
        <div className="flex items-center gap-1 text-[11px] font-medium text-primary-muted">
          <Radio className="w-3 h-3" />
          <span>{isWsConnected ? "Live Feed" : "Connecting..."}</span>
        </div>
      </div>
    </div>
  );
};
