import { useEffect, useState } from "react";
import { useAuthStore } from "./lib/authStore";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ProtectedRoute } from "./components/ProtectedRoute";

export function App() {
  const { initAuth, isAuthenticated, isLoading } = useAuthStore();
  const [currentPage, setCurrentPage] = useState<string>(() => {
    const hash = window.location.hash.replace("#", "");
    return hash || "dashboard";
  });

  useEffect(() => {
    initAuth();
  }, [initAuth]);

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
      if (isAuthenticated && (currentPage === "login" || currentPage === "signup" || currentPage === "forgot-password")) {
        navigate("dashboard");
      }
    }
  }, [isAuthenticated, isLoading, currentPage]);

  return (
    <div className="min-h-screen bg-background text-primary flex flex-col justify-between p-6">
      <header className="border-b border-border pb-4">
        <div className="flex items-center justify-between">
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

          <div className="flex items-center space-x-2">
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
          </>
        )}
      </main>

      <footer className="border-t border-border pt-4 text-xs text-primary-muted flex justify-between">
        <span>StockSense • Append-Only Ledger Engine</span>
        <span>Phase 1 — Auth & Access Control</span>
      </footer>
    </div>
  );
}

export default App;
