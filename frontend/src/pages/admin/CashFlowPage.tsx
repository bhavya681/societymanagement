import { useQuery } from "@tanstack/react-query";
import { reportsApi } from "@/api/resources";
import { PageHeader } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatINR } from "@/lib/money";

export function CashFlowPage() {
  const { data, isLoading } = useQuery({ queryKey: ["cash-flow"], queryFn: () => reportsApi.cashFlow() });
  if (isLoading) return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div>;
  if (!data) return <p className="text-sm text-red-700">Unable to load cash flow.</p>;
  const flow = data as Record<string, number>;

  return (
    <div>
      <PageHeader title="Cash flow" subtitle="Income, expenses and net cash flow for the society." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Card><CardHeader><CardTitle>Total collected</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold tabular-nums">{formatINR(flow.totalCollected)}</p></CardContent></Card>
        <Card><CardHeader><CardTitle>Other income</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold tabular-nums">{formatINR(flow.totalOtherIncome)}</p></CardContent></Card>
        <Card><CardHeader><CardTitle>Expenses</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold tabular-nums text-red-700">{formatINR(flow.totalExpenses)}</p></CardContent></Card>
        <Card><CardHeader><CardTitle>Net cash flow</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold tabular-nums">{formatINR(flow.netCashFlow)}</p></CardContent></Card>
        <Card><CardHeader><CardTitle>Opening balance</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold tabular-nums">{formatINR(flow.openingBalance)}</p></CardContent></Card>
        <Card><CardHeader><CardTitle>Closing balance</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold tabular-nums">{formatINR(flow.closingBalance)}</p></CardContent></Card>
      </div>
    </div>
  );
}
