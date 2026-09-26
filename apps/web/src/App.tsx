import { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "./lib/authStore";
import { trpcCall } from "./lib/api";
import { useStockWebSocket } from "./lib/useStockWebSocket";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ReceiptsPage } from "./pages/ReceiptsPage";
import { DeliveriesPage } from "./pages/DeliveriesPage";
import { TransfersPage } from "./pages/TransfersPage";
import { MoveHistoryPage } from "./pages/MoveHistoryPage";
import { SettingsPage } from "./pages/SettingsPage";
import { ProtectedRoute } from "./components/ProtectedRoute";

export function App() {
  const { initAuth, isAuthenticated, isLoading } = useAuthStore();
  const [currentPage, setCurrentPage] = useState<string>(() => {
    const hash = window.location.hash.replace("#", "");
    return hash || "dashboard";
  });
  const [lowStockCount, setLowStockCount] = useState<number>(0);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  // Fetch low stock summary for active pill badge
  const fetchLowStockSummary = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const summary = await trpcCall<{ count: number }>(
        "settings.getLowStockSummary",
        "query"
      );
      setLowStockCount(summary?.count || 0);
    } catch {
      // quiet fallback
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchLowStockSummary();
    }
  }, [isAuthenticated, fetchLowStockSummary]);

  // WebSocket real-time subscription for live alert updates
  const handleWsEvent = useCallback(
    (event: any) => {
      if (
        event.type === "LEDGER_WRITE" ||
        event.type === "STATE_TRANSITION" ||
        event.type === "LOW_STOCK_ALERT" ||
        event.type === "STOCK_MOVE_CREATED" ||
        event.type === "STOCK_MOVE_UPDATED"
      ) {
        fetchLowStockSummary();
      }
    },
    [fetchLowStockSummary]
  );

  useStockWebSocket(handleWsEvent);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace("#", "");
      if (hash) {
        setCurrentPage(hash);
      }
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const navigate = (page: string) => {
    window.location.hash = page;
    setCurrentPage(page);
  };

  useEffect(() => {
    if (!isLoading) {
      if (
        isAuthenticated &&
        (currentPage === "login" ||
          currentPage === "signup" ||
          currentPage === "forgot-password")) {
        navigate("dashboard");
      }
    }
  }, [isAuthenticated, isLoading, currentPage]);

  return (
    <div className="min-h-screen bg-background text-primary flex flex-col justify-between p-6">
      <header className="border-b border-border pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3">
              <h1
                onClick={() => navigate("dashboard")}
                className="text-xl font-semibold tracking-tight text-primary cursor-pointer hover:opacity-80 transition-opacity"
              >
                StockSense
              </h1>
              <span className="text-xs text-primary-muted border-l border-border pl-3">
                Inventory Ledger ERP
              </span>
            </div>

            {/* Authenticated Navigation Tabs */}
            {isAuthenticated && (
              <nav className="flex items-center space-x-1 text-xs">
                <button
                  onClick={() => navigate("dashboard")}
                  className={`px-3 py-1.5 rounded font-medium transition-colors cursor-pointer ${
                    currentPage === "dashboard"
                      ? "bg-primary text-white"
                      : "text-primary-muted hover:text-primary hover:bg-background-subtle"
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => navigate("receipts")}
                  className={`px-3 py-1.5 rounded font-medium transition-colors cursor-pointer ${
                    currentPage === "receipts"
                      ? "bg-primary text-white"
                      : "text-primary-muted hover:text-primary hover:bg-background-subtle"
                  }`}
                >
                  Receipts
                </button>
                <button
                  onClick={() => navigate("deliveries")}
                  className={`px-3 py-1.5 rounded font-medium transition-colors cursor-pointer ${
                    currentPage === "deliveries"
                      ? "bg-primary text-white"
                      : "text-primary-muted hover:text-primary hover:bg-background-subtle"
                  }`}
                >
                  Deliveries
                </button>
                <button
                  onClick={() => navigate("transfers")}
                  className={`px-3 py-1.5 rounded font-medium transition-colors cursor-pointer ${
                    currentPage === "transfers"
                      ? "bg-primary text-white"
                      : "text-primary-muted hover:text-primary hover:bg-background-subtle"
                  }`}
                >
                  Transfers & Adjustments
                </button>
                <button
                  onClick={() => navigate("moves")}
                  className={`px-3 py-1.5 rounded font-medium transition-colors cursor-pointer ${
                    currentPage === "moves"
                      ? "bg-primary text-white"
                      : "text-primary-muted hover:text-primary hover:bg-background-subtle"
                  }`}
                >
                  Move History
                </button>
                <button
                  onClick={() => navigate("settings")}
                  className={`px-3 py-1.5 rounded font-medium transition-colors cursor-pointer ${
                    currentPage.startsWith("settings")
                      ? "bg-primary text-white"
                      : "text-primary-muted hover:text-primary hover:bg-background-subtle"
                  }`}
                >
                  Settings
                </button>
              </nav>
            )}
          </div>

          <div className="flex items-center space-x-3">
            {/* Live Low-Stock Alert Active Pill Badge (Option 1) */}
            {isAuthenticated && lowStockCount > 0 && (
              <button
                onClick={() => navigate("settings-alerts")}
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-status-danger bg-status-danger/10 border border-status-danger/30 rounded-full hover:bg-status-danger/20 transition-all animate-pulse cursor-pointer shadow-xs"
                title="Critical Low Stock Alert: Click to view items and reorder"
              >
                <span>🚨</span>
                <span>{lowStockCount} Low Stock</span>
              </button>
            )}

            {!isLoading && (
              <>
                {!isAuthenticated ? (
                  <div className="flex items-center space-x-2 text-xs">
                    <button
                      onClick={() => navigate("login")}
                      className={`px-3 py-1.5 rounded transition-colors ${
                        currentPage === "login"
                          ? "bg-primary text-white"
                          : "text-primary-muted hover:text-primary"
                      }`}
                    >
                      Log in
                    </button>
                    <button
                      onClick={() => navigate("signup")}
                      className={`px-3 py-1.5 rounded transition-colors ${
                        currentPage === "signup"
                          ? "bg-accent text-white"
                          : "border border-border text-primary hover:bg-background-subtle"
                      }`}
                    >
                      Sign up
                    </button>
                  </div>
                ) : (
                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-status-done bg-green-50 rounded border border-status-done/20">
                    Session Active
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </header>

      <main className="my-auto py-8">
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-sm text-primary-muted animate-pulse">
              Initializing application...
            </p>
          </div>
        ) : (
          <>
            {currentPage === "login" && <LoginPage onNavigate={navigate} />}
            {currentPage === "signup" && <SignupPage onNavigate={navigate} />}
            {currentPage === "forgot-password" && (
              <ForgotPasswordPage onNavigate={navigate} />
            )}
            {currentPage === "dashboard" && (
              <ProtectedRoute onRedirect={navigate}>
                <DashboardPage onNavigate={navigate} />
              </ProtectedRoute>
            )}
            {currentPage === "receipts" && (
              <ProtectedRoute onRedirect={navigate}>
                <ReceiptsPage onNavigate={navigate} />
              </ProtectedRoute>
            )}
            {currentPage === "deliveries" && (
              <ProtectedRoute onRedirect={navigate}>
                <DeliveriesPage onNavigate={navigate} />
              </ProtectedRoute>
            )}
            {currentPage === "transfers" && (
              <ProtectedRoute onRedirect={navigate}>
                <TransfersPage onNavigate={navigate} />
              </ProtectedRoute>
            )}
            {currentPage === "moves" && (
              <ProtectedRoute onRedirect={navigate}>
                <MoveHistoryPage onNavigate={navigate} />
              </ProtectedRoute>
            )}
            {currentPage.startsWith("settings") && (
              <ProtectedRoute onRedirect={navigate}>
                <SettingsPage
                  key={currentPage}
                  initialTab={
                    currentPage === "settings-alerts" ? "alerts" : "products"
                  }
                  onNavigate={navigate}
                />
              </ProtectedRoute>
            )}
          </>
        )}
      </main>

      <footer className="border-t border-border pt-4 text-xs text-primary-muted flex justify-between">
        <span>StockSense • Append-Only Ledger ERP</span>
        <span>Phase 8 — Settings & Product Management</span>
      </footer>
    </div>
  );
}

export default App;
