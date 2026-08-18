import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import { announcementsApi, auditApi, documentsApi, downloadExport, reportsApi, requestsApi, societyApi } from "@/api/resources";
import { PageHeader } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog, Modal } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatINR } from "@/lib/money";
import { formatDate, monthName } from "@/lib/utils";
import { ApiError } from "@/api/client";

function err(e: Error) { toast.error(e instanceof ApiError ? e.message : e.message); }

export function RequestsPage() {
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const query = useQuery({ queryKey: ["requests", status, priority], queryFn: () => requestsApi.list({ status: status || undefined, priority: priority || undefined, limit: 50 }) });
  return (
    <div>
      <PageHeader title="Maintenance requests" subtitle="Assign, track and close tickets" actions={<Button variant="outline" onClick={() => downloadExport("requests")}>Export CSV</Button>} />
      <div className="mb-4 flex flex-wrap gap-2">
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="max-w-xs">
          <option value="">All statuses</option>
          {["OPEN","ASSIGNED","IN_PROGRESS","ON_HOLD","RESOLVED","CLOSED","REJECTED"].map((s)=><option key={s}>{s}</option>)}
        </Select>
        <Select value={priority} onChange={(e) => setPriority(e.target.value)} className="max-w-xs">
          <option value="">All priorities</option>
          {["LOW","MEDIUM","HIGH","URGENT"].map((s)=><option key={s}>{s}</option>)}
        </Select>
      </div>
      {query.isLoading ? <Skeleton className="h-64" /> : !query.data?.items.length ? <EmptyState title="No maintenance requests yet." /> : (
        <div className="grid gap-3">
          {query.data.items.map((r) => (
            <Link key={String(r.id)} to={`/admin/requests/${r.id}`}>
              <Card className="hover:border-primary/40">
                <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold">{String(r.title)}</p>
                    <p className="text-sm text-slate-500">{String(r.category)} · {(r.createdBy as { name?: string })?.name} · {formatDate(r.createdAt as string)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge status={String(r.priority)} />
                    <Badge status={String(r.status)} />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function RequestDetailPage({ basePath }: { basePath: "admin" | "resident" }) {
  const { id = "" } = useParams();
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["request", id], queryFn: () => requestsApi.get(id) });
  const update = useMutation({ mutationFn: (body: Record<string, unknown>) => requestsApi.update(id, body), onSuccess: () => { toast.success("Request updated"); qc.invalidateQueries({ queryKey: ["request", id] }); }, onError: err });
  const comment = useMutation({ mutationFn: (body: Record<string, unknown>) => requestsApi.comment(id, body), onSuccess: () => qc.invalidateQueries({ queryKey: ["request", id] }) });
  if (query.isLoading) return <Skeleton className="h-64" />;
  if (!query.data) return <p>Request not found.</p>;
  const r = query.data;
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
      <Card>
        <CardHeader><CardTitle>{String(r.title)}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-slate-600">{String(r.description)}</p>
          <div className="flex gap-2"><Badge status={String(r.status)} /><Badge status={String(r.priority)} /></div>
          {basePath === "admin" ? (
            <div className="flex flex-wrap gap-2">
              {["ASSIGNED","IN_PROGRESS","ON_HOLD","RESOLVED","CLOSED","REJECTED"].map((s) => (
                <Button key={s} size="sm" variant="outline" onClick={() => update.mutate({ status: s })}>{s.replaceAll("_"," ")}</Button>
              ))}
            </div>
          ) : null}
          <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); comment.mutate({ message: f.get("message"), isInternal: f.get("internal") === "on" }); e.currentTarget.reset(); }}>
            <Textarea name="message" placeholder="Add a comment" required />
            {basePath === "admin" ? <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="internal" /> Internal note</label> : null}
            <Button size="sm">Add comment</Button>
          </form>
          <div className="space-y-2">
            <p className="font-semibold">Timeline</p>
            {((r.activities as Record<string, unknown>[]) ?? []).map((a, i) => (
              <div key={i} className="border-l-2 border-primary/30 pl-3 text-sm">
                <p className="font-medium">{String(a.message || a.action)}</p>
                <p className="text-xs text-slate-500">{String(a.actorName)} · {formatDate(a.createdAt as string)}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-2 p-5 text-sm">
          <p><span className="text-slate-500">Category</span><br />{String(r.category)}</p>
          <p><span className="text-slate-500">Location</span><br />{String(r.location || "—")}</p>
          <p><span className="text-slate-500">Resident</span><br />{(r.createdBy as { name?: string })?.name}</p>
        </CardContent>
      </Card>
    </div>
  );
}

export function AnnouncementsPage({ admin }: { admin: boolean }) {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["announcements"], queryFn: () => announcementsApi.list({ limit: 50 }) });
  const [open, setOpen] = useState(false);
  const create = useMutation({ mutationFn: announcementsApi.create, onSuccess: () => { toast.success("Announcement published."); qc.invalidateQueries({ queryKey: ["announcements"] }); setOpen(false); }, onError: err });
  const read = useMutation({ mutationFn: announcementsApi.markRead, onSuccess: () => qc.invalidateQueries({ queryKey: ["announcements"] }) });
  const remove = useMutation({ mutationFn: announcementsApi.remove, onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["announcements"] }); } });
  return (
    <div>
      <PageHeader title="Announcements" subtitle="Society notices and alerts" actions={admin ? <Button onClick={() => setOpen(true)}>Create announcement</Button> : undefined} />
      {query.isLoading ? <Skeleton className="h-64" /> : !query.data?.items.length ? <EmptyState title="No announcements available." /> : (
        <div className="space-y-3">
          {query.data.items.map((a) => (
            <Card key={String(a.id)} className={a.pinned ? "border-primary/40" : ""}>
              <CardContent className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-lg font-semibold">{String(a.title)}</p>
                    <p className="text-xs text-slate-500">{String(a.category)} · {formatDate(a.publishDate as string)}</p>
                  </div>
                  <div className="flex gap-2">
                    {a.important ? <Badge status="IMPORTANT" /> : null}
                    {!a.isRead ? <Badge status="PENDING">Unread</Badge> : <Badge status="PAID">Read</Badge>}
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-600">{String(a.content)}</p>
                <div className="mt-3 flex gap-2">
                  {!a.isRead ? <Button size="sm" variant="outline" onClick={() => read.mutate(String(a.id))}>Mark as read</Button> : null}
                  {admin ? <ConfirmDialog title="Delete announcement?" description="Residents will no longer see this notice." trigger={<Button size="sm" variant="outline">Delete</Button>} onConfirm={() => remove.mutate(String(a.id))} /> : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Modal title="New announcement" open={open} onClose={() => setOpen(false)}>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); create.mutate({ title: f.get("title"), content: f.get("content"), category: f.get("category"), priority: f.get("priority"), expiryDate: f.get("expiryDate") || null, pinned: f.get("pinned") === "on", important: f.get("priority") !== "NORMAL" }); }}>
          <div><Label>Title</Label><Input name="title" required className="mt-1" /></div>
          <div><Label>Content</Label><Textarea name="content" required className="mt-1" /></div>
          <div><Label>Category</Label><Select name="category" className="mt-1">{["general","maintenance","emergency","event","security","water","electricity","meeting"].map((c)=><option key={c}>{c}</option>)}</Select></div>
          <div><Label>Priority</Label><Select name="priority" className="mt-1"><option>NORMAL</option><option>IMPORTANT</option><option>URGENT</option></Select></div>
          <div><Label>Expiry</Label><Input name="expiryDate" type="date" className="mt-1" /></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="pinned" /> Pin announcement</label>
          <Button className="w-full">Publish</Button>
        </form>
      </Modal>
    </div>
  );
}

export function ReportsPage() {
  const year = new Date().getFullYear();
  const financial = useQuery({ queryKey: ["report-fin"], queryFn: () => reportsApi.financial() });
  const maintenance = useQuery({ queryKey: ["report-m"], queryFn: () => reportsApi.maintenance(year) });
  const expenses = useQuery({ queryKey: ["report-e"], queryFn: () => reportsApi.expenses() });
  const requests = useQuery({ queryKey: ["report-r"], queryFn: () => reportsApi.requests() });
  const residents = useQuery({ queryKey: ["report-res"], queryFn: reportsApi.residents });
  const fin = (financial.data || {}) as Record<string, number>;
  return (
    <div>
      <PageHeader title="Reports" subtitle="Figures are calculated from MongoDB records" />
      <div className="grid gap-4 md:grid-cols-4">
        {[["Collected", fin.totalCollected], ["Outstanding", fin.outstanding], ["Expenses", fin.totalExpenses], ["Balance", fin.currentBalance]].map(([l, v]) => (
          <Card key={String(l)}><CardContent className="p-5"><p className="text-sm text-slate-500">{l}</p><p className="text-xl font-bold">{formatINR(v as number)}</p></CardContent></Card>
        ))}
      </div>
      <Card className="mt-6">
        <CardHeader><CardTitle>Maintenance collection ({year})</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr>{["Month","Billed","Collected","Outstanding","Overdue"].map((h)=><th key={h} className="py-2 text-left">{h}</th>)}</tr></thead>
            <tbody>
              {((maintenance.data as Record<string, number>[]) ?? []).map((row) => (
                <tr key={row.month} className="border-t">
                  <td className="py-2">{monthName(row.month)}</td>
                  <td>{formatINR(row.totalBilled)}</td>
                  <td>{formatINR(row.totalCollected)}</td>
                  <td>{formatINR(row.outstanding)}</td>
                  <td>{formatINR(row.overdue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Expense report</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {((expenses.data as Record<string, unknown>[]) ?? []).slice(0, 12).map((e) => (
              <div key={String(e.id)} className="flex justify-between"><span>{String(e.title)}</span><span>{formatINR(e.amount as number)}</span></div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Requests</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            {requests.data ? Object.entries(requests.data as Record<string, number>).map(([k, v]) => <p key={k}>{k}: <strong>{v}</strong></p>) : null}
          </CardContent>
        </Card>
      </div>
      <Card className="mt-6">
        <CardHeader><CardTitle>Resident payment report</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr>{["Resident","Flat","Billed","Paid","Outstanding"].map((h)=><th key={h} className="py-2 text-left">{h}</th>)}</tr></thead>
            <tbody>
              {((residents.data as Record<string, unknown>[]) ?? []).map((r, i) => (
                <tr key={i} className="border-t">
                  <td className="py-2">{String(r.resident)}</td>
                  <td>{String(r.flat)}</td>
                  <td>{formatINR(r.totalBilled as number)}</td>
                  <td>{formatINR(r.paid as number)}</td>
                  <td>{formatINR(r.outstanding as number)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

export function SettingsPage() {
  const query = useQuery({ queryKey: ["society"], queryFn: societyApi.get });
  const update = useMutation({ mutationFn: societyApi.update, onSuccess: () => toast.success("Society settings updated.") });
  if (query.isLoading || !query.data) return <Skeleton className="h-64" />;
  const s = query.data;
  const penalty = (s.penaltyConfig || {}) as Record<string, unknown>;
  return (
    <div>
      <PageHeader title="Society settings" subtitle="Penalty rules, privacy and billing defaults" />
      <Card>
        <CardContent className="p-6">
          <form className="grid gap-4 md:grid-cols-2" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); update.mutate({ name: f.get("name"), contactEmail: f.get("contactEmail"), contactPhone: f.get("contactPhone"), maintenanceDueDay: Number(f.get("maintenanceDueDay")), defaultMaintenance: Number(f.get("defaultMaintenance")), penaltyConfig: { type: f.get("penaltyType"), fixedPenalty: Number(f.get("fixedPenalty")), percentage: Number(f.get("percentage")), gracePeriodDays: Number(f.get("gracePeriodDays")), maxPenalty: Number(f.get("maxPenalty")), autoApply: true }, privacy: { showResidentPhone: f.get("showPhone") === "on", showResidentEmail: f.get("showEmail") === "on", showDirectoryToResidents: f.get("showDir") === "on" } }); }}>
            <div><Label>Name</Label><Input name="name" defaultValue={String(s.name)} className="mt-1" /></div>
            <div><Label>Contact email</Label><Input name="contactEmail" defaultValue={String(s.contactEmail)} className="mt-1" /></div>
            <div><Label>Contact phone</Label><Input name="contactPhone" defaultValue={String(s.contactPhone)} className="mt-1" /></div>
            <div><Label>Due day</Label><Input name="maintenanceDueDay" type="number" defaultValue={Number(s.maintenanceDueDay)} className="mt-1" /></div>
            <div><Label>Default maintenance (₹)</Label><Input name="defaultMaintenance" type="number" defaultValue={Number(s.defaultMaintenance)} className="mt-1" /></div>
            <div><Label>Penalty type</Label><Select name="penaltyType" defaultValue={String(penalty.type || "FIXED")} className="mt-1"><option>FIXED</option><option>PERCENTAGE</option></Select></div>
            <div><Label>Fixed penalty (₹)</Label><Input name="fixedPenalty" type="number" defaultValue={Number(penalty.fixedPenalty || 100)} className="mt-1" /></div>
            <div><Label>Percentage</Label><Input name="percentage" type="number" defaultValue={Number(penalty.percentage || 2)} className="mt-1" /></div>
            <div><Label>Grace days</Label><Input name="gracePeriodDays" type="number" defaultValue={Number(penalty.gracePeriodDays || 10)} className="mt-1" /></div>
            <div><Label>Max penalty (₹)</Label><Input name="maxPenalty" type="number" defaultValue={Number(penalty.maxPenalty || 500)} className="mt-1" /></div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="showPhone" defaultChecked /> Show phone in directory</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="showEmail" /> Show email in directory</label>
            <label className="flex items-center gap-2 text-sm md:col-span-2"><input type="checkbox" name="showDir" defaultChecked /> Allow resident directory</label>
            <Button className="md:col-span-2">Save settings</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export function DocumentsPage({ admin }: { admin: boolean }) {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["docs"], queryFn: documentsApi.list });
  const [open, setOpen] = useState(false);
  const create = useMutation({ mutationFn: documentsApi.create, onSuccess: () => { toast.success("Document added"); qc.invalidateQueries({ queryKey: ["docs"] }); setOpen(false); }, onError: err });
  return (
    <div>
      <PageHeader title="Society documents" subtitle="Metadata and external file references. Configure S3/Cloudinary later for uploads." actions={admin ? <Button onClick={() => setOpen(true)}>Add document</Button> : undefined} />
      {query.isLoading ? <Skeleton className="h-40" /> : !query.data?.length ? <EmptyState title="No documents yet." /> : (
        <div className="space-y-3">
          {query.data.map((d) => (
            <Card key={String(d.id)}><CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="font-semibold">{String(d.title)}</p>
                <p className="text-sm text-slate-500">{String(d.category)} · {String(d.storageProvider)}</p>
              </div>
              {d.url ? <a className="text-sm font-semibold text-primary" href={String(d.url)} target="_blank" rel="noreferrer">Open</a> : <span className="text-xs text-slate-400">No file URL</span>}
            </CardContent></Card>
          ))}
        </div>
      )}
      <Modal title="Add document reference" open={open} onClose={() => setOpen(false)}>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); create.mutate({ title: f.get("title"), category: f.get("category"), url: f.get("url"), description: f.get("description") }); }}>
          <div><Label>Title</Label><Input name="title" required className="mt-1" /></div>
          <div><Label>Category</Label><Select name="category" className="mt-1">{["meeting_notice","agm","rules","invoice","maintenance","circular","financial_report","other"].map((c)=><option key={c}>{c}</option>)}</Select></div>
          <div><Label>External URL</Label><Input name="url" className="mt-1" placeholder="https://" /></div>
          <Button className="w-full">Save</Button>
        </form>
      </Modal>
    </div>
  );
}

export function AuditPage() {
  const query = useQuery({ queryKey: ["audit"], queryFn: () => auditApi.list({ limit: 40 }) });
  return (
    <div>
      <PageHeader title="Audit activity" subtitle="Important administrator actions" />
      {query.isLoading ? <Skeleton className="h-64" /> : (
        <div className="space-y-2">
          {query.data?.items.map((a) => (
            <Card key={String(a.id)}><CardContent className="p-4 text-sm">
              <p className="font-semibold">{String(a.action)}</p>
              <p className="text-slate-500">{(a.userId as { name?: string })?.name} · {String(a.entity)} · {formatDate(a.timestamp as string)}</p>
            </CardContent></Card>
          ))}
        </div>
      )}
    </div>
  );
}
