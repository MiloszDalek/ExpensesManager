import { Navigate } from "react-router-dom";
import type { JSX } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingSpinnerWrapper } from "@/components/ui/LoadingSpinner";

export default function AdminRoute({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinnerWrapper className="h-screen" />;
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }
  else if (user.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
