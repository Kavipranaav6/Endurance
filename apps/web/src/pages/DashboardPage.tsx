import React, { useEffect, useState, useCallback } from "react";
import {
  Package,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  LogOut,
  BellRing,
} from "lucide-react";
import { useAuthStore } from "../lib/authStore";
import { trpcCall } from "../lib/api";
import { useStockWebSocket } from "../lib/useStockWebSocket";
import { KPITile } from "../components/KPITile";
import { DashboardFilterBar } from "../components/DashboardFilterBar";
import { OperationalWidgets } from "../components/OperationalWidgets";
import {
  DashboardFilter,
  DashboardKPIs,
  OperationalWidgetSummary,
} from "@stocksense/schemas";

interface DashboardPageProps {
  onNavigate: (page: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { user, logout } = useAuthStore();
  const [filter, setFilter] = useState<DashboardFilter>({
    docType: "ALL",
    status: "ALL",
    warehouseId: "ALL",
    category: "ALL",
  });

  const [kpis, setKpis] = useState<DashboardKPIs>({
    totalProducts: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    pendingReceiptsCount: 0,
    pendingDeliveriesCount: 0,
    scheduledTransfersCount: 0,
  });

  const [widgets, setWidgets] = useState<OperationalWidgetSummary>({
    receipts: { pendingCount: 0, readyCount: 0, items: [] },
    deliveries: { pendingCount: 0, waitingCount: 0, readyCount: 0, items: [] },
  });

  const [warehouses, setWarehouses] = useState<Array<{ id: string; name: string }>>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeAlert, setActiveAlert] = useState<string | null>(null);

  // Fetch metrics from backend
  const fetchDashboardData = useCallback(async () => {
    try {
      const data = await trpcCall<any>("dashboard.getMetrics", "query", filter);
      if (data) {
        setKpis(data.kpis);
        setWidgets(data.widgets);
        setWarehouses(data.warehouses || []);
        setCategories(data.categories || []);
      }
    } catch (err) {
      console.warn("Could not fetch dashboard metrics:", err);
    }
  }, [filter]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Handle incoming live WebSocket events
  const handleWsEvent = useCallback(
    (event: any) => {
      console.log("[Dashboard Live Event]", event);
      if (event.type === "LOW_STOCK_ALERT") {
        setActiveAlert(
          `Low Stock Warning: ${event.data.productName} (${event.data.sku}) is at ${event.data.onHand} units (Reorder point: ${event.data.reorderPoint})`
        );
      }
      // Re-fetch derived dashboard metrics silently
      fetchDashboardData();
    },
    [fetchDashboardData]
  );

  const { isConnected } = useStockWebSocket(handleWsEvent);

  const handleLogout = async () => {
    await logout();
    onNavigate("login");
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-5">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border gap-4">
        <div>
          <h1 className="text-xl font-semibold text-primary tracking-tight">
            Inventory Overview
          </h1>
          <p className="text-xs text-primary-muted mt-1">
            Real-time ledger state, derived quantities, and pending warehouse operations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-medium text-primary">{user?.name}</div>
            <div className="text-[11px] text-primary-muted">{user?.email}</div>
          </div>
          <span className="px-2 py-0.5 text-xs font-medium text-accent bg-accent-subtle rounded border border-accent/20">
            {user?.role || "STAFF"}
          </span>
          <button
            onClick={handleLogout}
            className="h-8 px-2.5 text-xs text-primary-muted hover:text-primary hover:bg-background-subtle border border-border rounded flex items-center gap-1.5 transition-colors"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>

      {/* Low-stock real-time alert toast */}
      {activeAlert && (
        <div className="p-3 bg-red-50 border border-status-late/30 rounded flex items-center justify-between text-xs text-status-late">
          <div className="flex items-center gap-2">
            <BellRing className="w-4 h-4 text-status-late shrink-0" />
            <span className="font-medium">{activeAlert}</span>
          </div>
          <button
            onClick={() => setActiveAlert(null)}
            className="text-status-late/70 hover:text-status-late font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Dynamic Filter Bar (Option 1) */}
      <DashboardFilterBar
        filter={filter}
        onChange={setFilter}
        warehouses={warehouses}
        categories={categories}
        isWsConnected={isConnected}
      />

      {/* 5 KPI Summary Tiles (Option 1) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <KPITile
          label="Total Products"
          value={kpis.totalProducts}
          icon={Package}
          subtext="Catalog items"
        />

        <KPITile
          label="Low / Out of Stock"
          value={kpis.lowStockCount + kpis.outOfStockCount}
          icon={AlertTriangle}
          subtext={`${kpis.lowStockCount} low • ${kpis.outOfStockCount} empty`}
          isAlert={kpis.lowStockCount > 0 || kpis.outOfStockCount > 0}
        />

        <KPITile
          label="Pending Receipts"
          value={kpis.pendingReceiptsCount}
          icon={ArrowDownLeft}
          subtext="Inbound moves"
        />

        <KPITile
          label="Pending Deliveries"
          value={kpis.pendingDeliveriesCount}
          icon={ArrowUpRight}
          subtext="Outbound moves"
        />

        <KPITile
          label="Scheduled Transfers"
          value={kpis.scheduledTransfersCount}
          icon={ArrowLeftRight}
          subtext="Internal rebalance"
        />
      </div>

      {/* Dual Operational Widgets (Option 1) */}
      <div className="pt-2">
        <OperationalWidgets
          summary={widgets}
          onNavigateToMove={(id) => {
            console.log("Navigating to move:", id);
          }}
          onNewReceipt={() => {
            console.log("Quick action: New Receipt clicked");
          }}
          onNewDelivery={() => {
            console.log("Quick action: New Delivery clicked");
          }}
        />
      </div>
    </div>
  );
};
