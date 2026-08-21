import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import { billsApi, dashboardApi, paymentsApi, residentsApi, requestsApi } from "@/api/resources";
import { PageHeader } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, StatCard } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/table";
import { formatINR } from "@/lib/money";
import { formatDate, monthName } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/api/client";

export function ResidentDashboardPage() {
  const { data, isLoading } = useQuery({ queryKey: ["resident-dashboard"], queryFn: dashboardApi.resident });
  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }
  if (!data) return <p className="text-sm text-red-700">Unable to load dashboard.</p>;
  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="What you owe, when it is due, and recent society activity."
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Current due" value={formatINR(data.currentDue as number)} hint={`Next due ${formatDate(data.nextDueDate as string)}`} />
        <StatCard label="Overdue" value={formatINR(data.overdueAmount as number)} />
        <StatCard label="Paid this year" value={formatINR(data.totalPaidThisYear as number)} />
        <StatCard label="Unread notices" value={String(data.unreadAnnouncementCount ?? 0)} />
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <Button asChild size="sm">
          <Link to="/resident/bills">Pay maintenance</Link>
        </Button>
        <Button variant="outline" asChild size="sm">
          <Link to="/resident/requests">Submit request</Link>
        </Button>
        <Button variant="outline" asChild size="sm">
          <Link to="/resident/announcements">Announcements</Link>
        </Button>
        <Button variant="outline" asChild size="sm">
          <Link to="/resident/ledger">Payment ledger</Link>
        </Button>
        <Button variant="outline" asChild size="sm">
          <Link to="/resident/profile">Profile</Link>
        </Button>
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Unpaid bills</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {((data.unpaidBills as Record<string, unknown>[]) ?? []).length === 0 ? (
              <p className="text-sm text-slate-500">No pending maintenance bills.</p>
            ) : (
              (data.unpaidBills as Record<string, unknown>[]).map((b) => (
                <div key={String(b.id)} className="flex items-center justify-between gap-3 text-sm">
                  <span>
                    {monthName(b.billingMonth as number)} {String(b.billingYear)}
                  </span>
                  <Badge status={String(b.status)} />
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent payments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {((data.recentPayments as Record<string, unknown>[]) ?? []).length === 0 ? (
              <p className="text-slate-500">No payments recorded yet.</p>
            ) : (
              ((data.recentPayments as Record<string, unknown>[]) ?? []).map((p) => (
                <div key={String(p.id)} className="flex justify-between gap-3">
                  <span className="text-slate-500">{formatDate(p.paymentDate as string)}</span>
                  <span className="font-medium tabular-nums">{formatINR(p.amount as number)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Announcements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {((data.announcements as Record<string, unknown>[]) ?? []).length === 0 ? (
              <p className="text-slate-500">No recent notices.</p>
            ) : (
              ((data.announcements as Record<string, unknown>[]) ?? []).map((a) => (
                <p key={String(a.id)} className="truncate font-medium">
                  {String(a.title)}
                </p>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function ResidentBillsPage() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["my-bills"], queryFn: () => billsApi.list({ limit: 50 }) });
  const [bill, setBill] = useState<Record<string, unknown> | null>(null);
  const pay = useMutation({
    mutationFn: (p: { id: string; payload: Record<string, unknown> }) => billsApi.pay(p.id, p.payload),
    onSuccess: () => {
      toast.success("Payment recorded successfully.");
      qc.invalidateQueries({ queryKey: ["my-bills"] });
      setBill(null);
    },
    onError: (e: Error) => toast.error(e instanceof ApiError ? e.message : e.message),
  });
  const rows = query.data?.items ?? [];
  return (
    <div>
      <PageHeader title="My bills" subtitle="Pending dues, overdue amounts and payment status." />
      {query.isLoading ? (
        <Skeleton className="h-64" />
      ) : !rows.length ? (
        <EmptyState title="No pending maintenance bills." />
      ) : (
        <DataTable
          rows={rows}
          rowKey={(b) => String(b.id)}
          columns={[
            { header: "Bill", cell: (b) => <span className="font-medium text-slate-900">{String(b.billNumber)}</span> },
            { header: "Period", cell: (b) => `${monthName(b.billingMonth as number)} ${String(b.billingYear)}` },
            { header: "Due", cell: (b) => formatDate(b.dueDate as string) },
            { header: "Total", align: "right", cell: (b) => formatINR(b.totalAmount as number) },
            { header: "Paid", align: "right", cell: (b) => formatINR(b.paidAmount as number) },
            { header: "Status", cell: (b) => <Badge status={String(b.status)} /> },
            {
              header: "",
              cell: (b) =>
                b.status !== "PAID" && b.status !== "CANCELLED" ? (
                  <Button size="sm" onClick={() => setBill(b)}>
                    Pay
                  </Button>
                ) : null,
            },
          ]}
          mobile={(b) => (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">{String(b.billNumber)}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {monthName(b.billingMonth as number)} {String(b.billingYear)} · Due {formatDate(b.dueDate as string)}
                  </p>
                </div>
                <Badge status={String(b.status)} />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Paid {formatINR(b.paidAmount as number)}</span>
                <span className="font-medium tabular-nums">{formatINR(b.totalAmount as number)}</span>
              </div>
              {b.status !== "PAID" && b.status !== "CANCELLED" ? (
                <Button size="sm" className="w-full" onClick={() => setBill(b)}>
                  Pay
                </Button>
              ) : null}
            </div>
          )}
        />
      )}
      <Modal title="Record a payment" open={Boolean(bill)} onClose={() => setBill(null)}>
        {bill ? (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              pay.mutate({
                id: String(bill.id),
                payload: {
                  amount: Number(f.get("amount")),
                  paymentMethod: f.get("paymentMethod"),
                  transactionId: f.get("transactionId"),
                },
              });
            }}
          >
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
              <p className="font-medium text-slate-900">{String(bill.billNumber)}</p>
              <p className="mt-1 text-xs text-slate-500">
                {monthName(bill.billingMonth as number)} {String(bill.billingYear)}
              </p>
              <div className="mt-3 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Total due</span>
                  <span className="font-medium tabular-nums">{formatINR(bill.totalAmount as number)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Paid so far</span>
                  <span className="font-medium tabular-nums">{formatINR(bill.paidAmount as number)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1">
                  <span className="text-slate-700">Remaining</span>
                  <span className="font-semibold tabular-nums">{formatINR((bill.totalAmount as number) - (bill.paidAmount as number))}</span>
                </div>
              </div>
            </div>
            <div>
              <Label>Amount (₹)</Label>
              <Input
                name="amount"
                type="number"
                required
                className="mt-1"
                defaultValue={(bill.totalAmount as number) - (bill.paidAmount as number)}
              />
            </div>
            <div>
              <Label>Method</Label>
              <Select name="paymentMethod" className="mt-1">
                {["UPI", "BANK_TRANSFER", "CASH", "CHEQUE", "ONLINE"].map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>UPI / transaction reference</Label>
              <Input name="transactionId" className="mt-1" />
            </div>
            <Button className="w-full" disabled={pay.isPending}>
              {pay.isPending ? "Submitting..." : "Submit payment"}
            </Button>
          </form>
        ) : null}
      </Modal>
    </div>
  );
}

export function ResidentPaymentsPage() {
  const query = useQuery({ queryKey: ["my-payments"], queryFn: () => paymentsApi.list({ limit: 50 }) });
  const rows = query.data?.items ?? [];
  return (
    <div>
      <PageHeader title="Payment history" subtitle="Confirmed collections against your bills." />
      {query.isLoading ? (
        <Skeleton className="h-40" />
      ) : !rows.length ? (
        <EmptyState title="No payments yet." />
      ) : (
        <DataTable
          rows={rows}
          rowKey={(p) => String(p.id)}
          columns={[
            { header: "Date", cell: (p) => formatDate(p.paymentDate as string) },
            { header: "Bill", cell: (p) => (p.billId as { billNumber?: string; billingMonth?: number; billingYear?: number })?.billNumber },
            { header: "Method", cell: (p) => String(p.paymentMethod) },
            { header: "Reference", cell: (p) => String(p.transactionId || "—") },
            { header: "Amount", align: "right", cell: (p) => formatINR(p.amount as number) },
            { header: "Status", cell: (p) => <Badge status={String(p.status)} /> },
          ]}
          mobile={(p) => (
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-slate-900">{formatDate(p.paymentDate as string)}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {(p.billId as { billNumber?: string })?.billNumber} · {String(p.paymentMethod)}
                </p>
                {p.transactionId ? (
                  <p className="mt-0.5 text-xs text-slate-400">Ref: {String(p.transactionId)}</p>
                ) : null}
              </div>
              <p className="font-medium tabular-nums">{formatINR(p.amount as number)}</p>
            </div>
          )}
        />
      )}
    </div>
  );
}

export function ResidentRequestsPage() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["my-requests"], queryFn: () => requestsApi.list({ limit: 50 }) });
  const [open, setOpen] = useState(false);
  const create = useMutation({
    mutationFn: requestsApi.create,
    onSuccess: () => {
      toast.success("Maintenance request submitted.");
      qc.invalidateQueries({ queryKey: ["my-requests"] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e instanceof ApiError ? e.message : e.message),
  });
  const rows = query.data?.items ?? [];
  return (
    <div>
      <PageHeader
        title="Maintenance requests"
        subtitle="Report issues and follow their status."
        actions={
          <Button size="sm" onClick={() => setOpen(true)}>
            Submit request
          </Button>
        }
      />
      {query.isLoading ? (
        <Skeleton className="h-40" />
      ) : !rows.length ? (
        <EmptyState title="No maintenance requests yet." action={{ label: "Submit request", onClick: () => setOpen(true) }} />
      ) : (
        <DataTable
          rows={rows}
          rowKey={(r) => String(r.id)}
          columns={[
            { header: "Request", cell: (r) => <span className="font-medium text-slate-900">{String(r.title)}</span> },
            { header: "Category", cell: (r) => String(r.category) },
            { header: "Status", cell: (r) => <Badge status={String(r.status)} /> },
            {
              header: "",
              cell: (r) => (
                <Button asChild size="sm" variant="outline">
                  <Link to={`/resident/requests/${r.id}`}>Open</Link>
                </Button>
              ),
            },
          ]}
          mobile={(r) => (
            <Link to={`/resident/requests/${r.id}`} className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-slate-900">{String(r.title)}</p>
                <p className="mt-1 text-sm text-slate-500">{String(r.category)}</p>
              </div>
              <Badge status={String(r.status)} />
            </Link>
          )}
        />
      )}
      <Modal title="New maintenance request" open={open} onClose={() => setOpen(false)}>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            create.mutate({
              title: f.get("title"),
              category: f.get("category"),
              description: f.get("description"),
              priority: f.get("priority"),
              location: f.get("location"),
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
              {["plumbing", "electrical", "lift", "water", "security", "cleaning", "parking", "structural", "internet", "other"].map(
                (c) => (
                  <option key={c}>{c}</option>
                ),
              )}
            </Select>
          </div>
          <div>
            <Label>Priority</Label>
            <Select name="priority" className="mt-1">
              {["LOW", "MEDIUM", "HIGH", "URGENT"].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Location</Label>
            <Input name="location" className="mt-1" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea name="description" required className="mt-1" />
          </div>
          <Button className="w-full">Submit</Button>
        </form>
      </Modal>
    </div>
  );
}

export function DirectoryPage() {
  const query = useQuery({ queryKey: ["directory"], queryFn: () => residentsApi.list({ limit: 50 }) });
  const rows = query.data?.items ?? [];
  return (
    <div>
      <PageHeader title="Resident directory" subtitle="Contact details follow society privacy settings." />
      {query.isLoading ? (
        <Skeleton className="h-40" />
      ) : !rows.length ? (
        <EmptyState title="Directory is empty." />
      ) : (
        <DataTable
          rows={rows}
          rowKey={(r) => String(r.id)}
          columns={[
            { header: "Name", cell: (r) => <span className="font-medium text-slate-900">{String(r.name)}</span> },
            { header: "Flat", cell: (r) => (r.flatId as { flatNumber?: string } | null)?.flatNumber ?? "—" },
            { header: "Phone", cell: (r) => (r.phone ? String(r.phone) : "—") },
          ]}
          mobile={(r) => (
            <div>
              <p className="font-medium text-slate-900">{String(r.name)}</p>
              <p className="mt-1 text-sm text-slate-500">
                {(r.flatId as { flatNumber?: string } | null)?.flatNumber ?? "Unassigned"}
                {r.phone ? ` · ${String(r.phone)}` : ""}
              </p>
            </div>
          )}
        />
      )}
    </div>
  );
}

export function LedgerPage() {
  const { data, isLoading } = useQuery({ queryKey: ["ledger"], queryFn: dashboardApi.monthlyLedger });
  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }
  if (!data) return <p className="text-sm text-red-700">Unable to load ledger.</p>;
  const summary = data.summary as Record<string, number>;
  const rows = (data.rows as Record<string, unknown>[]) ?? [];
  return (
    <div>
      <PageHeader title="Payment ledger" subtitle="Month-wise maintenance charges, penalties and payments." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total charged" value={formatINR(summary.totalCharged)} />
        <StatCard label="Total paid" value={formatINR(summary.totalPaid)} />
        <StatCard label="Penalties" value={formatINR(summary.totalPenalty)} />
        <StatCard label="Outstanding" value={formatINR(summary.outstanding)} />
      </div>
      <div className="mt-5">
        {rows.length === 0 ? (
          <EmptyState title="No billing records yet." />
        ) : (
          <DataTable
            rows={rows}
            rowKey={(r) => String(r.id)}
            columns={[
              { header: "Month", cell: (r) => `${monthName(r.billingMonth as number)} ${String(r.billingYear)}` },
              { header: "Flat", cell: (r) => String(r.flatNumber ?? "—") },
              { header: "Maintenance", align: "right", cell: (r) => formatINR(r.baseAmount as number) },
              { header: "Penalty", align: "right", cell: (r) => formatINR(r.penalty as number) },
              { header: "Total due", align: "right", cell: (r) => formatINR(r.totalAmount as number) },
              { header: "Paid", align: "right", cell: (r) => formatINR(r.paidAmount as number) },
              { header: "Remaining", align: "right", cell: (r) => formatINR(r.remaining as number) },
              { header: "Status", cell: (r) => <Badge status={String(r.status)} /> },
            ]}
            mobile={(r) => (
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{monthName(r.billingMonth as number)} {String(r.billingYear)}</p>
                    <p className="text-xs text-slate-500">Flat {String(r.flatNumber ?? "—")}</p>
                  </div>
                  <Badge status={String(r.status)} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-slate-500">Maintenance</span><p className="tabular-nums">{formatINR(r.baseAmount as number)}</p></div>
                  <div><span className="text-slate-500">Penalty</span><p className="tabular-nums">{formatINR(r.penalty as number)}</p></div>
                  <div><span className="text-slate-500">Total due</span><p className="font-medium tabular-nums">{formatINR(r.totalAmount as number)}</p></div>
                  <div><span className="text-slate-500">Paid</span><p className="font-medium tabular-nums">{formatINR(r.paidAmount as number)}</p></div>
                  <div><span className="text-slate-500">Remaining</span><p className="font-medium tabular-nums text-red-700">{formatINR(r.remaining as number)}</p></div>
                </div>
              </div>
            )}
          />
        )}
      </div>
    </div>
  );
}

export function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const update = useMutation({
    mutationFn: (body: Record<string, unknown>) => residentsApi.update(user!.id, body),
    onSuccess: async () => { toast.success("Profile updated"); await refreshUser(); },
  });
  if (!user) return null;
  return (
    <div>
      <PageHeader title="My profile" subtitle="Contact details used by the society office." />
      <Card className="max-w-3xl">
        <CardContent>
          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              update.mutate({
                name: f.get("name"),
                phone: f.get("phone"),
                emergencyContactName: f.get("emergencyContactName"),
                emergencyContactPhone: f.get("emergencyContactPhone"),
              });
            }}
          >
            <div>
              <Label>Name</Label>
              <Input name="name" defaultValue={user.name} className="mt-1" />
            </div>
            <div>
              <Label>Email</Label>
              <Input defaultValue={user.email} disabled className="mt-1" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input name="phone" defaultValue={user.phone} className="mt-1" />
            </div>
            <div>
              <Label>Emergency contact</Label>
              <Input name="emergencyContactName" defaultValue={user.emergencyContactName} className="mt-1" />
            </div>
            <div className="sm:col-span-2">
              <Label>Emergency phone</Label>
              <Input name="emergencyContactPhone" defaultValue={user.emergencyContactPhone} className="mt-1" />
            </div>
            <Button className="sm:col-span-2 sm:w-auto">Save profile</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
