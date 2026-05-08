import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import type { JSX } from "react";
import { LoadingSpinnerWrapper } from "@/components/ui/LoadingSpinner";

export function PublicRoute({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinnerWrapper className="h-screen" />;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
