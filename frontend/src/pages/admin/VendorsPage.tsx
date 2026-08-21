import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { vendorsApi } from "@/api/resources";
import { PageHeader } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty";
import { Input, Label, Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable, Toolbar } from "@/components/ui/table";
import { ApiError } from "@/api/client";

const STATUSES = ["ACTIVE", "INACTIVE", "BLACKLISTED"];

export function VendorsPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", category: "", contactPerson: "", phone: "", email: "", address: "", gstNumber: "", panNumber: "", services: "", paymentTerms: "", notes: "", status: "ACTIVE" });
  const query = useQuery({
    queryKey: ["vendors", status],
    queryFn: () => vendorsApi.list({ status: status || undefined, limit: 50 }),
  });
  const create = useMutation({
    mutationFn: vendorsApi.create,
    onSuccess: () => { toast.success("Vendor created"); qc.invalidateQueries({ queryKey: ["vendors"] }); setOpen(false); resetForm(); },
    onError: (e: Error) => toast.error(e instanceof ApiError ? e.message : e.message),
  });
  const remove = useMutation({
    mutationFn: vendorsApi.remove,
    onSuccess: () => { toast.success("Vendor deleted"); qc.invalidateQueries({ queryKey: ["vendors"] }); },
  });
  const rows = query.data?.items ?? [];

  function resetForm() {
    setForm({ name: "", category: "", contactPerson: "", phone: "", email: "", address: "", gstNumber: "", panNumber: "", services: "", paymentTerms: "", notes: "", status: "ACTIVE" });
  }

  return (
    <div>
      <PageHeader title="Vendors" subtitle="Security, housekeeping, lift, maintenance and other service providers." actions={<Button size="sm" onClick={() => setOpen(true)}>Add vendor</Button>} />
      <Toolbar>
        <Select className="sm:max-w-xs" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </Select>
      </Toolbar>
      {query.isLoading ? <Skeleton className="h-64" /> : !rows.length ? <EmptyState title="No vendors found." /> : (
        <DataTable rows={rows} rowKey={(r) => String(r.id)} columns={[
          { header: "Name", cell: (r) => <span className="font-medium text-slate-900">{String(r.name)}</span> },
          { header: "Category", cell: (r) => String(r.category) },
          { header: "Contact", cell: (r) => String(r.phone || r.contactPerson || "—") },
          { header: "Status", cell: (r) => <Badge status={String(r.status)} /> },
          { header: "", cell: (r) => <Button variant="outline" size="sm" onClick={() => remove.mutate(String(r.id))}>Delete</Button> },
        ]} mobile={(r) => (
          <div className="flex items-start justify-between gap-3">
            <div><p className="font-medium text-slate-900">{String(r.name)}</p><p className="text-xs text-slate-500">{String(r.category)} · {String(r.phone || "—")}</p></div>
            <Badge status={String(r.status)} />
          </div>
        )} />
      )}
      <Modal title="Add vendor" open={open} onClose={() => { setOpen(false); resetForm(); }}>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); create.mutate(form); }}>
          <div><Label>Name</Label><Input className="mt-1" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>Category</Label><Select className="mt-1" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            <option value="">Select</option>
            {["security", "housekeeping", "electricity", "water", "lift", "repairs", "other"].map((c) => <option key={c}>{c}</option>)}
          </Select></div>
          <div><Label>Contact person</Label><Input className="mt-1" value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} /></div>
          <div><Label>Phone</Label><Input className="mt-1" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div><Label>Email</Label><Input className="mt-1" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><Label>GST Number</Label><Input className="mt-1" value={form.gstNumber} onChange={(e) => setForm({ ...form, gstNumber: e.target.value })} /></div>
          <Button className="w-full" disabled={create.isPending}>Save vendor</Button>
        </form>
      </Modal>
    </div>
  );
}
