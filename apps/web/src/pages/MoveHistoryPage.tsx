import React, { useState, useEffect, useCallback, useMemo } from "react";
import { trpcCall } from "../lib/api";
import { useStockWebSocket } from "../lib/useStockWebSocket";
import { MoveHistoryTableRow } from "../components/MoveHistoryTableRow";
import { MoveHistoryKanbanCard } from "../components/MoveHistoryKanbanCard";
import { MoveHistoryDetailModal } from "../components/MoveHistoryDetailModal";
import {
  Search,
  LayoutList,
  LayoutGrid,
  RefreshCw,
  History,
  Filter,
  AlertCircle,
  AlertTriangle,
  XCircle,
  ArrowRight,
  RotateCcw,
} from "lucide-react";

interface MoveHistoryPageProps {
  onNavigate?: (page: string) => void;
}

export const MoveHistoryPage: React.FC<MoveHistoryPageProps> = ({ onNavigate }) => {
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [stateFilter, setStateFilter] = useState<string>("ALL");
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);
  const [moves, setMoves] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedMove, setSelectedMove] = useState<any | null>(null);

  // Directly consume Phase 2 ledger.listMoves query
  const fetchMoves = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const data = await trpcCall<any[]>("ledger.listMoves", "query", {
        type: typeFilter !== "ALL" ? typeFilter : undefined,
        state: stateFilter !== "ALL" ? stateFilter : undefined,
        search: search || undefined,
      });
      setMoves(data || []);
    } catch (err: any) {
      console.warn("Could not fetch ledger moves:", err);
      setFetchError(err?.message || "Failed to load ledger movement records. Please check server connection.");
    } finally {
      setIsLoading(false);
    }
  }, [typeFilter, stateFilter, search]);

  useEffect(() => {
    fetchMoves();
  }, [fetchMoves]);

  // Real-time synchronization
  const handleWsEvent = useCallback(
    (event: any) => {
      if (event.type === "LEDGER_WRITE" || event.type === "STATE_TRANSITION") {
        fetchMoves();
      }
    },
    [fetchMoves]
  );

  useStockWebSocket(handleWsEvent);

  const resetFilters = () => {
    setSearch("");
    setTypeFilter("ALL");
    setStateFilter("ALL");
    setShowOverdueOnly(false);
  };

  const isFiltered =
    search !== "" ||
    typeFilter !== "ALL" ||
    stateFilter !== "ALL" ||
    showOverdueOnly;

  // Filter for overdue moves if toggle enabled
  const displayedMoves = useMemo(() => {
    if (!showOverdueOnly) return moves;
    const now = new Date();
    return moves.filter(
      (m) =>
        Boolean(m.scheduleDate) &&
        new Date(m.scheduleDate) < now &&
        m.state !== "done" &&
        m.state !== "cancelled"
    );
  }, [moves, showOverdueOnly]);

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
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 bg-accent/10 text-accent rounded">
              <History className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-primary">
              Ledger Move History
            </h1>
          </div>
          <p className="text-xs text-primary-muted mt-1">
            Complete append-only audit trail of all warehouse stock movements (Inbound, Outbound, Internal, Adjustments)
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => fetchMoves()}
            className="p-2 border border-border rounded text-primary hover:bg-background-subtle transition-colors cursor-pointer"
            title="Refresh ledger moves"
          >
            <RefreshCw className={`w-4 h-4 text-primary-muted ${isLoading ? "animate-spin" : ""}`} />
          </button>

          {/* View Mode Switcher */}
          <div className="flex items-center border border-border rounded p-0.5 bg-background-subtle">
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded transition-colors cursor-pointer ${
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
              className={`p-1.5 rounded transition-colors cursor-pointer ${
                viewMode === "kanban"
                  ? "bg-background shadow-xs text-primary font-medium"
                  : "text-primary-muted hover:text-primary"
              }`}
              title="Kanban view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Error Alert Retry Banner */}
      {fetchError && (
        <div className="p-3.5 bg-status-danger/10 border border-status-danger/30 rounded-lg flex items-center justify-between gap-3 text-status-danger text-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{fetchError}</span>
          </div>
          <button
            onClick={() => fetchMoves()}
            className="flex items-center gap-1 px-3 py-1 bg-status-danger text-white rounded font-medium hover:bg-status-danger/90 transition-colors shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            Retry
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-background-subtle p-3 rounded-md border border-border">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-primary-muted" />
          <input
            type="text"
            placeholder="Search by reference, contact, product..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-8 pl-8 pr-3 text-xs bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        {/* Operation Type Filter */}
        <div className="flex items-center space-x-1 text-xs">
          <span className="text-primary-muted text-[11px] font-medium mr-1">Type:</span>
          {["ALL", "IN", "OUT", "INTERNAL", "ADJUSTMENT"].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-2 py-1 rounded transition-colors font-mono text-[11px] cursor-pointer ${
                typeFilter === t
                  ? "bg-primary text-white font-semibold"
                  : "text-primary-muted hover:text-primary hover:bg-background"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Status Filter */}
        <div className="flex items-center space-x-1 text-xs">
          <Filter className="w-3.5 h-3.5 text-primary-muted mr-1 hidden sm:inline" />
          {["ALL", "draft", "waiting", "ready", "done", "cancelled"].map((st) => (
            <button
              key={st}
              onClick={() => setStateFilter(st)}
              className={`px-2 py-1 rounded transition-colors capitalize text-[11px] cursor-pointer ${
                stateFilter === st
                  ? "bg-accent text-white font-medium"
                  : "text-primary-muted hover:text-primary hover:bg-background"
              }`}
            >
              {st.toLowerCase()}
            </button>
          ))}
        </div>

        {/* Overdue Only Filter */}
        <button
          onClick={() => setShowOverdueOnly(!showOverdueOnly)}
          className={`px-2.5 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer border ${
            showOverdueOnly
              ? "bg-red-50 text-status-late border-status-late/30"
              : "border-border text-primary-muted hover:text-primary bg-background"
          }`}
        >
          <AlertCircle className="w-3 h-3 text-status-late" />
          <span>Overdue Only</span>
        </button>
      </div>

      {/* Main View Area */}
      {isLoading ? (
        viewMode === "list" ? (
          /* Table Skeleton Loader (6 rows) */
          <div className="border border-border rounded-md overflow-hidden bg-background">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-background-subtle border-b border-border text-[11px] font-semibold text-primary-muted uppercase tracking-wider select-none">
                  <tr className="h-9">
                    <th className="px-4">Reference</th>
                    <th className="px-3 text-center">Type</th>
                    <th className="px-4">Product</th>
                    <th className="px-4">Route (From → To)</th>
                    <th className="px-4">Contact / Partner</th>
                    <th className="px-4 text-right">Quantity</th>
                    <th className="px-4">Date / Timeline</th>
                    <th className="px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[...Array(6)].map((_, i) => (
                    <tr key={i} className="h-11 animate-pulse">
                      <td className="px-4">
                        <div className="h-4 bg-background-subtle rounded w-28" />
                      </td>
                      <td className="px-3 text-center">
                        <div className="h-4 bg-background-subtle rounded w-12 mx-auto" />
                      </td>
                      <td className="px-4">
                        <div className="space-y-1">
                          <div className="h-3.5 bg-background-subtle rounded w-36" />
                          <div className="h-2.5 bg-background-subtle/60 rounded w-20" />
                        </div>
                      </td>
                      <td className="px-4">
                        <div className="h-3.5 bg-background-subtle rounded w-32" />
                      </td>
                      <td className="px-4">
                        <div className="h-3.5 bg-background-subtle rounded w-24" />
                      </td>
                      <td className="px-4 text-right">
                        <div className="h-3.5 bg-background-subtle rounded w-12 ml-auto" />
                      </td>
                      <td className="px-4">
                        <div className="h-3.5 bg-background-subtle rounded w-20" />
                      </td>
                      <td className="px-4 text-center">
                        <div className="h-4 bg-background-subtle rounded w-16 mx-auto" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Kanban Skeleton Loader */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 items-start">
            {kanbanColumns.map((col) => (
              <div
                key={col.key}
                className="bg-background-subtle border border-border rounded-md p-3 space-y-3 min-h-[300px] animate-pulse"
              >
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <div className="h-3 bg-background rounded w-16" />
                  <div className="h-3 bg-background rounded w-6" />
                </div>
                <div className="space-y-2.5">
                  {[...Array(2)].map((_, j) => (
                    <div
                      key={j}
                      className="h-24 bg-background rounded border border-border/50 p-2.5 space-y-2"
                    >
                      <div className="h-3 bg-background-subtle rounded w-20" />
                      <div className="h-3.5 bg-background-subtle rounded w-32" />
                      <div className="h-2.5 bg-background-subtle rounded w-24" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      ) : displayedMoves.length === 0 ? (
        /* Enhanced Empty States */
        <div className="text-center py-16 border border-dashed border-border rounded-lg bg-background-subtle/30 space-y-3">
          <History className="w-9 h-9 text-primary-muted mx-auto" />
          {isFiltered ? (
            <>
              <h3 className="text-sm font-semibold text-primary">No Matching Moves Found</h3>
              <p className="text-xs text-primary-muted max-w-sm mx-auto">
                No stock movements match your active filters. Try refining your search query or reset the filters.
              </p>
              <div className="pt-2">
                <button
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-background border border-border rounded text-xs font-medium text-primary hover:bg-background-subtle transition-colors cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5 text-primary-muted" />
                  Reset All Filters
                </button>
              </div>
            </>
          ) : (
            <>
              <h3 className="text-sm font-semibold text-primary">No Stock Movements Logged Yet</h3>
              <p className="text-xs text-primary-muted max-w-sm mx-auto">
                Your append-only warehouse ledger is currently empty. Inbound receipts, outbound customer deliveries, internal transfers, and count adjustments will automatically record here.
              </p>
              {onNavigate && (
                <div className="pt-2 flex items-center justify-center gap-3">
                  <button
                    onClick={() => onNavigate("receipts")}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-accent text-white rounded text-xs font-medium hover:bg-accent/90 transition-colors shadow-xs cursor-pointer"
                  >
                    Receive Inbound Shipment
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onNavigate("dashboard")}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-background border border-border text-primary rounded text-xs font-medium hover:bg-background-subtle transition-colors cursor-pointer"
                  >
                    View Dashboard
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      ) : viewMode === "list" ? (
        /* Approved Option 1 Dense Audit Ledger Row Table */
        <div className="border border-border rounded-md overflow-hidden bg-background">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-background-subtle border-b border-border text-[11px] font-semibold text-primary-muted uppercase tracking-wider select-none">
                <tr className="h-9">
                  <th className="px-4">Reference</th>
                  <th className="px-3 text-center">Type</th>
                  <th className="px-4">Product</th>
                  <th className="px-4">Route (From → To)</th>
                  <th className="px-4">Contact / Partner</th>
                  <th className="px-4 text-right">Quantity</th>
                  <th className="px-4">Date / Timeline</th>
                  <th className="px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {displayedMoves.map((m) => (
                  <MoveHistoryTableRow
                    key={m.id}
                    move={m}
                    onSelect={(item) => setSelectedMove(item)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Approved Option 1 Structured Movement Kanban */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 items-start">
          {kanbanColumns.map((col) => {
            const colMoves = displayedMoves.filter((m) => m.state === col.key);
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
                    {colMoves.length}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {colMoves.length === 0 ? (
                    <div className="text-center py-8 text-[11px] text-primary-muted border border-dashed border-border rounded">
                      No {col.label.toLowerCase()} moves
                    </div>
                  ) : (
                    colMoves.map((m) => (
                      <MoveHistoryKanbanCard
                        key={m.id}
                        move={m}
                        onSelect={(item) => setSelectedMove(item)}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Movement Detail Inspector Modal */}
      {selectedMove && (
        <MoveHistoryDetailModal
          move={selectedMove}
          onClose={() => setSelectedMove(null)}
        />
      )}
    </div>
  );
};
