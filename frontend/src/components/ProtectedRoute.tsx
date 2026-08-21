import { Navigate, Outlet, useLocation } from "react-router-dom";
import { isAdminRole, useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";

export function ProtectedRoute({ role }: { role?: "ADMIN" | "RESIDENT" | "TREASURER" | "SECRETARY" }) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f4f6f8] p-4 sm:p-8">
        <div className="mx-auto max-w-5xl space-y-4">
          <Skeleton className="h-10 w-48" />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (role === "ADMIN" && !isAdminRole(user?.role)) {
    return <Navigate to="/resident/dashboard" replace />;
  }
  if (role === "TREASURER" && !["ADMIN", "SOCIETY_ADMIN", "TREASURER", "ACCOUNTANT"].includes(user?.role || "")) {
    return <Navigate to="/resident/dashboard" replace />;
  }
  if (role === "SECRETARY" && !["ADMIN", "SOCIETY_ADMIN", "SECRETARY", "CHAIRMAN"].includes(user?.role || "")) {
    return <Navigate to="/resident/dashboard" replace />;
  }
  if (role === "RESIDENT" && isAdminRole(user?.role)) {
    return <Navigate to="/admin/dashboard" replace />;
  }
  return <Outlet />;
}
