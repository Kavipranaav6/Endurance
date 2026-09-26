import React, { useState, useEffect, useCallback } from "react";
import { DeliverySummary, CreateDeliveryInput } from "@stocksense/schemas";
import { trpcCall } from "../lib/api";
import { useStockWebSocket } from "../lib/useStockWebSocket";
import { DeliveriesTableRow } from "../components/DeliveriesTableRow";
import { DeliveriesKanbanCard } from "../components/DeliveriesKanbanCard";
import { DeliveryFormModal } from "../components/DeliveryFormModal";
import {
  Search,
  Plus,
  LayoutList,
  LayoutGrid,
  RefreshCw,
  ArrowUpRight,
  Filter,
} from "lucide-react";

interface DeliveriesPageProps {
  onNavigate?: (page: string) => void;
}

export const DeliveriesPage: React.FC<DeliveriesPageProps> = () => {
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState<string>("ALL");
  const [deliveries, setDeliveries] = useState<DeliverySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDelivery, setSelectedDelivery] = useState<DeliverySummary | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const [metadata, setMetadata] = useState<{
    warehouses: Array<{ id: string; name: string; shortCode: string }>;
    locations: Array<{ id: string; name: string; warehouseId: string }>;
    products: Array<{
      id: string;
      name: string;
      sku: string;
      unitOfMeasure: string;
      totalOnHand: number;
      totalFree: number;
    }>;
    stockLevels?: Array<{
      productId: string;
      locationId: string;
      onHand: number;
      freeToUse: number;
    }>;
  }>({
    warehouses: [],
    locations: [],
    products: [],
  });

  // Fetch delivery orders list
  const fetchDeliveries = useCallback(async () => {
    try {
      const data = await trpcCall<DeliverySummary[]>("delivery.list", "query", {
        search: search || undefined,
        state: stateFilter !== "ALL" ? stateFilter : undefined,
      });
      setDeliveries(data || []);
    } catch (err) {
      console.warn("Could not fetch deliveries:", err);
    } finally {
      setIsLoading(false);
    }
  }, [search, stateFilter]);

  // Fetch metadata (warehouses, locations, products, stock levels)
  const fetchMetadata = useCallback(async () => {
    try {
      const meta = await trpcCall<any>("delivery.getMetadata", "query");
      if (meta) {
        setMetadata(meta);
      }
    } catch (err) {
      console.warn("Could not fetch metadata:", err);
    }
  }, []);

  useEffect(() => {
    fetchMetadata();
  }, [fetchMetadata]);

  useEffect(() => {
    fetchDeliveries();
  }, [fetchDeliveries]);

  // Real-time synchronization
  const handleWsEvent = useCallback(
    (event: any) => {
      if (event.type === "LEDGER_WRITE" || event.type === "STATE_TRANSITION") {
        fetchDeliveries();
        fetchMetadata();
      }
    },
    [fetchDeliveries, fetchMetadata]
  );

  useStockWebSocket(handleWsEvent);

  const handleCreateDelivery = async (input: CreateDeliveryInput) => {
    await trpcCall("delivery.create", "mutation", input);
    await fetchDeliveries();
    await fetchMetadata();
  };

  const handleTransitionDelivery = async (
    reference: string,
    toState: "waiting" | "ready" | "done" | "cancelled"
  ) => {
    await trpcCall("delivery.transition", "mutation", { reference, toState });
    await fetchDeliveries();
    await fetchMetadata();
  };

  const handleOpenDetail = (d: DeliverySummary) => {
    setSelectedDelivery(d);
    setIsFormOpen(true);
  };

  const handleOpenNew = () => {
    setSelectedDelivery(null);
    setIsFormOpen(true);
  };

  // Group deliveries for Kanban columns
  const kanbanColumns: Array<{
    key: "draft" | "waiting" | "ready" | "done" | "cancelled";
    label: string;
    pillStyle: string;
  }> = [
    { key: "draft", label: "Draft", pillStyle: "bg-gray-100 text-gray-700" },
    { key: "waiting", label: "Waiting", pillStyle: "bg-amber-50 text-status-waiting" },
    { key: "ready", label: "Ready", pillStyle: "bg-blue-50 text-status-ready" },
    { key: "done", label: "Done", pillStyle: "bg-green-50 text-status-done" },
    { key: "cancelled", label: "Cancelled", pillStyle: "bg-gray-100 text-gray-500" },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header & Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 bg-accent/10 text-accent rounded">
              <ArrowUpRight className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-primary">
              Delivery Orders (Outbound Shipments)
            </h1>
          </div>
          <p className="text-xs text-primary-muted mt-1">
            Pick, pack, verify inventory availability, and record customer dispatches in the ledger
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              fetchDeliveries();
              fetchMetadata();
            }}
            className="p-2 border border-border rounded text-primary hover:bg-background-subtle transition-colors cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw className="w-4 h-4 text-primary-muted" />
          </button>

          {/* View Mode Switcher */}
          <div className="flex items-center border border-border rounded p-0.5 bg-background-subtle">
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded transition-colors ${
                viewMode === "list"
                  ? "bg-background shadow-xs text-primary font-medium"
                  : "text-primary-muted hover:text-primary"
              }`}
              title="List view"
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("kanban")}
              className={`p-1.5 rounded transition-colors ${
                viewMode === "kanban"
                  ? "bg-background shadow-xs text-primary font-medium"
                  : "text-primary-muted hover:text-primary"
              }`}
              title="Kanban view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleOpenNew}
            className="px-3.5 py-1.5 bg-accent hover:opacity-95 text-white font-medium text-xs rounded shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Delivery Order</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-background-subtle p-3 rounded-md border border-border">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-primary-muted" />
          <input
            type="text"
            placeholder="Search by reference, customer, or product..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-8 pl-8 pr-3 text-xs bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center space-x-1.5 overflow-x-auto text-xs">
          <Filter className="w-3.5 h-3.5 text-primary-muted mr-1 hidden sm:inline" />
          {["ALL", "draft", "waiting", "ready", "done", "cancelled"].map((st) => (
            <button
              key={st}
              onClick={() => setStateFilter(st)}
              className={`px-2.5 py-1 rounded transition-colors capitalize ${
                stateFilter === st
                  ? "bg-primary text-white font-medium"
                  : "text-primary-muted hover:text-primary hover:bg-background"
              }`}
            >
              {st.toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="text-center py-16 text-primary-muted text-xs animate-pulse">
          Loading outbound delivery orders...
        </div>
      ) : deliveries.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-lg bg-background-subtle/30 space-y-3">
          <ArrowUpRight className="w-8 h-8 text-primary-muted mx-auto" />
          <h3 className="text-sm font-semibold text-primary">No Delivery Orders Found</h3>
          <p className="text-xs text-primary-muted max-w-sm mx-auto">
            {search || stateFilter !== "ALL"
              ? "No delivery orders match your active search filters. Try resetting them."
              : "No outbound customer shipments currently recorded in the ledger."}
          </p>
          <button
            onClick={handleOpenNew}
            className="px-3 py-1.5 bg-accent text-white text-xs font-medium rounded hover:opacity-90 transition-opacity inline-flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Create First Delivery Order
          </button>
        </div>
      ) : viewMode === "list" ? (
        /* Approved Option 1 Dense Table View */
        <div className="border border-border rounded-md overflow-hidden bg-background">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-background-subtle border-b border-border text-[11px] font-semibold text-primary-muted uppercase tracking-wider select-none">
                <tr className="h-9">
                  <th className="px-4">Reference</th>
                  <th className="px-4">Customer / Recipient</th>
                  <th className="px-4">Source Location</th>
                  <th className="px-4">Scheduled Date</th>
                  <th className="px-4 text-right">Items & Qty</th>
                  <th className="px-4 text-center">Availability</th>
                  <th className="px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {deliveries.map((d) => (
                  <DeliveriesTableRow
                    key={d.id || d.reference}
                    delivery={d}
                    onSelect={handleOpenDetail}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Approved Option 1 Kanban Board View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 items-start">
          {kanbanColumns.map((col) => {
            const colDeliveries = deliveries.filter((d) => d.state === col.key);
            return (
              <div
                key={col.key}
                className="bg-background-subtle border border-border rounded-md p-3 space-y-3 min-h-[300px]"
              >
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <span className="text-xs font-semibold text-primary">
                    {col.label}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-medium ${col.pillStyle}`}
                  >
                    {colDeliveries.length}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {colDeliveries.length === 0 ? (
                    <div className="text-center py-8 text-[11px] text-primary-muted border border-dashed border-border rounded">
                      No {col.label.toLowerCase()} orders
                    </div>
                  ) : (
                    colDeliveries.map((d) => (
                      <DeliveriesKanbanCard
                        key={d.id || d.reference}
                        delivery={d}
                        onSelect={handleOpenDetail}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail / Create Modal */}
      {isFormOpen && (
        <DeliveryFormModal
          delivery={selectedDelivery}
          metadata={metadata}
          onClose={() => setIsFormOpen(false)}
          onSubmitCreate={handleCreateDelivery}
          onTransition={handleTransitionDelivery}
        />
      )}
    </div>
  );
};
