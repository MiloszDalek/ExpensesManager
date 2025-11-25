import { Navigate } from "react-router-dom";
import type { JSX } from "react";
import { useAuth } from "@/contexts/AuthContext";

export default function AdminRoute({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="login" replace />
  }
  else if (user.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
