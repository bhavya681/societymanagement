import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { incomeApi } from "@/api/resources";
import { PageHeader } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty";
import { Input, Label, Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable, Toolbar } from "@/components/ui/table";
import { formatINR } from "@/lib/money";
import { ApiError } from "@/api/client";

const CATEGORIES = ["parking", "hall_booking", "interest", "advertisement", "noc", "transfer_fees", "clubhouse", "penalty", "other"];

export function IncomePage() {
  const qc = useQueryClient();
  const [category, setCategory] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", category: "", amount: "", payer: "", reference: "", incomeDate: new Date().toISOString().slice(0, 10), paymentMethod: "BANK_TRANSFER", notes: "" });
  const query = useQuery({
    queryKey: ["income", category],
    queryFn: () => incomeApi.list({ category: category || undefined, limit: 50 }),
  });
  const create = useMutation({
    mutationFn: incomeApi.create,
    onSuccess: () => { toast.success("Income recorded"); qc.invalidateQueries({ queryKey: ["income"] }); setOpen(false); resetForm(); },
    onError: (e: Error) => toast.error(e instanceof ApiError ? e.message : e.message),
  });
  const rows = query.data?.items ?? [];

  function resetForm() {
    setForm({ title: "", category: "", amount: "", payer: "", reference: "", incomeDate: new Date().toISOString().slice(0, 10), paymentMethod: "BANK_TRANSFER", notes: "" });
  }

  return (
    <div>
      <PageHeader title="Income" subtitle="Other income sources: parking, hall booking, NOC, transfer fees, etc." actions={<Button size="sm" onClick={() => setOpen(true)}>Add income</Button>} />
      <Toolbar>
        <Select className="sm:max-w-xs" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </Select>
      </Toolbar>
      {query.isLoading ? <Skeleton className="h-64" /> : !rows.length ? <EmptyState title="No income records found." /> : (
        <DataTable rows={rows} rowKey={(r) => String(r.id)} columns={[
          { header: "Title", cell: (r) => <span className="font-medium text-slate-900">{String(r.title)}</span> },
          { header: "Category", cell: (r) => String(r.category) },
          { header: "Amount", align: "right", cell: (r) => formatINR(r.amount as number) },
          { header: "Date", cell: (r) => r.incomeDate ? new Date(r.incomeDate as string).toLocaleDateString("en-IN") : "—" },
          { header: "Payer", cell: (r) => String(r.payer || "—") },
        ]} mobile={(r) => (
          <div className="flex items-start justify-between gap-3">
            <div><p className="font-medium text-slate-900">{String(r.title)}</p><p className="text-xs text-slate-500">{String(r.category)} · {r.incomeDate ? new Date(r.incomeDate as string).toLocaleDateString("en-IN") : "—"}</p></div>
            <p className="font-medium tabular-nums">{formatINR(r.amount as number)}</p>
          </div>
        )} />
      )}
      <Modal title="Add income" open={open} onClose={() => { setOpen(false); resetForm(); }}>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); create.mutate(form); }}>
          <div><Label>Title</Label><Input className="mt-1" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div><Label>Category</Label><Select className="mt-1" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            <option value="">Select</option>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </Select></div>
          <div><Label>Amount (₹)</Label><Input className="mt-1" type="number" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
          <div><Label>Payer</Label><Input className="mt-1" value={form.payer} onChange={(e) => setForm({ ...form, payer: e.target.value })} /></div>
          <div><Label>Reference</Label><Input className="mt-1" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} /></div>
          <div><Label>Date</Label><Input className="mt-1" type="date" required value={form.incomeDate} onChange={(e) => setForm({ ...form, incomeDate: e.target.value })} /></div>
          <Button className="w-full" disabled={create.isPending}>Save income</Button>
        </form>
      </Modal>
    </div>
  );
}
