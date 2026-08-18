import { Navigate, Outlet, useLocation } from "react-router-dom";
import { isAdminRole, useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";

export function ProtectedRoute({ role }: { role?: "ADMIN" | "RESIDENT" }) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (role === "ADMIN" && !isAdminRole(user?.role)) {
    return <Navigate to="/resident/dashboard" replace />;
  }
  if (role === "RESIDENT" && isAdminRole(user?.role)) {
    return <Navigate to="/admin/dashboard" replace />;
  }
  return <Outlet />;
}
