import React, { useState } from "react";
import { FormGroup } from "../components/FormGroup";
import { useAuthStore } from "../lib/authStore";
import { SignupInputSchema } from "@stocksense/schemas";

interface SignupPageProps {
  onNavigate: (page: string) => void;
}

export const SignupPage: React.FC<SignupPageProps> = ({ onNavigate }) => {
  const { signup, isLoading, error, clearError } = useAuthStore();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setFieldErrors({});

    const result = SignupInputSchema.safeParse({
      name,
      email,
      password,
      confirmPassword,
    });

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
      await signup({ name, email, password, confirmPassword });
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
            Create an account
          </h1>
          <p className="text-sm text-primary-muted mt-1">
            Join StockSense to manage operations and track ledger movements.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-status-late/30 rounded text-xs text-status-late">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormGroup
            id="signup-name"
            label="Full name"
            type="text"
            placeholder="Alex Vance"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={fieldErrors.name}
            disabled={isLoading}
            autoComplete="name"
          />

          <FormGroup
            id="signup-email"
            label="Email address"
            type="email"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={fieldErrors.email}
            disabled={isLoading}
            autoComplete="email"
          />

          <FormGroup
            id="signup-password"
            label="Password"
            type="password"
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={fieldErrors.password}
            disabled={isLoading}
            autoComplete="new-password"
          />

          <FormGroup
            id="signup-confirm-password"
            label="Confirm password"
            type="password"
            placeholder="Repeat your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={fieldErrors.confirmPassword}
            disabled={isLoading}
            autoComplete="new-password"
          />

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-9 mt-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Creating account..." : "Sign up"}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-border text-center text-xs text-primary-muted">
          Already have an account?{" "}
          <button
            type="button"
            onClick={() => onNavigate("login")}
            className="text-accent hover:text-accent-hover font-medium"
          >
            Sign in
          </button>
        </div>
      </div>
    </div>
  );
};
