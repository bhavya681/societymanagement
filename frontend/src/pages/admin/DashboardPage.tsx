import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { dashboardApi } from "@/api/resources";
import { PageHeader } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatINR } from "@/lib/money";
import { formatDate } from "@/lib/utils";

const pieColors = ["#0f766e", "#f59e0b", "#ef4444", "#fb923c", "#64748b"];

export function AdminDashboardPage() {
  const { data, isLoading, error } = useQuery({ queryKey: ["admin-dashboard"], queryFn: dashboardApi.admin });
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    );
  }
  if (error || !data) return <p className="text-red-600">Unable to load dashboard.</p>;
  const totals = data.totals as Record<string, number>;
  const monthly = (data.collectionSummary as { month: string; collection: number; expenses: number }[]) ?? [];
  const expenses = (data.expenseSummary as { category: string; amount: number }[]) ?? [];
  const status = (data.paymentStatus as { status: string; count: number }[]) ?? [];

  const cards = [
    { label: "Total collection", value: formatINR(totals.totalCollected) },
    { label: "Pending dues", value: formatINR(totals.totalPending) },
    { label: "Overdue", value: formatINR(totals.totalOverdue) },
    { label: "Monthly expenses", value: formatINR(totals.totalExpenses) },
    { label: "Current balance", value: formatINR(totals.currentBalance) },
    { label: "Open requests", value: String(totals.openRequests ?? 0) },
  ];

  return (
    <div>
      <PageHeader
        title="Society health"
        subtitle="Collections, expenses and operations at a glance"
        actions={
          <>
            <Button asChild><Link to="/admin/bills">Generate bills</Link></Button>
            <Button variant="outline" asChild><Link to="/admin/residents">Add resident</Link></Button>
            <Button variant="outline" asChild><Link to="/admin/payments">Record payment</Link></Button>
          </>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardContent className="p-5">
              <p className="text-sm text-slate-500">{card.label}</p>
              <p className="mt-2 text-2xl font-bold">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Collection vs expenses</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="collection" fill="#0f766e" radius={[6, 6, 0, 0]} />
                <Bar dataKey="expenses" fill="#94a3b8" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Expenses by category</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            {expenses.length === 0 ? (
              <p className="text-sm text-slate-500">No expenses found for this period.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={expenses} dataKey="amount" nameKey="category" innerRadius={50} outerRadius={80}>
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
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Payment status</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {status.length === 0 ? <p className="text-sm text-slate-500">No bills yet.</p> : status.map((row) => (
              <div key={row.status} className="flex items-center justify-between text-sm">
                <Badge status={row.status} />
                <span className="font-semibold">{row.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Recent payments</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {((data.recentPayments as Record<string, unknown>[]) ?? []).map((p) => (
              <div key={String(p.id)} className="flex justify-between text-sm">
                <div>
                  <p className="font-medium">{(p.residentId as { name?: string })?.name}</p>
                  <p className="text-xs text-slate-500">{formatDate(p.paymentDate as string)}</p>
                </div>
                <p className="font-semibold">{formatINR(p.amount as number)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Recent requests</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {((data.recentRequests as Record<string, unknown>[]) ?? []).map((r) => (
              <div key={String(r.id)} className="flex justify-between text-sm">
                <p className="font-medium">{String(r.title)}</p>
                <Badge status={String(r.status)} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
