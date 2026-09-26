import React, { useEffect } from "react";
import { useAuthStore } from "../lib/authStore";

interface ProtectedRouteProps {
  children: React.ReactNode;
  onRedirect: (page: string) => void;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  onRedirect,
}) => {
  const { isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      onRedirect("login");
    }
  }, [isAuthenticated, isLoading, onRedirect]);

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-sm text-primary-muted font-medium animate-pulse">
          Verifying session...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
};
