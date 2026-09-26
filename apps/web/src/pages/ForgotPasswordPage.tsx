import React, { useState } from "react";
import { FormGroup } from "../components/FormGroup";
import { useAuthStore } from "../lib/authStore";
import { RequestOtpInputSchema, ResetPasswordInputSchema } from "@stocksense/schemas";

interface ForgotPasswordPageProps {
  onNavigate: (page: string) => void;
}

export const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({ onNavigate }) => {
  const { requestOtp, resetPassword, isLoading, error, clearError } = useAuthStore();
  const [step, setStep] = useState<"request" | "verify">("request");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setFieldErrors({});

    const result = RequestOtpInputSchema.safeParse({ email });
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
      const msg = await requestOtp(email);
      setSuccessMessage(msg);
      setStep("verify");
    } catch {
      // error handled in store
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setFieldErrors({});

    const result = ResetPasswordInputSchema.safeParse({
      email,
      otp,
      newPassword,
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
      const msg = await resetPassword({ email, otp, newPassword, confirmPassword });
      setSuccessMessage(msg);
      setTimeout(() => {
        onNavigate("login");
      }, 2000);
    } catch {
      // error handled in store
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="border border-border rounded bg-surface p-6">
        <div className="mb-6">
          <h1 className="text-lg font-semibold text-primary tracking-tight">
            Reset your password
          </h1>
          <p className="text-sm text-primary-muted mt-1">
            {step === "request"
              ? "Enter your account email to receive a 6-digit verification code."
              : "Enter the code sent to your email and set your new password."}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-status-late/30 rounded text-xs text-status-late">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 bg-green-50 border border-status-done/30 rounded text-xs text-status-done">
            {successMessage}
          </div>
        )}

        {step === "request" ? (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <FormGroup
              id="otp-email"
              label="Email address"
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={fieldErrors.email}
              disabled={isLoading}
              autoComplete="email"
            />

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-9 mt-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Sending code..." : "Send verification code"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <FormGroup
              id="reset-otp"
              label="6-Digit Verification Code"
              type="text"
              maxLength={6}
              placeholder="123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              error={fieldErrors.otp}
              disabled={isLoading}
            />

            <FormGroup
              id="reset-new-password"
              label="New Password"
              type="password"
              placeholder="At least 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              error={fieldErrors.newPassword}
              disabled={isLoading}
              autoComplete="new-password"
            />

            <FormGroup
              id="reset-confirm-password"
              label="Confirm New Password"
              type="password"
              placeholder="Repeat your new password"
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
              {isLoading ? "Updating password..." : "Confirm new password"}
            </button>
          </form>
        )}

        <div className="mt-6 pt-4 border-t border-border text-center text-xs text-primary-muted">
          Remembered your password?{" "}
          <button
            type="button"
            onClick={() => onNavigate("login")}
            className="text-accent hover:text-accent-hover font-medium"
          >
            Back to login
          </button>
        </div>
      </div>
    </div>
  );
};
