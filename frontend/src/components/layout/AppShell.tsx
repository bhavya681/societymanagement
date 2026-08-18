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
  TrendingUp,
  BarChart3,
  CalendarClock,
} from "lucide-react";
import { useState } from "react";
import { isAdminRole, useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const adminGroups = [
  {
    label: "Overview",
    items: [{ to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Property",
    items: [
      { to: "/admin/residents", label: "Residents", icon: Users },
      { to: "/admin/buildings", label: "Buildings", icon: Building2 },
      { to: "/admin/flats", label: "Flats", icon: Home },
    ],
  },
  {
    label: "Finance",
    items: [
      { to: "/admin/bills", label: "Bills", icon: Receipt },
      { to: "/admin/payments", label: "Payments", icon: IndianRupee },
      { to: "/admin/expenses", label: "Expenses", icon: Wallet },
      { to: "/admin/vendors", label: "Vendors", icon: Users },
      { to: "/admin/recurring-expenses", label: "Recurring", icon: CalendarClock },
      { to: "/admin/income", label: "Income", icon: TrendingUp },
      { to: "/admin/cash-flow", label: "Cash flow", icon: BarChart3 },
      { to: "/admin/reports", label: "Reports", icon: ClipboardList },
    ],
  },
  {
    label: "Operations",
    items: [
      { to: "/admin/requests", label: "Requests", icon: Wrench },
      { to: "/admin/announcements", label: "Announcements", icon: Bell },
      { to: "/admin/documents", label: "Documents", icon: FileText },
    ],
  },
  {
    label: "Closing",
    items: [
      { to: "/admin/aging", label: "Aging", icon: BarChart3 },
      { to: "/admin/month-closing", label: "Month closing", icon: CalendarClock },
    ],
  },
  {
    label: "System",
    items: [
      { to: "/admin/audit", label: "Audit log", icon: Shield },
      { to: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
];

const residentGroups = [
  {
    label: "Account",
    items: [
      { to: "/resident/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/resident/bills", label: "My bills", icon: Receipt },
      { to: "/resident/payments", label: "Payments", icon: IndianRupee },
    ],
  },
  {
    label: "Society",
    items: [
      { to: "/resident/requests", label: "Requests", icon: Wrench },
      { to: "/resident/announcements", label: "Announcements", icon: Bell },
      { to: "/resident/directory", label: "Directory", icon: Users },
      { to: "/resident/documents", label: "Documents", icon: FileText },
      { to: "/resident/profile", label: "Profile", icon: Settings },
    ],
  },
];

function initials(name?: string) {
  if (!name) return "U";
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const admin = isAdminRole(user?.role);
  const groups = admin ? adminGroups : residentGroups;
  const [open, setOpen] = useState(false);

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f4f6f8] lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[240px] flex-col bg-sidebar text-slate-300 transition-transform duration-200 lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-white/10 px-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">Society Hub</p>
            <p className="truncate text-xs text-slate-400">
              {user?.role ? user.role.replaceAll("_", " ").toLowerCase() : admin ? "Administrator" : "Resident"}
            </p>
          </div>
          <button type="button" className="rounded-md p-1 hover:bg-white/10 lg:hidden" onClick={() => setOpen(false)}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {groups.map((group) => (
            <div key={group.label} className="mb-5">
              <p className="mb-1.5 px-2 text-[11px] font-medium uppercase tracking-wide text-slate-500">{group.label}</p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm hover:bg-white/5 hover:text-white",
                        isActive && "bg-teal-800 text-white",
                      )
                    }
                  >
                    <item.icon className="h-4 w-4 shrink-0 opacity-80" />
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-800 text-xs font-semibold text-white">
              {initials(user?.name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{user?.name}</p>
              <p className="truncate text-xs text-slate-400">{user?.email}</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-3 sm:px-5 lg:px-6">
          <button
            type="button"
            className="rounded-md p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900">Sunrise Residency</p>
            <p className="hidden truncate text-xs text-slate-500 sm:block">
              {admin ? "Society operations console" : "Resident portal"}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Log out</span>
          </Button>
        </header>
        <main className="mx-auto w-full max-w-[1280px] min-w-0 flex-1 p-3 sm:p-5 lg:p-6">
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
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">{title}</h1>
        {subtitle ? <p className="mt-1 max-w-2xl text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end [&>*]:flex-1 sm:[&>*]:flex-none">{actions}</div> : null}
    </div>
  );
}
