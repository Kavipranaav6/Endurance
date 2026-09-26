import React from "react";
import { LucideIcon } from "lucide-react";

interface KPITileProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  subtext?: string;
  isAlert?: boolean;
}

/**
 * Approved Layout: Option 1 (Calm ERP Metric Card)
 * - Symmetric 1px bordered cards (#E5E7EB), white background (#FFFFFF)
 * - Subdued 12px uppercase label (#6B7280)
 * - Prominent 24px semi-bold numeric value (#1A1A1A)
 * - Discrete Lucide line icon in top-right
 * - Quiet red indicator text (#DC2626) when threshold is crossed
 */
export const KPITile: React.FC<KPITileProps> = ({
  label,
  value,
  icon: Icon,
  subtext,
  isAlert = false,
}) => {
  return (
    <div
      className={`border rounded bg-surface p-4 flex flex-col justify-between transition-colors ${
        isAlert
          ? "border-status-late/40 bg-red-50/20"
          : "border-border hover:border-primary-muted/30"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-primary-muted">
          {label}
        </span>
        <div
          className={`p-1.5 rounded ${
            isAlert ? "text-status-late bg-red-100/50" : "text-primary-muted bg-background-subtle"
          }`}
        >
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="mt-3">
        <div
          className={`text-2xl font-semibold tracking-tight ${
            isAlert ? "text-status-late" : "text-primary"
          }`}
        >
          {value}
        </div>
        {subtext && (
          <p
            className={`text-xs mt-1 truncate ${
              isAlert ? "text-status-late font-medium" : "text-primary-muted"
            }`}
          >
            {subtext}
          </p>
        )}
      </div>
    </div>
  );
};
