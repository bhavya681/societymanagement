import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { monthClosingApi } from "@/api/resources";
import { PageHeader } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/table";
import { formatINR } from "@/lib/money";
import { ApiError } from "@/api/client";

export function MonthClosingPage() {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [notes, setNotes] = useState("");
  const [open, setOpen] = useState(false);
  const statusQuery = useQuery({
    queryKey: ["month-closing-status", month, year],
    queryFn: () => monthClosingApi.status({ month: String(month), year: String(year) }),
  });
  const listQuery = useQuery({ queryKey: ["month-closing-list"], queryFn: monthClosingApi.list });
  const close = useMutation({
    mutationFn: () => monthClosingApi.close({ month, year, notes }),
    onSuccess: () => { toast.success("Month closed"); setOpen(false); statusQuery.refetch(); listQuery.refetch(); },
    onError: (e: Error) => toast.error(e instanceof ApiError ? e.message : e.message),
  });
  const reopen = useMutation({
    mutationFn: () => monthClosingApi.reopen({ month, year, notes }),
    onSuccess: () => { toast.success("Month reopened"); setOpen(false); statusQuery.refetch(); listQuery.refetch(); },
    onError: (e: Error) => toast.error(e instanceof ApiError ? e.message : e.message),
  });
  const status = statusQuery.data as Record<string, unknown> | undefined;
  const closings = (listQuery.data ?? []) as Record<string, unknown>[];

  return (
    <div>
      <PageHeader title="Month closing" subtitle="Close and reopen financial months with audit trail." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Current month</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500">{month}/{year}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums"><Badge status={String(status?.status || "OPEN")} /></p>
            <div className="mt-4 space-y-2 text-sm">
              <div><Label>Month</Label><Select className="mt-1" value={String(month)} onChange={(e) => setMonth(Number(e.target.value))}>
                {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
              </Select></div>
              <div><Label>Year</Label><Input className="mt-1" type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} /></div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button className="flex-1" size="sm" disabled={String(status?.status) === "CLOSED"} onClick={() => setOpen(true)}>Close month</Button>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="mt-6">
        <h3 className="text-sm font-medium text-slate-500">Closing history</h3>
        {listQuery.isLoading ? <Skeleton className="mt-2 h-32" /> : !closings.length ? <EmptyState title="No month closings yet." /> : (
          <DataTable rows={closings} rowKey={(r) => String(r.id)} columns={[
            { header: "Month", cell: (r) => `${String(r.billingMonth)}/${String(r.billingYear)}` },
            { header: "Status", cell: (r) => <Badge status={String(r.status)} /> },
            { header: "Closed at", cell: (r) => r.closedAt ? new Date(r.closedAt as string).toLocaleString("en-IN") : "—" },
            { header: "Billed", align: "right", cell: (r) => formatINR(r.totalBilled as number) },
            { header: "Collected", align: "right", cell: (r) => formatINR(r.totalCollected as number) },
          ]} mobile={(r) => (
            <div className="flex items-center justify-between gap-3">
              <div><p className="font-medium text-slate-900">{String(r.billingMonth)}/{String(r.billingYear)}</p><p className="text-xs text-slate-500">{r.closedAt ? new Date(r.closedAt as string).toLocaleString("en-IN") : "—"}</p></div>
              <Badge status={String(r.status)} />
            </div>
          )} />
        )}
      </div>
      <Modal title={String(status?.status) === "CLOSED" ? "Reopen month" : "Close month"} open={open} onClose={() => setOpen(false)}>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (String(status?.status) === "CLOSED") { reopen.mutate(); } else { close.mutate(); } }}>
          <p className="text-sm text-slate-500">{String(status?.status) === "CLOSED" ? "This will reopen the month and allow modifications." : "This will lock financial records for this month."}</p>
          <div><Label>Notes</Label><Textarea className="mt-1" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          <Button className="w-full" disabled={close.isPending || reopen.isPending}>{String(status?.status) === "CLOSED" ? "Reopen" : "Close month"}</Button>
        </form>
      </Modal>
    </div>
  );
}
