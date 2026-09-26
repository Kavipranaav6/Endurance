import React, { useState, useEffect, useCallback } from "react";
import {
  TransferSummary,
  CreateTransferInput,
  AdjustmentSummary,
} from "@stocksense/schemas";
import { trpcCall } from "../lib/api";
import { useStockWebSocket } from "../lib/useStockWebSocket";
import { TransfersTableRow } from "../components/TransfersTableRow";
import { TransfersKanbanCard } from "../components/TransfersKanbanCard";
import { TransferFormModal } from "../components/TransferFormModal";
import { AdjustmentFormModal } from "../components/AdjustmentFormModal";
import {
  Search,
  Plus,
  LayoutList,
  LayoutGrid,
  RefreshCw,
  ArrowLeftRight,
  ClipboardList,
  Filter,
} from "lucide-react";

interface TransfersPageProps {
  onNavigate?: (page: string) => void;
}

export const TransfersPage: React.FC<TransfersPageProps> = () => {
  const [activeTab, setActiveTab] = useState<"transfers" | "adjustments">("transfers");

  // Transfers state
  const [transferViewMode, setTransferViewMode] = useState<"list" | "kanban">("list");
  const [transferSearch, setTransferSearch] = useState("");
  const [transferStateFilter, setTransferStateFilter] = useState("ALL");
  const [transfers, setTransfers] = useState<TransferSummary[]>([]);
  const [selectedTransfer, setSelectedTransfer] = useState<TransferSummary | null>(null);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  // Adjustments state
  const [adjustmentSearch, setAdjustmentSearch] = useState("");
  const [adjustments, setAdjustments] = useState<AdjustmentSummary[]>([]);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(true);

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

  const fetchMetadata = useCallback(async () => {
    try {
      const meta = await trpcCall<any>("transfer.getMetadata", "query");
      if (meta) setMetadata(meta);
    } catch (err) {
      console.warn("Could not fetch transfer metadata:", err);
    }
  }, []);

  const fetchTransfers = useCallback(async () => {
    try {
      const data = await trpcCall<TransferSummary[]>("transfer.list", "query", {
        search: transferSearch || undefined,
        state: transferStateFilter !== "ALL" ? transferStateFilter : undefined,
      });
      setTransfers(data || []);
    } catch (err) {
      console.warn("Could not fetch transfers:", err);
    } finally {
      setIsLoading(false);
    }
  }, [transferSearch, transferStateFilter]);

  const fetchAdjustments = useCallback(async () => {
    try {
      const data = await trpcCall<AdjustmentSummary[]>("adjustment.list", "query", {
        search: adjustmentSearch || undefined,
      });
      setAdjustments(data || []);
    } catch (err) {
      console.warn("Could not fetch adjustments:", err);
    } finally {
      setIsLoading(false);
    }
  }, [adjustmentSearch]);

  useEffect(() => {
    fetchMetadata();
  }, [fetchMetadata]);

  useEffect(() => {
    if (activeTab === "transfers") {
      fetchTransfers();
    } else {
      fetchAdjustments();
    }
  }, [activeTab, fetchTransfers, fetchAdjustments]);

  // Real-time synchronization
  const handleWsEvent = useCallback(
    (event: any) => {
      if (event.type === "LEDGER_WRITE" || event.type === "STATE_TRANSITION") {
        fetchTransfers();
        fetchAdjustments();
        fetchMetadata();
      }
    },
    [fetchTransfers, fetchAdjustments, fetchMetadata]
  );

  useStockWebSocket(handleWsEvent);

  const handleCreateTransfer = async (input: CreateTransferInput) => {
    await trpcCall("transfer.create", "mutation", input);
    await fetchTransfers();
    await fetchMetadata();
  };

  const handleTransitionTransfer = async (
    reference: string,
    toState: "waiting" | "ready" | "done" | "cancelled"
  ) => {
    await trpcCall("transfer.transition", "mutation", { reference, toState });
    await fetchTransfers();
    await fetchMetadata();
  };

  const kanbanColumns: Array<{
    key: "draft" | "ready" | "done" | "cancelled";
    label: string;
    pillStyle: string;
  }> = [
    { key: "draft", label: "Draft", pillStyle: "bg-gray-100 text-gray-700" },
    { key: "ready", label: "Ready", pillStyle: "bg-blue-50 text-status-ready" },
    { key: "done", label: "Done", pillStyle: "bg-green-50 text-status-done" },
    { key: "cancelled", label: "Cancelled", pillStyle: "bg-gray-100 text-gray-500" },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 bg-accent/10 text-accent rounded">
              <ArrowLeftRight className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-primary">
              Internal Transfers & Stock Adjustments
            </h1>
          </div>
          <p className="text-xs text-primary-muted mt-1">
            Rebalance stock across bins without altering total inventory, and audit physical discrepancy deltas
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              if (activeTab === "transfers") fetchTransfers();
              else fetchAdjustments();
              fetchMetadata();
            }}
            className="p-2 border border-border rounded text-primary hover:bg-background-subtle transition-colors cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw className="w-4 h-4 text-primary-muted" />
          </button>

          {activeTab === "transfers" ? (
            <>
              {/* View Switcher */}
              <div className="flex items-center border border-border rounded p-0.5 bg-background-subtle">
                <button
                  onClick={() => setTransferViewMode("list")}
                  className={`p-1.5 rounded transition-colors ${
                    transferViewMode === "list"
                      ? "bg-background shadow-xs text-primary font-medium"
                      : "text-primary-muted hover:text-primary"
                  }`}
                  title="List view"
                >
                  <LayoutList className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setTransferViewMode("kanban")}
                  className={`p-1.5 rounded transition-colors ${
                    transferViewMode === "kanban"
                      ? "bg-background shadow-xs text-primary font-medium"
                      : "text-primary-muted hover:text-primary"
                  }`}
                  title="Kanban view"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => {
                  setSelectedTransfer(null);
                  setIsTransferModalOpen(true);
                }}
                className="px-3.5 py-1.5 bg-accent hover:opacity-95 text-white font-medium text-xs rounded shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>New Transfer</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsAdjustmentModalOpen(true)}
              className="px-3.5 py-1.5 bg-accent hover:opacity-95 text-white font-medium text-xs rounded shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <ClipboardList className="w-4 h-4" />
              <span>Count & Adjust Stock</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border space-x-6 text-xs">
        <button
          onClick={() => setActiveTab("transfers")}
          className={`pb-2.5 font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === "transfers"
              ? "border-accent text-accent"
              : "border-transparent text-primary-muted hover:text-primary"
          }`}
        >
          <ArrowLeftRight className="w-3.5 h-3.5" />
          <span>Internal Transfers</span>
          <span className="px-1.5 py-0.2 rounded text-[10px] bg-background-subtle border border-border">
            {transfers.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("adjustments")}
          className={`pb-2.5 font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === "adjustments"
              ? "border-accent text-accent"
              : "border-transparent text-primary-muted hover:text-primary"
          }`}
        >
          <ClipboardList className="w-3.5 h-3.5" />
          <span>Stock Adjustments Log</span>
          <span className="px-1.5 py-0.2 rounded text-[10px] bg-background-subtle border border-border">
            {adjustments.length}
          </span>
        </button>
      </div>

      {/* Internal Transfers Tab Content */}
      {activeTab === "transfers" && (
        <div className="space-y-4">
          {/* Search & Status Filters */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-background-subtle p-3 rounded-md border border-border">
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-primary-muted" />
              <input
                type="text"
                placeholder="Search by reference, location, or product..."
                value={transferSearch}
                onChange={(e) => setTransferSearch(e.target.value)}
                className="w-full h-8 pl-8 pr-3 text-xs bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>

            <div className="flex items-center space-x-1.5 overflow-x-auto text-xs">
              <Filter className="w-3.5 h-3.5 text-primary-muted mr-1 hidden sm:inline" />
              {["ALL", "draft", "ready", "done", "cancelled"].map((st) => (
                <button
                  key={st}
                  onClick={() => setTransferStateFilter(st)}
                  className={`px-2.5 py-1 rounded transition-colors capitalize ${
                    transferStateFilter === st
                      ? "bg-primary text-white font-medium"
                      : "text-primary-muted hover:text-primary hover:bg-background"
                  }`}
                >
                  {st.toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Transfers List or Kanban */}
          {isLoading ? (
            <div className="text-center py-16 text-primary-muted text-xs animate-pulse">
              Loading internal transfers...
            </div>
          ) : transfers.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-border rounded-lg bg-background-subtle/30 space-y-3">
              <ArrowLeftRight className="w-8 h-8 text-primary-muted mx-auto" />
              <h3 className="text-sm font-semibold text-primary">No Transfers Found</h3>
              <p className="text-xs text-primary-muted max-w-sm mx-auto">
                No internal location transfers currently recorded matching your filters.
              </p>
              <button
                onClick={() => {
                  setSelectedTransfer(null);
                  setIsTransferModalOpen(true);
                }}
                className="px-3 py-1.5 bg-accent text-white text-xs font-medium rounded hover:opacity-90 inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Create First Transfer
              </button>
            </div>
          ) : transferViewMode === "list" ? (
            <div className="border border-border rounded-md overflow-hidden bg-background">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-background-subtle border-b border-border text-[11px] font-semibold text-primary-muted uppercase tracking-wider select-none">
                    <tr className="h-9">
                      <th className="px-4">Reference</th>
                      <th className="px-4">Route (From → To)</th>
                      <th className="px-4">Scheduled Date</th>
                      <th className="px-4 text-right">Items & Qty</th>
                      <th className="px-4 text-center">Source Stock</th>
                      <th className="px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {transfers.map((t) => (
                      <TransfersTableRow
                        key={t.id || t.reference}
                        transfer={t}
                        onSelect={(item) => {
                          setSelectedTransfer(item);
                          setIsTransferModalOpen(true);
                        }}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
              {kanbanColumns.map((col) => {
                const colTransfers = transfers.filter((t) => t.state === col.key);
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
                        {colTransfers.length}
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {colTransfers.length === 0 ? (
                        <div className="text-center py-8 text-[11px] text-primary-muted border border-dashed border-border rounded">
                          No {col.label.toLowerCase()} transfers
                        </div>
                      ) : (
                        colTransfers.map((t) => (
                          <TransfersKanbanCard
                            key={t.id || t.reference}
                            transfer={t}
                            onSelect={(item) => {
                              setSelectedTransfer(item);
                              setIsTransferModalOpen(true);
                            }}
                          />
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Stock Adjustments Tab Content */}
      {activeTab === "adjustments" && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-background-subtle p-3 rounded-md border border-border">
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-primary-muted" />
              <input
                type="text"
                placeholder="Search by reference, product, or location..."
                value={adjustmentSearch}
                onChange={(e) => setAdjustmentSearch(e.target.value)}
                className="w-full h-8 pl-8 pr-3 text-xs bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
            <div className="text-xs text-primary-muted">
              Immutable ledger discrepancy audit log
            </div>
          </div>

          {adjustments.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-border rounded-lg bg-background-subtle/30 space-y-3">
              <ClipboardList className="w-8 h-8 text-primary-muted mx-auto" />
              <h3 className="text-sm font-semibold text-primary">No Adjustments Logged</h3>
              <p className="text-xs text-primary-muted max-w-sm mx-auto">
                No physical stock discrepancies or inventory count adjustments recorded yet.
              </p>
              <button
                onClick={() => setIsAdjustmentModalOpen(true)}
                className="px-3 py-1.5 bg-accent text-white text-xs font-medium rounded hover:opacity-90 inline-flex items-center gap-1 cursor-pointer"
              >
                <ClipboardList className="w-3.5 h-3.5" />
                Record First Inventory Audit
              </button>
            </div>
          ) : (
            <div className="border border-border rounded-md overflow-hidden bg-background">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-background-subtle border-b border-border text-[11px] font-semibold text-primary-muted uppercase tracking-wider select-none">
                    <tr className="h-9">
                      <th className="px-4">Reference</th>
                      <th className="px-4">Location</th>
                      <th className="px-4">Product</th>
                      <th className="px-4">SKU</th>
                      <th className="px-4 text-center">Delta Adjustment</th>
                      <th className="px-4">Reason / Notes</th>
                      <th className="px-4 text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {adjustments.map((a) => (
                      <tr
                        key={a.id || a.reference}
                        className="h-11 hover:bg-background-subtle transition-colors"
                      >
                        <td className="px-4 font-mono font-semibold text-primary">
                          {a.reference}
                        </td>
                        <td className="px-4 font-medium text-primary">
                          {a.locationName}
                        </td>
                        <td className="px-4 text-primary font-medium">
                          {a.productName}
                        </td>
                        <td className="px-4 font-mono text-primary-muted">
                          {a.sku}
                        </td>
                        <td className="px-4 text-center">
                          {a.delta > 0 ? (
                            <span className="inline-block px-2 py-0.5 text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 rounded border border-emerald-200">
                              +{a.delta} {a.unitOfMeasure || "units"} (Gain)
                            </span>
                          ) : a.delta < 0 ? (
                            <span className="inline-block px-2 py-0.5 text-[11px] font-mono font-bold text-status-late bg-red-50 rounded border border-status-late/20">
                              {a.delta} {a.unitOfMeasure || "units"} (Loss)
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 text-[11px] font-mono text-gray-500 bg-gray-100 rounded">
                              0
                            </span>
                          )}
                        </td>
                        <td className="px-4 text-primary-muted truncate max-w-[200px]">
                          {a.reason}
                        </td>
                        <td className="px-4 text-right text-primary-muted">
                          {new Date(a.createdAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Transfer Form Modal */}
      {isTransferModalOpen && (
        <TransferFormModal
          transfer={selectedTransfer}
          metadata={metadata}
          onClose={() => setIsTransferModalOpen(false)}
          onSubmitCreate={handleCreateTransfer}
          onTransition={handleTransitionTransfer}
        />
      )}

      {/* Adjustment Form Modal */}
      {isAdjustmentModalOpen && (
        <AdjustmentFormModal
          metadata={metadata}
          onClose={() => setIsAdjustmentModalOpen(false)}
          onSuccess={async () => {
            await fetchAdjustments();
            await fetchMetadata();
          }}
        />
      )}
    </div>
  );
};
