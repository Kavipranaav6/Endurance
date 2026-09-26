import React, { useState } from "react";
import { FormGroup } from "../components/FormGroup";
import { useAuthStore } from "../lib/authStore";
import { LoginInputSchema } from "@stocksense/schemas";

interface LoginPageProps {
  onNavigate: (page: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate }) => {
  const { login, isLoading, error, clearError } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setFieldErrors({});

    const result = LoginInputSchema.safeParse({ email, password });
    if (!result.success) {
      const errMap: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          errMap[issue.path[0].toString()] = issue.message;
        }
      });
      setFieldErrors(errMap);
      return;
    }

    try {
      await login({ email, password });
      onNavigate("dashboard");
    } catch {
      // error handled in store
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="border border-border rounded bg-surface p-6">
        <div className="mb-6">
          <h1 className="text-lg font-semibold text-primary tracking-tight">
            Log in to StockSense
          </h1>
          <p className="text-sm text-primary-muted mt-1">
            Enter your credentials to access the inventory ledger.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-status-late/30 rounded text-xs text-status-late">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormGroup
            id="login-email"
            label="Email address"
            type="email"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={fieldErrors.email}
            disabled={isLoading}
            autoComplete="email"
          />

          <div className="space-y-1">
            <FormGroup
              id="login-password"
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={fieldErrors.password}
              disabled={isLoading}
              autoComplete="current-password"
            />
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => onNavigate("forgot-password")}
                className="text-xs text-accent hover:text-accent-hover font-medium"
              >
                Forgot password?
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-9 mt-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-border text-center text-xs text-primary-muted">
          Don't have an account?{" "}
          <button
            type="button"
            onClick={() => onNavigate("signup")}
            className="text-accent hover:text-accent-hover font-medium"
          >
            Create account
          </button>
        </div>
      </div>
    </div>
  );
};
