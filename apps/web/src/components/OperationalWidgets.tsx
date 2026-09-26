import React from "react";
import { ArrowDownLeft, ArrowUpRight, Clock, Plus } from "lucide-react";
import { OperationalWidgetSummary } from "@stocksense/schemas";

interface OperationalWidgetsProps {
  summary: OperationalWidgetSummary;
  onNavigateToMove?: (moveId: string) => void;
  onNewReceipt?: () => void;
  onNewDelivery?: () => void;
}

const statusPillStyles: Record<string, string> = {
  draft: "text-status-draft bg-gray-100 border-gray-200",
  waiting: "text-status-waiting bg-amber-50 border-status-waiting/20",
  ready: "text-status-ready bg-blue-50 border-status-ready/20",
  done: "text-status-done bg-green-50 border-status-done/20",
  cancelled: "text-status-cancelled bg-gray-100 border-gray-300",
};

export const OperationalWidgets: React.FC<OperationalWidgetsProps> = ({
  summary,
  onNavigateToMove,
  onNewReceipt,
  onNewDelivery,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Receipts Quick-Access Widget */}
      <div className="border border-border rounded bg-surface flex flex-col justify-between">
        <div>
          <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-background-subtle">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded bg-blue-50 text-status-ready">
                <ArrowDownLeft className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-primary">Receipts</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-xs font-medium text-status-ready bg-blue-50 rounded border border-status-ready/20">
                {summary.receipts.pendingCount} to receive
              </span>
              {summary.receipts.readyCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-medium text-primary-muted bg-gray-100 rounded border border-border">
                  {summary.receipts.readyCount} ready
                </span>
              )}
            </div>
          </div>

          <div className="divide-y divide-border/60">
            {summary.receipts.items.length === 0 ? (
              <div className="p-6 text-center text-xs text-primary-muted">
                No pending receipts matching active filters.
              </div>
            ) : (
              summary.receipts.items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onNavigateToMove?.(item.id)}
                  className="px-4 py-2.5 flex items-center justify-between text-xs hover:bg-background-subtle/70 cursor-pointer transition-colors"
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-medium text-primary">
                        {item.reference}
                      </span>
                      <span className="text-primary-muted truncate max-w-[150px]">
                        • {item.contact || "Direct"}
                      </span>
                    </div>
                    <div className="text-[11px] text-primary-muted mt-0.5 truncate">
                      {item.productName} ({item.quantity} units)
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.scheduleDate && (
                      <span className="text-[11px] text-primary-muted flex items-center gap-1 hidden sm:flex">
                        <Clock className="w-3 h-3" />
                        {new Date(item.scheduleDate).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    )}
                    <span
                      className={`px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded border ${
                        statusPillStyles[item.state] || statusPillStyles.draft
                      }`}
                    >
                      {item.state}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="p-3 border-t border-border bg-background-subtle/50 flex justify-between items-center text-xs">
          <span className="text-primary-muted">Inbound warehouse logistics</span>
          {onNewReceipt && (
            <button
              onClick={onNewReceipt}
              className="h-7 px-2.5 bg-accent hover:bg-accent-hover text-white rounded font-medium flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Receipt</span>
            </button>
          )}
        </div>
      </div>

      {/* Deliveries Quick-Access Widget */}
      <div className="border border-border rounded bg-surface flex flex-col justify-between">
        <div>
          <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-background-subtle">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded bg-amber-50 text-status-waiting">
                <ArrowUpRight className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-primary">Delivery Orders</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-xs font-medium text-status-waiting bg-amber-50 rounded border border-status-waiting/20">
                {summary.deliveries.pendingCount} to deliver
              </span>
              {summary.deliveries.readyCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-medium text-status-ready bg-blue-50 rounded border border-status-ready/20">
                  {summary.deliveries.readyCount} ready
                </span>
              )}
            </div>
          </div>

          <div className="divide-y divide-border/60">
            {summary.deliveries.items.length === 0 ? (
              <div className="p-6 text-center text-xs text-primary-muted">
                No pending deliveries matching active filters.
              </div>
            ) : (
              summary.deliveries.items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onNavigateToMove?.(item.id)}
                  className="px-4 py-2.5 flex items-center justify-between text-xs hover:bg-background-subtle/70 cursor-pointer transition-colors"
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-medium text-primary">
                        {item.reference}
                      </span>
                      <span className="text-primary-muted truncate max-w-[150px]">
                        • {item.contact || "Customer"}
                      </span>
                    </div>
                    <div className="text-[11px] text-primary-muted mt-0.5 truncate">
                      {item.productName} ({item.quantity} units)
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.scheduleDate && (
                      <span className="text-[11px] text-primary-muted flex items-center gap-1 hidden sm:flex">
                        <Clock className="w-3 h-3" />
                        {new Date(item.scheduleDate).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    )}
                    <span
                      className={`px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded border ${
                        statusPillStyles[item.state] || statusPillStyles.draft
                      }`}
                    >
                      {item.state}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="p-3 border-t border-border bg-background-subtle/50 flex justify-between items-center text-xs">
          <span className="text-primary-muted">Outbound warehouse logistics</span>
          {onNewDelivery && (
            <button
              onClick={onNewDelivery}
              className="h-7 px-2.5 bg-accent hover:bg-accent-hover text-white rounded font-medium flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Delivery</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
