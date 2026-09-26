import React, { useState, useEffect, useCallback, useMemo } from "react";
import { trpcCall } from "../lib/api";
import { useStockWebSocket } from "../lib/useStockWebSocket";
import { ProductFormModal } from "../components/ProductFormModal";
import { WarehouseFormModal } from "../components/WarehouseFormModal";
import { LocationFormModal } from "../components/LocationFormModal";
import {
  Package,
  Building2,
  MapPin,
  AlertTriangle,
  Search,
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
  RotateCcw,
  XCircle,
} from "lucide-react";
import {
  CreateProductInput,
  UpdateProductInput,
  CreateWarehouseInput,
  UpdateWarehouseInput,
  CreateLocationInput,
  UpdateLocationInput,
} from "@stocksense/schemas";

type SettingsTab = "products" | "warehouses" | "locations" | "alerts";

interface SettingsPageProps {
  initialTab?: SettingsTab;
  onNavigate?: (page: string) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  initialTab = "products",
  onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);

  // Data states
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [lowStockSummary, setLowStockSummary] = useState<{
    count: number;
    items: any[];
  }>({ count: 0, items: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [warehouseFilter, setWarehouseFilter] = useState("ALL");

  // Modal states
  const [productModal, setProductModal] = useState<{
    isOpen: boolean;
    product: any | null;
  }>({ isOpen: false, product: null });
  const [warehouseModal, setWarehouseModal] = useState<{
    isOpen: boolean;
    warehouse: any | null;
  }>({ isOpen: false, warehouse: null });
  const [locationModal, setLocationModal] = useState<{
    isOpen: boolean;
    location: any | null;
  }>({ isOpen: false, location: null });

  // Notification / Action status
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Fetch all settings data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const [prods, whs, locs, alerts] = await Promise.all([
        trpcCall<any[]>("settings.listProducts", "query"),
        trpcCall<any[]>("settings.listWarehouses", "query"),
        trpcCall<any[]>("settings.listLocations", "query"),
        trpcCall<{ count: number; items: any[] }>(
          "settings.getLowStockSummary",
          "query"
        ),
      ]);
      setProducts(prods || []);
      setWarehouses(whs || []);
      setLocations(locs || []);
      setLowStockSummary(alerts || { count: 0, items: [] });
    } catch (err: any) {
      console.warn("Error fetching settings data:", err);
      setFetchError(
        err?.message ||
          "Failed to load master configuration data. Please check server connection."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // WebSocket live synchronization
  const handleWsEvent = useCallback(
    (event: any) => {
      if (
        event.type === "LEDGER_WRITE" ||
        event.type === "STATE_TRANSITION" ||
        event.type === "LOW_STOCK_ALERT" ||
        event.type === "STOCK_MOVE_CREATED" ||
        event.type === "STOCK_MOVE_UPDATED"
      ) {
        fetchData();
      }
    },
    [fetchData]
  );

  useStockWebSocket(handleWsEvent);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        searchQuery === "" ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCat =
        categoryFilter === "ALL" || p.category === categoryFilter;
      return matchesSearch && matchesCat;
    });
  }, [products, searchQuery, categoryFilter]);

  // Filtered Warehouses
  const filteredWarehouses = useMemo(() => {
    return warehouses.filter((w) => {
      return (
        searchQuery === "" ||
        w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.shortCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (w.address && w.address.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    });
  }, [warehouses, searchQuery]);

  // Filtered Locations
  const filteredLocations = useMemo(() => {
    return locations.filter((l) => {
      const matchesSearch =
        searchQuery === "" ||
        l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.shortCode.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesWh =
        warehouseFilter === "ALL" || l.warehouseId === warehouseFilter;
      return matchesSearch && matchesWh;
    });
  }, [locations, searchQuery, warehouseFilter]);

  // --- Handlers: Product ---
  const handleCreateProduct = async (data: CreateProductInput) => {
    await trpcCall("settings.createProduct", "mutation", data);
    setActionMessage(`Product "${data.name}" created successfully.`);
    setTimeout(() => setActionMessage(null), 4000);
    await fetchData();
  };

  const handleUpdateProduct = async (data: UpdateProductInput) => {
    await trpcCall("settings.updateProduct", "mutation", data);
    setActionMessage(`Product "${data.name}" updated successfully.`);
    setTimeout(() => setActionMessage(null), 4000);
    await fetchData();
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete product "${name}"?`)) {
      return;
    }
    try {
      await trpcCall("settings.deleteProduct", "mutation", { id });
      setActionMessage(`Product "${name}" deleted.`);
      setTimeout(() => setActionMessage(null), 4000);
      await fetchData();
    } catch (err: any) {
      alert(err?.message || "Failed to delete product.");
    }
  };

  // --- Handlers: Warehouse ---
  const handleCreateWarehouse = async (data: CreateWarehouseInput) => {
    await trpcCall("settings.createWarehouse", "mutation", data);
    setActionMessage(`Warehouse "${data.name}" created successfully.`);
    setTimeout(() => setActionMessage(null), 4000);
    await fetchData();
  };

  const handleUpdateWarehouse = async (data: UpdateWarehouseInput) => {
    await trpcCall("settings.updateWarehouse", "mutation", data);
    setActionMessage(`Warehouse "${data.name}" updated successfully.`);
    setTimeout(() => setActionMessage(null), 4000);
    await fetchData();
  };

  const handleDeleteWarehouse = async (id: string, name: string) => {
    if (
      !window.confirm(
        `Are you sure you want to delete warehouse "${name}"? This may affect internal storage locations.`
      )
    ) {
      return;
    }
    try {
      await trpcCall("settings.deleteWarehouse", "mutation", { id });
      setActionMessage(`Warehouse "${name}" deleted.`);
      setTimeout(() => setActionMessage(null), 4000);
      await fetchData();
    } catch (err: any) {
      alert(err?.message || "Failed to delete warehouse.");
    }
  };

  // --- Handlers: Location ---
  const handleCreateLocation = async (data: CreateLocationInput) => {
    await trpcCall("settings.createLocation", "mutation", data);
    setActionMessage(`Location "${data.name}" created successfully.`);
    setTimeout(() => setActionMessage(null), 4000);
    await fetchData();
  };

  const handleUpdateLocation = async (data: UpdateLocationInput) => {
    await trpcCall("settings.updateLocation", "mutation", data);
    setActionMessage(`Location "${data.name}" updated successfully.`);
    setTimeout(() => setActionMessage(null), 4000);
    await fetchData();
  };

  const handleDeleteLocation = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete location "${name}"?`)) {
      return;
    }
    try {
      await trpcCall("settings.deleteLocation", "mutation", { id });
      setActionMessage(`Location "${name}" deleted.`);
      setTimeout(() => setActionMessage(null), 4000);
      await fetchData();
    } catch (err: any) {
      alert(err?.message || "Failed to delete location.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border-subtle pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Settings & Master Data
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Manage product catalog, reorder points, warehouses, and storage locations
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchData()}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-text-muted hover:text-text-primary bg-surface-card border border-border-default rounded-lg hover:bg-surface-elevated transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
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
            onClick={() => fetchData()}
            className="flex items-center gap-1 px-3 py-1 bg-status-danger text-white rounded font-medium hover:bg-status-danger/90 transition-colors shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            Retry
          </button>
        </div>
      )}

      {/* Success Notification Banner */}
      {actionMessage && (
        <div className="p-3 bg-brand-primary/10 border border-brand-primary/30 text-brand-primary rounded-lg text-sm flex items-center justify-between animate-in fade-in duration-200">
          <span>{actionMessage}</span>
          <button
            onClick={() => setActionMessage(null)}
            className="text-xs font-semibold hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Tabs */}
      <div className="flex border-b border-border-subtle gap-2">
        <button
          onClick={() => {
            setActiveTab("products");
            setSearchQuery("");
          }}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
            activeTab === "products"
              ? "border-brand-primary text-brand-primary font-semibold"
              : "border-transparent text-text-muted hover:text-text-primary"
          }`}
        >
          <Package className="w-4 h-4" />
          Products
          <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-surface-elevated border border-border-default text-text-muted">
            {products.length}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab("warehouses");
            setSearchQuery("");
          }}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
            activeTab === "warehouses"
              ? "border-brand-primary text-brand-primary font-semibold"
              : "border-transparent text-text-muted hover:text-text-primary"
          }`}
        >
          <Building2 className="w-4 h-4" />
          Warehouses
          <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-surface-elevated border border-border-default text-text-muted">
            {warehouses.length}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab("locations");
            setSearchQuery("");
          }}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
            activeTab === "locations"
              ? "border-brand-primary text-brand-primary font-semibold"
              : "border-transparent text-text-muted hover:text-text-primary"
          }`}
        >
          <MapPin className="w-4 h-4" />
          Locations
          <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-surface-elevated border border-border-default text-text-muted">
            {locations.length}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab("alerts");
            setSearchQuery("");
          }}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
            activeTab === "alerts"
              ? "border-status-danger text-status-danger font-semibold"
              : "border-transparent text-text-muted hover:text-text-primary"
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-status-danger" />
          Low Stock Alerts
          {lowStockSummary.count > 0 && (
            <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-status-danger/10 text-status-danger font-bold border border-status-danger/30 animate-pulse">
              {lowStockSummary.count}
            </span>
          )}
        </button>
      </div>

      {/* --- TAB 1: PRODUCTS --- */}
      {activeTab === "products" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface-card p-4 rounded-xl border border-border-default shadow-xs">
            <div className="flex flex-1 items-center gap-3 w-full">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  placeholder="Search products by SKU or Name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-surface-input border border-border-default rounded-lg text-sm text-text-primary placeholder:text-text-muted/50 focus:outline-hidden focus:border-brand-primary transition-colors"
                />
              </div>

              {categories.length > 0 && (
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-3 py-2 bg-surface-input border border-border-default rounded-lg text-sm text-text-primary focus:outline-hidden focus:border-brand-primary transition-colors cursor-pointer"
                >
                  <option value="ALL">All Categories</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <button
              onClick={() => setProductModal({ isOpen: true, product: null })}
              className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-brand-primary/90 transition-colors shadow-xs shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Product
            </button>
          </div>

          {/* Dense Products Table with Skeletons */}
          <div className="overflow-x-auto bg-surface-card rounded-xl border border-border-default shadow-xs">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-elevated/60 text-xs font-semibold uppercase tracking-wider text-text-muted border-b border-border-subtle">
                <tr>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Product Name</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">UoM</th>
                  <th className="px-4 py-3 text-right">On Hand</th>
                  <th className="px-4 py-3 text-right">Reorder Point</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle font-normal">
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-4 py-3">
                        <div className="h-4 bg-surface-elevated rounded w-16" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-4 bg-surface-elevated rounded w-40" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-4 bg-surface-elevated rounded w-20" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-4 bg-surface-elevated rounded w-12" />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="h-4 bg-surface-elevated rounded w-10 ml-auto" />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="h-4 bg-surface-elevated rounded w-10 ml-auto" />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="h-4 bg-surface-elevated rounded w-16 mx-auto" />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="h-4 bg-surface-elevated rounded w-12 ml-auto" />
                      </td>
                    </tr>
                  ))
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-text-muted space-y-2">
                        <Package className="w-8 h-8 text-text-muted/60" />
                        {products.length === 0 ? (
                          <>
                            <p className="text-sm font-medium text-text-primary">
                              No Products in Master Catalog
                            </p>
                            <p className="text-xs text-text-muted max-w-sm">
                              Create your first product to establish tracking, opening inventory balances, and automated reorder rules.
                            </p>
                            <div className="pt-2">
                              <button
                                onClick={() =>
                                  setProductModal({ isOpen: true, product: null })
                                }
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-primary text-white text-xs font-medium rounded-lg hover:bg-brand-primary/90 transition-colors shadow-xs cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                Create First Product
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-medium text-text-primary">
                              No Products Match Your Filters
                            </p>
                            <p className="text-xs text-text-muted max-w-sm">
                              Try clearing your search query or switching to all categories.
                            </p>
                            <div className="pt-2">
                              <button
                                onClick={() => {
                                  setSearchQuery("");
                                  setCategoryFilter("ALL");
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-elevated border border-border-default text-xs font-medium text-text-primary rounded-lg hover:bg-surface-elevated/80 transition-colors cursor-pointer"
                              >
                                <XCircle className="w-3.5 h-3.5 text-text-muted" />
                                Reset Product Filters
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => {
                    const isLow = p.onHand <= p.reorderPoint;
                    return (
                      <tr
                        key={p.id}
                        className="hover:bg-surface-elevated/40 transition-colors"
                      >
                        <td className="px-4 py-3 font-mono font-medium text-brand-primary">
                          {p.sku}
                        </td>
                        <td className="px-4 py-3 font-medium text-text-primary">
                          {p.name}
                        </td>
                        <td className="px-4 py-3 text-text-muted">
                          <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-md bg-surface-elevated border border-border-subtle">
                            {p.category || "General"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-text-muted">
                          {p.unitOfMeasure || "Units"}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-text-primary">
                          {p.onHand}
                        </td>
                        <td className="px-4 py-3 text-right text-text-muted">
                          {p.reorderPoint}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isLow ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-status-danger/10 text-status-danger border border-status-danger/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-status-danger animate-pulse" />
                              Low Stock
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-status-success/10 text-status-success border border-status-success/20">
                              Optimal
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() =>
                                setProductModal({ isOpen: true, product: p })
                              }
                              title="Edit Product"
                              className="p-1.5 text-text-muted hover:text-brand-primary hover:bg-surface-elevated rounded-md transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(p.id, p.name)}
                              title="Delete Product"
                              className="p-1.5 text-text-muted hover:text-status-danger hover:bg-surface-elevated rounded-md transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB 2: WAREHOUSES --- */}
      {activeTab === "warehouses" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface-card p-4 rounded-xl border border-border-default shadow-xs">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Search warehouses by Name, Code, or Address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-surface-input border border-border-default rounded-lg text-sm text-text-primary placeholder:text-text-muted/50 focus:outline-hidden focus:border-brand-primary transition-colors"
              />
            </div>

            <button
              onClick={() =>
                setWarehouseModal({ isOpen: true, warehouse: null })
              }
              className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-brand-primary/90 transition-colors shadow-xs shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Warehouse
            </button>
          </div>

          {/* Dense Warehouses Table with Skeletons */}
          <div className="overflow-x-auto bg-surface-card rounded-xl border border-border-default shadow-xs">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-elevated/60 text-xs font-semibold uppercase tracking-wider text-text-muted border-b border-border-subtle">
                <tr>
                  <th className="px-4 py-3">Short Code</th>
                  <th className="px-4 py-3">Warehouse Name</th>
                  <th className="px-4 py-3">Physical Address</th>
                  <th className="px-4 py-3 text-center">Locations</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {isLoading ? (
                  [...Array(3)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-4 py-3">
                        <div className="h-4 bg-surface-elevated rounded w-16" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-4 bg-surface-elevated rounded w-36" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-4 bg-surface-elevated rounded w-48" />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="h-4 bg-surface-elevated rounded w-16 mx-auto" />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="h-4 bg-surface-elevated rounded w-12 ml-auto" />
                      </td>
                    </tr>
                  ))
                ) : filteredWarehouses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-text-muted space-y-2">
                        <Building2 className="w-8 h-8 text-text-muted/60" />
                        {warehouses.length === 0 ? (
                          <>
                            <p className="text-sm font-medium text-text-primary">
                              No Warehouses Configured
                            </p>
                            <p className="text-xs text-text-muted max-w-sm">
                              Add a physical facility or regional distribution center to organize storage zones.
                            </p>
                            <div className="pt-2">
                              <button
                                onClick={() =>
                                  setWarehouseModal({
                                    isOpen: true,
                                    warehouse: null,
                                  })
                                }
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-primary text-white text-xs font-medium rounded-lg hover:bg-brand-primary/90 transition-colors shadow-xs cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                Create First Warehouse
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-medium text-text-primary">
                              No Warehouses Match Search Query
                            </p>
                            <p className="text-xs text-text-muted">
                              Try clearing your search terms.
                            </p>
                            <div className="pt-2">
                              <button
                                onClick={() => setSearchQuery("")}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-elevated border border-border-default text-xs font-medium text-text-primary rounded-lg hover:bg-surface-elevated/80 transition-colors cursor-pointer"
                              >
                                <XCircle className="w-3.5 h-3.5 text-text-muted" />
                                Clear Search
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredWarehouses.map((w) => (
                    <tr
                      key={w.id}
                      className="hover:bg-surface-elevated/40 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono font-medium text-brand-primary">
                        {w.shortCode}
                      </td>
                      <td className="px-4 py-3 font-medium text-text-primary">
                        {w.name}
                      </td>
                      <td className="px-4 py-3 text-text-muted">
                        {w.address || "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full bg-surface-elevated border border-border-subtle text-text-primary">
                          {w.locationCount} zones
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() =>
                              setWarehouseModal({ isOpen: true, warehouse: w })
                            }
                            title="Edit Warehouse"
                            className="p-1.5 text-text-muted hover:text-brand-primary hover:bg-surface-elevated rounded-md transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteWarehouse(w.id, w.name)}
                            title="Delete Warehouse"
                            className="p-1.5 text-text-muted hover:text-status-danger hover:bg-surface-elevated rounded-md transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB 3: LOCATIONS --- */}
      {activeTab === "locations" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface-card p-4 rounded-xl border border-border-default shadow-xs">
            <div className="flex flex-1 items-center gap-3 w-full">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  placeholder="Search locations by Name or Code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-surface-input border border-border-default rounded-lg text-sm text-text-primary placeholder:text-text-muted/50 focus:outline-hidden focus:border-brand-primary transition-colors"
                />
              </div>

              <select
                value={warehouseFilter}
                onChange={(e) => setWarehouseFilter(e.target.value)}
                className="px-3 py-2 bg-surface-input border border-border-default rounded-lg text-sm text-text-primary focus:outline-hidden focus:border-brand-primary transition-colors cursor-pointer"
              >
                <option value="ALL">All Warehouses</option>
                {warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setLocationModal({ isOpen: true, location: null })}
              className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-brand-primary/90 transition-colors shadow-xs shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Location
            </button>
          </div>

          {/* Dense Locations Table with Skeletons */}
          <div className="overflow-x-auto bg-surface-card rounded-xl border border-border-default shadow-xs">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-elevated/60 text-xs font-semibold uppercase tracking-wider text-text-muted border-b border-border-subtle">
                <tr>
                  <th className="px-4 py-3">Location Code</th>
                  <th className="px-4 py-3">Zone / Location Name</th>
                  <th className="px-4 py-3">Parent Warehouse</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {isLoading ? (
                  [...Array(4)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-4 py-3">
                        <div className="h-4 bg-surface-elevated rounded w-16" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-4 bg-surface-elevated rounded w-36" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-4 bg-surface-elevated rounded w-28" />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="h-4 bg-surface-elevated rounded w-12 ml-auto" />
                      </td>
                    </tr>
                  ))
                ) : filteredLocations.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-text-muted space-y-2">
                        <MapPin className="w-8 h-8 text-text-muted/60" />
                        {locations.length === 0 ? (
                          <>
                            <p className="text-sm font-medium text-text-primary">
                              No Storage Locations Configured
                            </p>
                            <p className="text-xs text-text-muted max-w-sm">
                              Define internal aisles, racks, and bins within your warehouses to direct putaways and picks.
                            </p>
                            <div className="pt-2">
                              <button
                                onClick={() =>
                                  setLocationModal({
                                    isOpen: true,
                                    location: null,
                                  })
                                }
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-primary text-white text-xs font-medium rounded-lg hover:bg-brand-primary/90 transition-colors shadow-xs cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                Create First Location
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-medium text-text-primary">
                              No Locations Match Your Filters
                            </p>
                            <p className="text-xs text-text-muted">
                              Try clearing your search query or warehouse filter.
                            </p>
                            <div className="pt-2">
                              <button
                                onClick={() => {
                                  setSearchQuery("");
                                  setWarehouseFilter("ALL");
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-elevated border border-border-default text-xs font-medium text-text-primary rounded-lg hover:bg-surface-elevated/80 transition-colors cursor-pointer"
                              >
                                <XCircle className="w-3.5 h-3.5 text-text-muted" />
                                Reset Location Filters
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredLocations.map((l) => (
                    <tr
                      key={l.id}
                      className="hover:bg-surface-elevated/40 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono font-medium text-brand-primary">
                        {l.shortCode}
                      </td>
                      <td className="px-4 py-3 font-medium text-text-primary">
                        {l.name}
                      </td>
                      <td className="px-4 py-3 text-text-muted">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-surface-elevated border border-border-subtle text-xs">
                          <Building2 className="w-3 h-3 text-text-muted" />
                          {l.warehouseName || "Warehouse"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() =>
                              setLocationModal({ isOpen: true, location: l })
                            }
                            title="Edit Location"
                            className="p-1.5 text-text-muted hover:text-brand-primary hover:bg-surface-elevated rounded-md transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteLocation(l.id, l.name)}
                            title="Delete Location"
                            className="p-1.5 text-text-muted hover:text-status-danger hover:bg-surface-elevated rounded-md transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB 4: LOW STOCK ALERTS --- */}
      {activeTab === "alerts" && (
        <div className="space-y-4">
          {/* Summary Box with Skeleton */}
          {isLoading ? (
            <div className="p-4 rounded-xl bg-surface-card border border-border-default animate-pulse flex items-center justify-between">
              <div className="h-5 bg-surface-elevated rounded w-64" />
              <div className="h-8 bg-surface-elevated rounded w-28" />
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-status-danger/10 border border-status-danger/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-status-danger/20 text-status-danger">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">
                    Critical Low Stock Alert Monitor
                  </h3>
                  <p className="text-xs text-text-muted mt-0.5">
                    Real-time alerts triggered when on-hand quantity falls below or matches the minimum reorder threshold.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-xs text-text-muted">Total Low Items</div>
                  <div className="text-xl font-bold text-status-danger">
                    {lowStockSummary.count}
                  </div>
                </div>
                {onNavigate && (
                  <button
                    onClick={() => onNavigate("receipts")}
                    className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-brand-primary text-white hover:bg-brand-primary/90 transition-colors shadow-xs shrink-0 cursor-pointer"
                  >
                    Create Replenishment
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Alert Items Table with Skeletons */}
          <div className="overflow-x-auto bg-surface-card rounded-xl border border-border-default shadow-xs">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-elevated/60 text-xs font-semibold uppercase tracking-wider text-text-muted border-b border-border-subtle">
                <tr>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Product Name</th>
                  <th className="px-4 py-3">Storage Location</th>
                  <th className="px-4 py-3 text-right">Current On-Hand</th>
                  <th className="px-4 py-3 text-right">Reorder Threshold</th>
                  <th className="px-4 py-3 text-right">Deficit</th>
                  <th className="px-4 py-3 text-center">Urgency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {isLoading ? (
                  [...Array(3)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-4 py-3">
                        <div className="h-4 bg-surface-elevated rounded w-16" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-4 bg-surface-elevated rounded w-36" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-4 bg-surface-elevated rounded w-24" />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="h-4 bg-surface-elevated rounded w-10 ml-auto" />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="h-4 bg-surface-elevated rounded w-10 ml-auto" />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="h-4 bg-surface-elevated rounded w-16 ml-auto" />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="h-4 bg-surface-elevated rounded w-20 mx-auto" />
                      </td>
                    </tr>
                  ))
                ) : lowStockSummary.items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-text-muted">
                        <div className="p-3 bg-status-success/10 text-status-success rounded-full mb-2">
                          <Package className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-medium text-text-primary">
                          All product inventory is at or above reorder points!
                        </p>
                        <p className="text-xs text-text-muted mt-1">
                          No stock shortages or low-stock alerts currently detected.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  lowStockSummary.items.map((item, idx) => (
                    <tr
                      key={`${item.productId}-${idx}`}
                      className="hover:bg-surface-elevated/40 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono font-medium text-brand-primary">
                        {item.sku}
                      </td>
                      <td className="px-4 py-3 font-medium text-text-primary">
                        {item.productName}
                      </td>
                      <td className="px-4 py-3 text-text-muted">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-surface-elevated border border-border-subtle text-xs">
                          <MapPin className="w-3 h-3 text-text-muted" />
                          {item.locationName}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-status-danger">
                        {item.onHand}
                      </td>
                      <td className="px-4 py-3 text-right text-text-muted">
                        {item.reorderPoint}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-status-danger">
                        +{item.deficit} required
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-status-danger/10 text-status-danger border border-status-danger/30">
                          CRITICAL LOW
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- MODALS --- */}
      {productModal.isOpen && (
        <ProductFormModal
          product={productModal.product}
          warehouses={warehouses}
          locations={locations}
          onClose={() => setProductModal({ isOpen: false, product: null })}
          onSubmitCreate={handleCreateProduct}
          onSubmitUpdate={handleUpdateProduct}
        />
      )}

      {warehouseModal.isOpen && (
        <WarehouseFormModal
          warehouse={warehouseModal.warehouse}
          onClose={() => setWarehouseModal({ isOpen: false, warehouse: null })}
          onSubmitCreate={handleCreateWarehouse}
          onSubmitUpdate={handleUpdateWarehouse}
        />
      )}

      {locationModal.isOpen && (
        <LocationFormModal
          location={locationModal.location}
          warehouses={warehouses}
          onClose={() => setLocationModal({ isOpen: false, location: null })}
          onSubmitCreate={handleCreateLocation}
          onSubmitUpdate={handleUpdateLocation}
        />
      )}
    </div>
  );
};
