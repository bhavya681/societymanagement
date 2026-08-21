import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import { announcementsApi, auditApi, documentsApi, downloadExport, reportsApi, requestsApi, societyApi } from "@/api/resources";
import { PageHeader } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, StatCard } from "@/components/ui/card";
import { ConfirmDialog, Modal } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable, Toolbar } from "@/components/ui/table";
import { formatINR } from "@/lib/money";
import { formatDate, monthName } from "@/lib/utils";
import { ApiError } from "@/api/client";

function err(e: Error) {
  toast.error(e instanceof ApiError ? e.message : e.message);
}

const REQUEST_STATUSES = ["OPEN", "ASSIGNED", "IN_PROGRESS", "ON_HOLD", "RESOLVED", "CLOSED", "REJECTED"];

export function RequestsPage() {
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const query = useQuery({
    queryKey: ["requests", status, priority],
    queryFn: () => requestsApi.list({ status: status || undefined, priority: priority || undefined, limit: 50 }),
  });
  const rows = query.data?.items ?? [];

  return (
    <div>
      <PageHeader
        title="Maintenance requests"
        subtitle="Assign, track and close tickets."
        actions={
          <Button variant="outline" size="sm" onClick={() => downloadExport("requests")}>
            Export CSV
          </Button>
        }
      />
      <Toolbar>
        <Select className="sm:max-w-xs" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {REQUEST_STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </Select>
        <Select className="sm:max-w-xs" value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="">All priorities</option>
          {["LOW", "MEDIUM", "HIGH", "URGENT"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </Select>
      </Toolbar>
      {query.isLoading ? (
        <Skeleton className="h-64" />
      ) : !rows.length ? (
        <EmptyState title="No maintenance requests yet." />
      ) : (
        <DataTable
          rows={rows}
          rowKey={(row) => String(row.id)}
          columns={[
            { header: "Request", cell: (r) => <span className="font-medium text-slate-900">{String(r.title)}</span> },
            { header: "Category", cell: (r) => String(r.category) },
            { header: "Resident", cell: (r) => (r.createdBy as { name?: string })?.name },
            { header: "Opened", cell: (r) => formatDate(r.createdAt as string) },
            { header: "Priority", cell: (r) => <Badge status={String(r.priority)} /> },
            { header: "Status", cell: (r) => <Badge status={String(r.status)} /> },
            {
              header: "",
              cell: (r) => (
                <Button asChild size="sm" variant="outline">
                  <Link to={`/admin/requests/${r.id}`}>Open</Link>
                </Button>
              ),
            },
          ]}
          mobile={(r) => (
            <Link to={`/admin/requests/${r.id}`} className="block">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">{String(r.title)}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {String(r.category)} · {(r.createdBy as { name?: string })?.name} · {formatDate(r.createdAt as string)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Badge status={String(r.priority)} />
                  <Badge status={String(r.status)} />
                </div>
              </div>
            </Link>
          )}
        />
      )}
    </div>
  );
}

export function RequestDetailPage({ basePath }: { basePath: "admin" | "resident" }) {
  const { id = "" } = useParams();
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["request", id], queryFn: () => requestsApi.get(id) });
  const update = useMutation({
    mutationFn: (body: Record<string, unknown>) => requestsApi.update(id, body),
    onSuccess: () => {
      toast.success("Request updated");
      qc.invalidateQueries({ queryKey: ["request", id] });
    },
    onError: err,
  });
  const comment = useMutation({
    mutationFn: (body: Record<string, unknown>) => requestsApi.comment(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["request", id] }),
  });

  if (query.isLoading) return <Skeleton className="h-64" />;
  if (!query.data) return <p className="text-sm text-red-700">Request not found.</p>;
  const r = query.data;

  return (
    <div>
      <PageHeader
        title={String(r.title)}
        subtitle={`${String(r.category)}${r.location ? ` · ${String(r.location)}` : ""}`}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to={`/${basePath}/requests`}>Back to requests</Link>
          </Button>
        }
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <Card>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <Badge status={String(r.status)} />
              <Badge status={String(r.priority)} />
            </div>
            <p className="text-sm leading-6 text-slate-600">{String(r.description)}</p>
            {basePath === "admin" ? (
              <div>
                <Label>Update status</Label>
                <Select
                  className="mt-1 max-w-xs"
                  value={String(r.status)}
                  onChange={(e) => update.mutate({ status: e.target.value })}
                >
                  {REQUEST_STATUSES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </Select>
              </div>
            ) : null}
            <form
              className="space-y-2 border-t border-slate-100 pt-4"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                comment.mutate({ message: f.get("message"), isInternal: f.get("internal") === "on" });
                e.currentTarget.reset();
              }}
            >
              <Label>Comment</Label>
              <Textarea name="message" placeholder="Add an update" required className="mt-1" />
              {basePath === "admin" ? (
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input type="checkbox" name="internal" /> Internal note
                </label>
              ) : null}
              <Button size="sm">Add comment</Button>
            </form>
            <div className="space-y-3">
              <p className="text-sm font-semibold text-slate-900">Activity</p>
              {((r.activities as Record<string, unknown>[]) ?? []).length === 0 ? (
                <p className="text-sm text-slate-500">No activity yet.</p>
              ) : (
                ((r.activities as Record<string, unknown>[]) ?? []).map((a, i) => (
                  <div key={i} className="border-l-2 border-slate-200 pl-3 text-sm">
                    <p className="font-medium text-slate-800">{String(a.message || a.action)}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {String(a.actorName)} · {formatDate(a.createdAt as string)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="text-slate-500">Resident</p>
              <p className="mt-0.5 font-medium">{(r.createdBy as { name?: string })?.name || "—"}</p>
            </div>
            <div>
              <p className="text-slate-500">Category</p>
              <p className="mt-0.5 font-medium capitalize">{String(r.category)}</p>
            </div>
            <div>
              <p className="text-slate-500">Location</p>
              <p className="mt-0.5 font-medium">{String(r.location || "—")}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function AnnouncementsPage({ admin }: { admin: boolean }) {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["announcements"], queryFn: () => announcementsApi.list({ limit: 50 }) });
  const [open, setOpen] = useState(false);
  const create = useMutation({
    mutationFn: announcementsApi.create,
    onSuccess: () => {
      toast.success("Announcement published.");
      qc.invalidateQueries({ queryKey: ["announcements"] });
      setOpen(false);
    },
    onError: err,
  });
  const read = useMutation({
    mutationFn: announcementsApi.markRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["announcements"] }),
  });
  const remove = useMutation({
    mutationFn: announcementsApi.remove,
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["announcements"] });
    },
  });

  return (
    <div>
      <PageHeader
        title="Announcements"
        subtitle="Society notices and alerts."
        actions={
          admin ? (
            <Button size="sm" onClick={() => setOpen(true)}>
              Create announcement
            </Button>
          ) : undefined
        }
      />
      {query.isLoading ? (
        <Skeleton className="h-64" />
      ) : !query.data?.items.length ? (
        <EmptyState title="No announcements available." />
      ) : (
        <div className="space-y-3">
          {query.data.items.map((a) => (
            <Card key={String(a.id)} className={a.pinned ? "border-teal-200" : ""}>
              <CardContent>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{String(a.title)}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {String(a.category)} · {formatDate(a.publishDate as string)}
                      {a.pinned ? " · Pinned" : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {a.important ? <Badge status="IMPORTANT" /> : null}
                    {!a.isRead ? <Badge status="PENDING">Unread</Badge> : <Badge status="PAID">Read</Badge>}
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">{String(a.content)}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {!a.isRead ? (
                    <Button size="sm" variant="outline" onClick={() => read.mutate(String(a.id))}>
                      Mark as read
                    </Button>
                  ) : null}
                  {admin ? (
                    <ConfirmDialog
                      title="Delete announcement?"
                      description="Residents will no longer see this notice."
                      trigger={
                        <Button size="sm" variant="outline">
                          Delete
                        </Button>
                      }
                      onConfirm={() => remove.mutate(String(a.id))}
                    />
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Modal title="New announcement" open={open} onClose={() => setOpen(false)}>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            create.mutate({
              title: f.get("title"),
              content: f.get("content"),
              category: f.get("category"),
              priority: f.get("priority"),
              expiryDate: f.get("expiryDate") || null,
              pinned: f.get("pinned") === "on",
              important: f.get("priority") !== "NORMAL",
            });
          }}
        >
          <div>
            <Label>Title</Label>
            <Input name="title" required className="mt-1" />
          </div>
          <div>
            <Label>Content</Label>
            <Textarea name="content" required className="mt-1" />
          </div>
          <div>
            <Label>Category</Label>
            <Select name="category" className="mt-1">
              {["general", "maintenance", "emergency", "event", "security", "water", "electricity", "meeting"].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Priority</Label>
            <Select name="priority" className="mt-1">
              <option>NORMAL</option>
              <option>IMPORTANT</option>
              <option>URGENT</option>
            </Select>
          </div>
          <div>
            <Label>Expiry</Label>
            <Input name="expiryDate" type="date" className="mt-1" />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" name="pinned" /> Pin announcement
          </label>
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
  const monthRows = ((maintenance.data as Record<string, number>[]) ?? []).map((row) => ({
    id: String(row.month),
    month: row.month,
    totalBilled: row.totalBilled,
    totalCollected: row.totalCollected,
    outstanding: row.outstanding,
    overdue: row.overdue,
  }));
  const residentRows = ((residents.data as Record<string, unknown>[]) ?? []).map((row, i) => ({
    id: String(row.resident ?? i),
    resident: String(row.resident ?? "—"),
    flat: String(row.flat ?? "—"),
    totalBilled: Number(row.totalBilled ?? 0),
    paid: Number(row.paid ?? 0),
    outstanding: Number(row.outstanding ?? 0),
  }));

  return (
    <div>
      <PageHeader title="Reports" subtitle="Figures are calculated from current society records." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Collected" value={formatINR(fin.totalCollected)} />
        <StatCard label="Outstanding" value={formatINR(fin.outstanding)} />
        <StatCard label="Expenses" value={formatINR(fin.totalExpenses)} />
        <StatCard label="Balance" value={formatINR(fin.currentBalance)} />
      </div>
      <div className="mt-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Maintenance collection ({year})</h2>
        {!monthRows.length ? (
          <EmptyState title="No billing data for this year." />
        ) : (
          <DataTable
            rows={monthRows}
            rowKey={(row) => row.id}
            columns={[
              { header: "Month", cell: (row) => monthName(row.month) },
              { header: "Billed", align: "right", cell: (row) => formatINR(row.totalBilled) },
              { header: "Collected", align: "right", cell: (row) => formatINR(row.totalCollected) },
              { header: "Outstanding", align: "right", cell: (row) => formatINR(row.outstanding) },
              { header: "Overdue", align: "right", cell: (row) => formatINR(row.overdue) },
            ]}
            mobile={(row) => (
              <div>
                <p className="font-medium text-slate-900">{monthName(row.month)}</p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  <span className="text-slate-500">Billed</span>
                  <span className="text-right tabular-nums">{formatINR(row.totalBilled)}</span>
                  <span className="text-slate-500">Collected</span>
                  <span className="text-right tabular-nums">{formatINR(row.totalCollected)}</span>
                  <span className="text-slate-500">Outstanding</span>
                  <span className="text-right tabular-nums">{formatINR(row.outstanding)}</span>
                </div>
              </div>
            )}
          />
        )}
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent expenses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {((expenses.data as Record<string, unknown>[]) ?? []).slice(0, 8).map((e) => (
              <div key={String(e.id)} className="flex items-start justify-between gap-3">
                <span className="min-w-0 truncate">{String(e.title)}</span>
                <span className="shrink-0 font-medium tabular-nums">{formatINR(e.amount as number)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Request volume</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {requests.data
              ? Object.entries(requests.data as Record<string, number>).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3">
                    <span className="capitalize text-slate-600">{k.replaceAll("_", " ").toLowerCase()}</span>
                    <span className="font-medium tabular-nums">{v}</span>
                  </div>
                ))
              : null}
          </CardContent>
        </Card>
      </div>
      <div className="mt-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Resident payment report</h2>
        {!residentRows.length ? (
          <EmptyState title="No resident billing records." />
        ) : (
          <DataTable
            rows={residentRows}
            rowKey={(row) => String(row.id)}
            columns={[
              { header: "Resident", cell: (r) => <span className="font-medium text-slate-900">{String(r.resident)}</span> },
              { header: "Flat", cell: (r) => String(r.flat) },
              { header: "Billed", align: "right", cell: (r) => formatINR(r.totalBilled as number) },
              { header: "Paid", align: "right", cell: (r) => formatINR(r.paid as number) },
              { header: "Outstanding", align: "right", cell: (r) => formatINR(r.outstanding as number) },
            ]}
            mobile={(r) => (
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">{String(r.resident)}</p>
                  <p className="mt-1 text-sm text-slate-500">{String(r.flat)}</p>
                </div>
                <p className="font-medium tabular-nums">{formatINR(r.outstanding as number)}</p>
              </div>
            )}
          />
        )}
      </div>
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
      <PageHeader title="Society settings" subtitle="Penalty rules, privacy and billing defaults." />
      <form
        className="grid max-w-4xl gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          update.mutate({
            name: f.get("name"),
            contactEmail: f.get("contactEmail"),
            contactPhone: f.get("contactPhone"),
            maintenanceDueDay: Number(f.get("maintenanceDueDay")),
            defaultMaintenance: Number(f.get("defaultMaintenance")),
            penaltyConfig: {
              type: f.get("penaltyType"),
              fixedPenalty: Number(f.get("fixedPenalty")),
              percentage: Number(f.get("percentage")),
              gracePeriodDays: Number(f.get("gracePeriodDays")),
              maxPenalty: Number(f.get("maxPenalty")),
              autoApply: true,
            },
            privacy: {
              showResidentPhone: f.get("showPhone") === "on",
              showResidentEmail: f.get("showEmail") === "on",
              showDirectoryToResidents: f.get("showDir") === "on",
            },
          });
        }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Resident invite code</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500">Share this code so residents can join your society. Data stays isolated from other societies.</p>
            <p className="mt-3 font-mono text-2xl font-semibold tracking-widest text-slate-900">{String(s.inviteCode || "—")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Society profile</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Name</Label>
              <Input name="name" defaultValue={String(s.name)} className="mt-1" />
            </div>
            <div>
              <Label>Contact email</Label>
              <Input name="contactEmail" defaultValue={String(s.contactEmail)} className="mt-1" />
            </div>
            <div>
              <Label>Contact phone</Label>
              <Input name="contactPhone" defaultValue={String(s.contactPhone)} className="mt-1" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Billing and penalties</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Due day</Label>
              <Input name="maintenanceDueDay" type="number" defaultValue={Number(s.maintenanceDueDay)} className="mt-1" />
            </div>
            <div>
              <Label>Default maintenance (₹)</Label>
              <Input name="defaultMaintenance" type="number" defaultValue={Number(s.defaultMaintenance)} className="mt-1" />
            </div>
            <div>
              <Label>Penalty type</Label>
              <Select name="penaltyType" defaultValue={String(penalty.type || "FIXED")} className="mt-1">
                <option>FIXED</option>
                <option>PERCENTAGE</option>
                <option>PER_DAY</option>
              </Select>
            </div>
            <div>
              <Label>Fixed penalty (₹)</Label>
              <Input name="fixedPenalty" type="number" defaultValue={Number(penalty.fixedPenalty || 100)} className="mt-1" />
            </div>
            <div>
              <Label>Percentage</Label>
              <Input name="percentage" type="number" defaultValue={Number(penalty.percentage || 2)} className="mt-1" />
            </div>
            <div>
              <Label>Grace days</Label>
              <Input name="gracePeriodDays" type="number" defaultValue={Number(penalty.gracePeriodDays || 10)} className="mt-1" />
            </div>
            <div>
              <Label>Max penalty (₹)</Label>
              <Input name="maxPenalty" type="number" defaultValue={Number(penalty.maxPenalty || 500)} className="mt-1" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Directory privacy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <label className="flex items-center gap-2">
              <input type="checkbox" name="showPhone" defaultChecked /> Show phone in directory
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="showEmail" /> Show email in directory
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="showDir" defaultChecked /> Allow resident directory
            </label>
          </CardContent>
        </Card>
        <Button className="w-full sm:w-auto">Save settings</Button>
      </form>
    </div>
  );
}

export function DocumentsPage({ admin }: { admin: boolean }) {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["docs"], queryFn: documentsApi.list });
  const [open, setOpen] = useState(false);
  const create = useMutation({
    mutationFn: documentsApi.create,
    onSuccess: () => {
      toast.success("Document added");
      qc.invalidateQueries({ queryKey: ["docs"] });
      setOpen(false);
    },
    onError: err,
  });
  const rows = query.data ?? [];

  return (
    <div>
      <PageHeader
        title="Society documents"
        subtitle="Notices, circulars and file references."
        actions={
          admin ? (
            <Button size="sm" onClick={() => setOpen(true)}>
              Add document
            </Button>
          ) : undefined
        }
      />
      {query.isLoading ? (
        <Skeleton className="h-40" />
      ) : !rows.length ? (
        <EmptyState title="No documents yet." />
      ) : (
        <DataTable
          rows={rows}
          rowKey={(d) => String(d.id)}
          columns={[
            { header: "Title", cell: (d) => <span className="font-medium text-slate-900">{String(d.title)}</span> },
            { header: "Category", cell: (d) => String(d.category) },
            { header: "Storage", cell: (d) => String(d.storageProvider) },
            {
              header: "",
              cell: (d) =>
                d.url ? (
                  <a className="text-sm font-medium text-teal-800 hover:underline" href={String(d.url)} target="_blank" rel="noreferrer">
                    Open
                  </a>
                ) : (
                  <span className="text-xs text-slate-400">No file URL</span>
                ),
            },
          ]}
          mobile={(d) => (
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-slate-900">{String(d.title)}</p>
                <p className="mt-1 text-sm text-slate-500">{String(d.category)}</p>
              </div>
              {d.url ? (
                <a className="text-sm font-medium text-teal-800" href={String(d.url)} target="_blank" rel="noreferrer">
                  Open
                </a>
              ) : null}
            </div>
          )}
        />
      )}
      <Modal title="Add document reference" open={open} onClose={() => setOpen(false)}>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            create.mutate({
              title: f.get("title"),
              category: f.get("category"),
              url: f.get("url"),
              description: f.get("description"),
            });
          }}
        >
          <div>
            <Label>Title</Label>
            <Input name="title" required className="mt-1" />
          </div>
          <div>
            <Label>Category</Label>
            <Select name="category" className="mt-1">
              {["meeting_notice", "agm", "rules", "invoice", "maintenance", "circular", "financial_report", "other"].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>External URL</Label>
            <Input name="url" className="mt-1" placeholder="https://" />
          </div>
          <Button className="w-full">Save</Button>
        </form>
      </Modal>
    </div>
  );
}

export function AuditPage() {
  const query = useQuery({ queryKey: ["audit"], queryFn: () => auditApi.list({ limit: 40 }) });
  const rows = query.data?.items ?? [];
  return (
    <div>
      <PageHeader title="Audit activity" subtitle="Important administrator actions." />
      {query.isLoading ? (
        <Skeleton className="h-64" />
      ) : !rows.length ? (
        <EmptyState title="No audit events yet." />
      ) : (
        <DataTable
          rows={rows}
          rowKey={(a) => String(a.id)}
          columns={[
            { header: "Action", cell: (a) => <span className="font-medium text-slate-900">{String(a.action)}</span> },
            { header: "User", cell: (a) => (a.userId as { name?: string })?.name },
            { header: "Entity", cell: (a) => String(a.entity) },
            { header: "When", cell: (a) => formatDate(a.timestamp as string) },
          ]}
          mobile={(a) => (
            <div>
              <p className="font-medium text-slate-900">{String(a.action)}</p>
              <p className="mt-1 text-sm text-slate-500">
                {(a.userId as { name?: string })?.name} · {String(a.entity)} · {formatDate(a.timestamp as string)}
              </p>
            </div>
          )}
        />
      )}
    </div>
  );
}
