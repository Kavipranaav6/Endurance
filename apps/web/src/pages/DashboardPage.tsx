import React from "react";
import { useAuthStore } from "../lib/authStore";

interface DashboardPageProps {
  onNavigate: (page: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    onNavigate("login");
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <div className="border border-border rounded bg-surface p-6">
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div>
            <h1 className="text-xl font-semibold text-primary tracking-tight">
              StockSense Dashboard
            </h1>
            <p className="text-sm text-primary-muted mt-1">
              Authenticated Session Verified (Phase 1 — Auth)
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="h-8 px-3 text-xs font-medium text-primary border border-border hover:bg-background-subtle rounded transition-colors"
          >
            Log out
          </button>
        </div>

        <div className="py-6 space-y-4">
          <div className="p-4 bg-background-subtle border border-border rounded">
            <h2 className="text-xs uppercase tracking-wider font-semibold text-primary-muted mb-2">
              User Profile
            </h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-primary-muted">Name:</span>{" "}
                <span className="font-medium text-primary">{user?.name || "—"}</span>
              </div>
              <div>
                <span className="text-primary-muted">Email:</span>{" "}
                <span className="font-medium text-primary">{user?.email || "—"}</span>
              </div>
              <div>
                <span className="text-primary-muted">Role:</span>{" "}
                <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium text-accent bg-accent-subtle rounded border border-accent/20">
                  {user?.role || "STAFF"}
                </span>
              </div>
              <div>
                <span className="text-primary-muted">User ID:</span>{" "}
                <span className="font-mono text-xs text-primary">{user?.id || "—"}</span>
              </div>
            </div>
          </div>

          <div className="p-4 border border-border rounded text-xs text-primary-muted leading-relaxed">
            <span className="font-medium text-primary">Auth System Status:</span> JWT access tokens are validated on incoming requests, refresh tokens are managed via secure httpOnly cookies, and protected route redirection is active. Ready for Phase 2 Ledger integration.
          </div>
        </div>
      </div>
    </div>
  );
};
