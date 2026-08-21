import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { recurringExpensesApi } from "@/api/resources";
import { PageHeader } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty";
import { Input, Label, Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable, Toolbar } from "@/components/ui/table";
import { formatINR } from "@/lib/money";
import { ApiError } from "@/api/client";

const STATUSES = ["ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"];
const FREQUENCIES = ["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"];

export function RecurringExpensesPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", category: "", description: "", expectedAmount: "", vendorId: "", frequency: "MONTHLY", startDate: "", endDate: "", nextDueDate: "", paymentMethod: "BANK_TRANSFER", status: "ACTIVE" });
  const query = useQuery({
    queryKey: ["recurring-expenses", status],
    queryFn: () => recurringExpensesApi.list({ status: status || undefined, limit: 50 }),
  });
  const create = useMutation({
    mutationFn: recurringExpensesApi.create,
    onSuccess: () => { toast.success("Recurring expense created"); qc.invalidateQueries({ queryKey: ["recurring-expenses"] }); setOpen(false); resetForm(); },
    onError: (e: Error) => toast.error(e instanceof ApiError ? e.message : e.message),
  });
  const rows = query.data?.items ?? [];

  function resetForm() {
    setForm({ title: "", category: "", description: "", expectedAmount: "", vendorId: "", frequency: "MONTHLY", startDate: "", endDate: "", nextDueDate: "", paymentMethod: "BANK_TRANSFER", status: "ACTIVE" });
  }

  return (
    <div>
      <PageHeader title="Recurring expenses" subtitle="Scheduled and template expenses for the society." actions={<Button size="sm" onClick={() => setOpen(true)}>Add recurring expense</Button>} />
      <Toolbar>
        <Select className="sm:max-w-xs" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </Select>
      </Toolbar>
      {query.isLoading ? <Skeleton className="h-64" /> : !rows.length ? <EmptyState title="No recurring expenses found." /> : (
        <DataTable rows={rows} rowKey={(r) => String(r.id)} columns={[
          { header: "Title", cell: (r) => <span className="font-medium text-slate-900">{String(r.title)}</span> },
          { header: "Frequency", cell: (r) => String(r.frequency) },
          { header: "Expected", align: "right", cell: (r) => formatINR(r.expectedAmount as number) },
          { header: "Next due", cell: (r) => r.nextDueDate ? String(new Date(r.nextDueDate as string).toLocaleDateString("en-IN")) : "—" },
          { header: "Status", cell: (r) => <Badge status={String(r.status)} /> },
        ]} mobile={(r) => (
          <div className="flex items-start justify-between gap-3">
            <div><p className="font-medium text-slate-900">{String(r.title)}</p><p className="text-xs text-slate-500">{String(r.frequency)} · Due {r.nextDueDate ? new Date(r.nextDueDate as string).toLocaleDateString("en-IN") : "—"}</p></div>
            <div className="text-right"><p className="font-medium tabular-nums">{formatINR(r.expectedAmount as number)}</p><Badge status={String(r.status)} /></div>
          </div>
        )} />
      )}
      <Modal title="Add recurring expense" open={open} onClose={() => { setOpen(false); resetForm(); }}>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); create.mutate(form); }}>
          <div><Label>Title</Label><Input className="mt-1" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div><Label>Category</Label><Input className="mt-1" required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
          <div><Label>Expected amount (₹)</Label><Input className="mt-1" type="number" required value={form.expectedAmount} onChange={(e) => setForm({ ...form, expectedAmount: e.target.value })} /></div>
          <div><Label>Frequency</Label><Select className="mt-1" value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })}>{FREQUENCIES.map((f) => <option key={f}>{f}</option>)}</Select></div>
          <div><Label>Next due date</Label><Input className="mt-1" type="date" required value={form.nextDueDate} onChange={(e) => setForm({ ...form, nextDueDate: e.target.value })} /></div>
          <Button className="w-full" disabled={create.isPending}>Save</Button>
        </form>
      </Modal>
    </div>
  );
}
