import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { dashboardApi } from "@/api/resources";
import { PageHeader } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, StatCard } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatINR } from "@/lib/money";
import { formatDate } from "@/lib/utils";

const pieColors = ["#0f766e", "#334155", "#d97706", "#b91c1c", "#64748b"];

export function AdminDashboardPage() {
  const { data, isLoading, error } = useQuery({ queryKey: ["admin-dashboard"], queryFn: dashboardApi.admin });
  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }
  if (error || !data) return <p className="text-sm text-red-700">Unable to load dashboard.</p>;
  const totals = data.totals as Record<string, number>;
  const monthly = (data.collectionSummary as { month: string; collection: number; expenses: number }[]) ?? [];
  const expenses = (data.expenseSummary as { category: string; amount: number }[]) ?? [];
  const status = (data.paymentStatus as { status: string; count: number }[]) ?? [];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Collections, expenses and open work for the society."
        actions={
          <>
            <Button asChild size="sm">
              <Link to="/admin/bills">Generate bills</Link>
            </Button>
            <Button variant="outline" asChild size="sm">
              <Link to="/admin/residents">Add resident</Link>
            </Button>
            <Button variant="outline" asChild size="sm">
              <Link to="/admin/payments">Record payment</Link>
            </Button>
          </>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Total collection" value={formatINR(totals.totalCollected)} />
        <StatCard label="Pending dues" value={formatINR(totals.totalPending)} />
        <StatCard label="Overdue" value={formatINR(totals.totalOverdue)} />
        <StatCard label="Expenses" value={formatINR(totals.totalExpenses)} />
        <StatCard label="Current balance" value={formatINR(totals.currentBalance)} />
        <StatCard label="Open requests" value={String(totals.openRequests ?? 0)} />
      </div>
      <div className="mt-5 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Collection vs expenses</CardTitle>
          </CardHeader>
          <CardContent className="h-64 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly} barGap={4} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis width={48} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="collection" name="Collection" fill="#0f766e" radius={[3, 3, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="#94a3b8" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Expenses by category</CardTitle>
          </CardHeader>
          <CardContent className="h-64 sm:h-80">
            {expenses.length === 0 ? (
              <p className="text-sm text-slate-500">No expenses found for this period.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={expenses} dataKey="amount" nameKey="category" innerRadius={48} outerRadius={78}>
                    {expenses.map((_, i) => (
                      <Cell key={i} fill={pieColors[i % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Payment status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {status.length === 0 ? (
              <p className="text-sm text-slate-500">No bills yet.</p>
            ) : (
              status.map((row) => (
                <div key={row.status} className="flex items-center justify-between text-sm">
                  <Badge status={row.status} />
                  <span className="font-medium tabular-nums">{row.count}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent payments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {((data.recentPayments as Record<string, unknown>[]) ?? []).map((p) => (
              <div key={String(p.id)} className="flex items-start justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{(p.residentId as { name?: string })?.name}</p>
                  <p className="text-xs text-slate-500">{formatDate(p.paymentDate as string)}</p>
                </div>
                <p className="shrink-0 font-medium tabular-nums">{formatINR(p.amount as number)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {((data.recentRequests as Record<string, unknown>[]) ?? []).map((r) => (
              <div key={String(r.id)} className="flex items-start justify-between gap-3 text-sm">
                <p className="min-w-0 truncate font-medium">{String(r.title)}</p>
                <Badge status={String(r.status)} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
