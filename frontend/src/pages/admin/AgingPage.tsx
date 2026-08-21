import { useQuery } from "@tanstack/react-query";
import { reportsApi } from "@/api/resources";
import { PageHeader } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatINR } from "@/lib/money";

export function AgingPage() {
  const { data, isLoading } = useQuery({ queryKey: ["aging"], queryFn: () => reportsApi.aging() });
  if (isLoading) return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div>;
  if (!data) return <p className="text-sm text-red-700">Unable to load aging report.</p>;
  const report = data as { buckets: { range: string; count: number; amount: number }[]; totalOutstanding: number };

  return (
    <div>
      <PageHeader title="Outstanding aging" subtitle="Breakdown of overdue amounts by age." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {report.buckets.map((bucket) => (
          <Card key={bucket.range}>
            <CardHeader><CardTitle>{bucket.range} days</CardTitle></CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">{formatINR(bucket.amount)}</p>
              <p className="text-sm text-slate-500">{bucket.count} bills</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="mt-5">
        <CardHeader><CardTitle>Total outstanding</CardTitle></CardHeader>
        <CardContent><p className="text-3xl font-semibold tabular-nums">{formatINR(report.totalOutstanding)}</p></CardContent>
      </Card>
    </div>
  );
}
