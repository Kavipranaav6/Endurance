import React, { useState, useEffect, useCallback } from "react";
import { ReceiptSummary, CreateReceiptInput } from "@stocksense/schemas";
import { trpcCall } from "../lib/api";
import { useStockWebSocket } from "../lib/useStockWebSocket";
import { ReceiptsTableRow } from "../components/ReceiptsTableRow";
import { ReceiptsKanbanCard } from "../components/ReceiptsKanbanCard";
import { ReceiptFormModal } from "../components/ReceiptFormModal";
import {
  Search,
  Plus,
  LayoutList,
  LayoutGrid,
  RefreshCw,
  ArrowDownLeft,
  Filter,
} from "lucide-react";

interface ReceiptsPageProps {
  onNavigate?: (page: string) => void;
}

export const ReceiptsPage: React.FC<ReceiptsPageProps> = () => {
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState<string>("ALL");
  const [receipts, setReceipts] = useState<ReceiptSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptSummary | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const [metadata, setMetadata] = useState<{
    warehouses: Array<{ id: string; name: string; shortCode: string }>;
    locations: Array<{ id: string; name: string; warehouseId: string }>;
    products: Array<{ id: string; name: string; sku: string; unitOfMeasure: string }>;
  }>({
    warehouses: [],
    locations: [],
    products: [],
  });

  // Fetch receipts list
  const fetchReceipts = useCallback(async () => {
    try {
      const data = await trpcCall<ReceiptSummary[]>("receipt.list", "query", {
        search: search || undefined,
        state: stateFilter !== "ALL" ? stateFilter : undefined,
      });
      setReceipts(data || []);
    } catch (err) {
      console.warn("Could not fetch receipts:", err);
    } finally {
      setIsLoading(false);
    }
  }, [search, stateFilter]);

  // Fetch metadata (warehouses, locations, products)
  const fetchMetadata = useCallback(async () => {
    try {
      const meta = await trpcCall<any>("receipt.getMetadata", "query");
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
    fetchReceipts();
  }, [fetchReceipts]);

  // Real-time synchronization
  const handleWsEvent = useCallback(
    (event: any) => {
      if (event.type === "LEDGER_WRITE" || event.type === "STATE_TRANSITION") {
        fetchReceipts();
      }
    },
    [fetchReceipts]
  );

  useStockWebSocket(handleWsEvent);

  const handleCreateReceipt = async (input: CreateReceiptInput) => {
    await trpcCall("receipt.create", "mutation", input);
    await fetchReceipts();
  };

  const handleTransitionReceipt = async (
    reference: string,
    toState: "ready" | "done" | "cancelled"
  ) => {
    await trpcCall("receipt.transition", "mutation", { reference, toState });
    await fetchReceipts();
  };

  const handleOpenDetail = (r: ReceiptSummary) => {
    setSelectedReceipt(r);
    setIsFormOpen(true);
  };

  const handleOpenNew = () => {
    setSelectedReceipt(null);
    setIsFormOpen(true);
  };

  // Group receipts for Kanban columns
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
      {/* Top Header & Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 bg-accent/10 text-accent rounded">
              <ArrowDownLeft className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-primary">
              Receipts (Incoming Shipments)
            </h1>
          </div>
          <p className="text-xs text-primary-muted mt-1">
            Manage incoming vendor deliveries, receipt putaway, and ledger validation
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => fetchReceipts()}
            className="p-2 border border-border rounded text-primary hover:bg-background-subtle transition-colors cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw className="w-4 h-4 text-primary-muted" />
          </button>

          {/* View Mode Toggle */}
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
            <span>New Receipt</span>
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
            placeholder="Search by reference, supplier, or product..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-8 pl-8 pr-3 text-xs bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center space-x-1.5 overflow-x-auto text-xs">
          <Filter className="w-3.5 h-3.5 text-primary-muted mr-1 hidden sm:inline" />
          {["ALL", "draft", "ready", "done", "cancelled"].map((st) => (
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
          Loading incoming receipts...
        </div>
      ) : receipts.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-lg bg-background-subtle/30 space-y-3">
          <ArrowDownLeft className="w-8 h-8 text-primary-muted mx-auto" />
          <h3 className="text-sm font-semibold text-primary">No Receipts Found</h3>
          <p className="text-xs text-primary-muted max-w-sm mx-auto">
            {search || stateFilter !== "ALL"
              ? "No receipts match your search filters. Try clearing them."
              : "No incoming vendor shipments currently recorded in the ledger."}
          </p>
          <button
            onClick={handleOpenNew}
            className="px-3 py-1.5 bg-accent text-white text-xs font-medium rounded hover:opacity-90 transition-opacity inline-flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Create First Receipt
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
                  <th className="px-4">Supplier / Contact</th>
                  <th className="px-4">Destination</th>
                  <th className="px-4">Scheduled Date</th>
                  <th className="px-4 text-right">Items & Qty</th>
                  <th className="px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {receipts.map((r) => (
                  <ReceiptsTableRow
                    key={r.id || r.reference}
                    receipt={r}
                    onSelect={handleOpenDetail}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Approved Option 1 Kanban Board View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
          {kanbanColumns.map((col) => {
            const colReceipts = receipts.filter((r) => r.state === col.key);
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
                    {colReceipts.length}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {colReceipts.length === 0 ? (
                    <div className="text-center py-8 text-[11px] text-primary-muted border border-dashed border-border rounded">
                      No {col.label.toLowerCase()} receipts
                    </div>
                  ) : (
                    colReceipts.map((r) => (
                      <ReceiptsKanbanCard
                        key={r.id || r.reference}
                        receipt={r}
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
        <ReceiptFormModal
          receipt={selectedReceipt}
          metadata={metadata}
          onClose={() => setIsFormOpen(false)}
          onSubmitCreate={handleCreateReceipt}
          onTransition={handleTransitionReceipt}
        />
      )}
    </div>
  );
};
