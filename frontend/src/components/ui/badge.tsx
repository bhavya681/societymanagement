import { cn } from "@/lib/utils";

const styles: Record<string, string> = {
  PAID: "bg-emerald-50 text-emerald-700 border-emerald-200",
  SUCCESS: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CLEAR: "bg-emerald-50 text-emerald-700 border-emerald-200",
  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PUBLISHED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  RESOLVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CLOSED: "bg-slate-100 text-slate-600 border-slate-200",
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  ASSIGNED: "bg-sky-50 text-sky-700 border-sky-200",
  IN_PROGRESS: "bg-sky-50 text-sky-700 border-sky-200",
  PARTIALLY_PAID: "bg-orange-50 text-orange-700 border-orange-200",
  OVERDUE: "bg-red-50 text-red-700 border-red-200",
  FAILED: "bg-red-50 text-red-700 border-red-200",
  REJECTED: "bg-red-50 text-red-700 border-red-200",
  URGENT: "bg-red-50 text-red-700 border-red-200",
  HIGH: "bg-orange-50 text-orange-700 border-orange-200",
  MEDIUM: "bg-amber-50 text-amber-700 border-amber-200",
  LOW: "bg-slate-100 text-slate-600 border-slate-200",
  IMPORTANT: "bg-orange-50 text-orange-700 border-orange-200",
  OPEN: "bg-amber-50 text-amber-700 border-amber-200",
  ON_HOLD: "bg-slate-100 text-slate-600 border-slate-200",
  INACTIVE: "bg-slate-100 text-slate-600 border-slate-200",
  SUSPENDED: "bg-red-50 text-red-700 border-red-200",
  CANCELLED: "bg-slate-100 text-slate-500 border-slate-200",
  VACANT: "bg-slate-100 text-slate-600 border-slate-200",
  OWNER_OCCUPIED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  TENANT_OCCUPIED: "bg-sky-50 text-sky-700 border-sky-200",
};

export function Badge({ children, status, className }: { children?: string; status?: string; className?: string }) {
  const key = (status || children || "").toString();
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize",
        styles[key] || "bg-slate-100 text-slate-700 border-slate-200",
        className,
      )}
    >
      {children || key.replaceAll("_", " ").toLowerCase()}
    </span>
  );
}
