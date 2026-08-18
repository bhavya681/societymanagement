import type { ReactNode } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Bell,
  Building2,
  ClipboardList,
  FileText,
  Home,
  IndianRupee,
  LayoutDashboard,
  LogOut,
  Menu,
  Receipt,
  Settings,
  Shield,
  Users,
  Wallet,
  Wrench,
  X,
} from "lucide-react";
import { useState } from "react";
import { isAdminRole, useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const adminNav = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/residents", label: "Residents", icon: Users },
  { to: "/admin/buildings", label: "Buildings", icon: Building2 },
  { to: "/admin/flats", label: "Flats", icon: Home },
  { to: "/admin/bills", label: "Bills", icon: Receipt },
  { to: "/admin/payments", label: "Payments", icon: IndianRupee },
  { to: "/admin/expenses", label: "Expenses", icon: Wallet },
  { to: "/admin/requests", label: "Requests", icon: Wrench },
  { to: "/admin/announcements", label: "Announcements", icon: Bell },
  { to: "/admin/documents", label: "Documents", icon: FileText },
  { to: "/admin/reports", label: "Reports", icon: ClipboardList },
  { to: "/admin/audit", label: "Audit log", icon: Shield },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

const residentNav = [
  { to: "/resident/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/resident/bills", label: "My Bills", icon: Receipt },
  { to: "/resident/payments", label: "Payments", icon: IndianRupee },
  { to: "/resident/requests", label: "Requests", icon: Wrench },
  { to: "/resident/announcements", label: "Announcements", icon: Bell },
  { to: "/resident/directory", label: "Directory", icon: Users },
  { to: "/resident/documents", label: "Documents", icon: FileText },
  { to: "/resident/profile", label: "Profile", icon: Settings },
];

export function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const admin = isAdminRole(user?.role);
  const nav = admin ? adminNav : residentNav;
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-[260px_1fr]">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-[260px] bg-sidebar text-white transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <div>
            <p className="text-sm font-bold tracking-wide text-emerald-300">SOCIETY HUB</p>
            <p className="text-xs text-slate-400">Maintenance platform</p>
          </div>
          <button className="lg:hidden" onClick={() => setOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="space-y-1 px-3 pb-8">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white",
                  isActive && "bg-primary text-white shadow-sm",
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur">
          <button className="rounded-md p-2 hover:bg-slate-100 lg:hidden" onClick={() => setOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden lg:block">
            <p className="text-sm font-semibold">{admin ? "Administrator console" : "Resident portal"}</p>
            <p className="text-xs text-slate-500">Sunrise Residency operations</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-semibold">{user?.name}</p>
              <p className="text-xs text-slate-500">{user?.role}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await logout();
                navigate("/login");
              }}
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </header>
        <main className="p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
