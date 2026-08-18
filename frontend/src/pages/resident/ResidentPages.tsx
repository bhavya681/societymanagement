import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import { billsApi, dashboardApi, paymentsApi, residentsApi, requestsApi } from "@/api/resources";
import { PageHeader } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { formatINR } from "@/lib/money";
import { formatDate, monthName } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/api/client";

export function ResidentDashboardPage() {
  const { data, isLoading } = useQuery({ queryKey: ["resident-dashboard"], queryFn: dashboardApi.resident });
  if (isLoading) return <div className="grid gap-4 md:grid-cols-2">{Array.from({length:4}).map((_,i)=><Skeleton key={i} className="h-28" />)}</div>;
  if (!data) return <p>Unable to load dashboard.</p>;
  return (
    <div>
      <PageHeader title="Your home at a glance" subtitle="What you owe, what you paid, and what’s happening in the society" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Current due", formatINR(data.currentDue as number), "PENDING"],
          ["Overdue", formatINR(data.overdueAmount as number), (data.overdueAmount as number) > 0 ? "OVERDUE" : "PAID"],
          ["Paid this year", formatINR(data.totalPaidThisYear as number), "PAID"],
          ["Unread notices", String(data.unreadAnnouncementCount ?? 0), "IMPORTANT"],
        ].map(([l, v, s]) => (
          <Card key={String(l)}><CardContent className="p-5">
            <p className="text-sm text-slate-500">{l}</p>
            <p className="mt-2 text-2xl font-bold">{v}</p>
            <div className="mt-2"><Badge status={String(s)} /></div>
          </CardContent></Card>
        ))}
      </div>
      <p className="mt-2 text-sm text-slate-500">Next due date: {formatDate(data.nextDueDate as string)}</p>
      <div className="mt-6 flex flex-wrap gap-2">
        <Button asChild><Link to="/resident/bills">Pay maintenance</Link></Button>
        <Button variant="outline" asChild><Link to="/resident/requests">Submit request</Link></Button>
        <Button variant="outline" asChild><Link to="/resident/announcements">View announcements</Link></Button>
        <Button variant="outline" asChild><Link to="/resident/profile">View profile</Link></Button>
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Unpaid bills</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {((data.unpaidBills as Record<string, unknown>[]) ?? []).length === 0 ? <p className="text-sm text-slate-500">No pending maintenance bills.</p> : (data.unpaidBills as Record<string, unknown>[]).map((b) => (
              <div key={String(b.id)} className="flex justify-between text-sm">
                <span>{monthName(b.billingMonth as number)} {String(b.billingYear)}</span>
                <Badge status={String(b.status)} />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Recent payments</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {((data.recentPayments as Record<string, unknown>[]) ?? []).map((p) => (
              <div key={String(p.id)} className="flex justify-between"><span>{formatDate(p.paymentDate as string)}</span><span>{formatINR(p.amount as number)}</span></div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Announcements</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {((data.announcements as Record<string, unknown>[]) ?? []).map((a) => (
              <p key={String(a.id)} className="font-medium">{String(a.title)}</p>
            ))}
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
    onSuccess: () => { toast.success("Payment recorded successfully."); qc.invalidateQueries({ queryKey: ["my-bills"] }); setBill(null); },
    onError: (e: Error) => toast.error(e instanceof ApiError ? e.message : e.message),
  });
  return (
    <div>
      <PageHeader title="My bills" subtitle="Pending dues, overdue amounts and payment status" />
      {query.isLoading ? <Skeleton className="h-64" /> : !query.data?.items.length ? <EmptyState title="No pending maintenance bills." /> : (
        <div className="grid gap-3">
          {query.data.items.map((b) => (
            <Card key={String(b.id)}>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold">{String(b.billNumber)}</p>
                  <p className="text-sm text-slate-500">{monthName(b.billingMonth as number)} {String(b.billingYear)} · Due {formatDate(b.dueDate as string)}</p>
                  <p className="mt-1 font-bold">{formatINR(b.totalAmount as number)} · paid {formatINR(b.paidAmount as number)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge status={String(b.status)} />
                  {b.status !== "PAID" && b.status !== "CANCELLED" ? <Button size="sm" onClick={() => setBill(b)}>Pay</Button> : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Modal title="Record a payment" open={Boolean(bill)} onClose={() => setBill(null)}>
        {bill ? (
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); pay.mutate({ id: String(bill.id), payload: { amount: Number(f.get("amount")), paymentMethod: f.get("paymentMethod"), transactionId: f.get("transactionId") } }); }}>
            <p className="text-sm text-slate-500">Remaining {formatINR((bill.totalAmount as number) - (bill.paidAmount as number))}</p>
            <div><Label>Amount</Label><Input name="amount" type="number" required defaultValue={(bill.totalAmount as number) - (bill.paidAmount as number)} className="mt-1" /></div>
            <div><Label>Method</Label><Select name="paymentMethod" className="mt-1">{["UPI","BANK_TRANSFER","CASH","CHEQUE","ONLINE"].map((m)=><option key={m}>{m}</option>)}</Select></div>
            <div><Label>UPI / transaction reference</Label><Input name="transactionId" className="mt-1" /></div>
            <Button className="w-full">Submit payment</Button>
          </form>
        ) : null}
      </Modal>
    </div>
  );
}

export function ResidentPaymentsPage() {
  const query = useQuery({ queryKey: ["my-payments"], queryFn: () => paymentsApi.list({ limit: 50 }) });
  return (
    <div>
      <PageHeader title="Payment history" />
      {query.isLoading ? <Skeleton className="h-40" /> : !query.data?.items.length ? <EmptyState title="No payments yet." /> : (
        <div className="space-y-2">
          {query.data.items.map((p) => (
            <Card key={String(p.id)}><CardContent className="flex justify-between p-4 text-sm">
              <span>{formatDate(p.paymentDate as string)} · {String(p.paymentMethod)}</span>
              <span className="font-semibold">{formatINR(p.amount as number)}</span>
            </CardContent></Card>
          ))}
        </div>
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
    onSuccess: () => { toast.success("Maintenance request submitted."); qc.invalidateQueries({ queryKey: ["my-requests"] }); setOpen(false); },
    onError: (e: Error) => toast.error(e instanceof ApiError ? e.message : e.message),
  });
  return (
    <div>
      <PageHeader title="Maintenance requests" actions={<Button onClick={() => setOpen(true)}>Submit request</Button>} />
      {query.isLoading ? <Skeleton className="h-40" /> : !query.data?.items.length ? <EmptyState title="No maintenance requests yet." action={{ label: "Submit request", onClick: () => setOpen(true) }} /> : (
        <div className="space-y-3">
          {query.data.items.map((r) => (
            <Link key={String(r.id)} to={`/resident/requests/${r.id}`}>
              <Card><CardContent className="flex items-center justify-between p-4">
                <div><p className="font-semibold">{String(r.title)}</p><p className="text-sm text-slate-500">{String(r.category)}</p></div>
                <Badge status={String(r.status)} />
              </CardContent></Card>
            </Link>
          ))}
        </div>
      )}
      <Modal title="New maintenance request" open={open} onClose={() => setOpen(false)}>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); create.mutate({ title: f.get("title"), category: f.get("category"), description: f.get("description"), priority: f.get("priority"), location: f.get("location") }); }}>
          <div><Label>Title</Label><Input name="title" required className="mt-1" /></div>
          <div><Label>Category</Label><Select name="category" className="mt-1">{["plumbing","electrical","lift","water","security","cleaning","parking","structural","internet","other"].map((c)=><option key={c}>{c}</option>)}</Select></div>
          <div><Label>Priority</Label><Select name="priority" className="mt-1">{["LOW","MEDIUM","HIGH","URGENT"].map((c)=><option key={c}>{c}</option>)}</Select></div>
          <div><Label>Location</Label><Input name="location" className="mt-1" /></div>
          <div><Label>Description</Label><Textarea name="description" required className="mt-1" /></div>
          <Button className="w-full">Submit</Button>
        </form>
      </Modal>
    </div>
  );
}

export function DirectoryPage() {
  const query = useQuery({ queryKey: ["directory"], queryFn: () => residentsApi.list({ limit: 50 }) });
  return (
    <div>
      <PageHeader title="Resident directory" subtitle="Contact details follow society privacy settings" />
      {query.isLoading ? <Skeleton className="h-40" /> : (
        <div className="grid gap-3 md:grid-cols-2">
          {query.data?.items.map((r) => (
            <Card key={String(r.id)}><CardContent className="p-4">
              <p className="font-semibold">{String(r.name)}</p>
              <p className="text-sm text-slate-500">{(r.flatId as { flatNumber?: string } | null)?.flatNumber} {r.phone ? `· ${String(r.phone)}` : ""}</p>
            </CardContent></Card>
          ))}
        </div>
      )}
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
      <PageHeader title="My profile" />
      <Card>
        <CardContent className="p-6">
          <form className="grid gap-4 md:grid-cols-2" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); update.mutate({ name: f.get("name"), phone: f.get("phone"), emergencyContactName: f.get("emergencyContactName"), emergencyContactPhone: f.get("emergencyContactPhone") }); }}>
            <div><Label>Name</Label><Input name="name" defaultValue={user.name} className="mt-1" /></div>
            <div><Label>Email</Label><Input defaultValue={user.email} disabled className="mt-1" /></div>
            <div><Label>Phone</Label><Input name="phone" defaultValue={user.phone} className="mt-1" /></div>
            <div><Label>Emergency contact</Label><Input name="emergencyContactName" defaultValue={user.emergencyContactName} className="mt-1" /></div>
            <div><Label>Emergency phone</Label><Input name="emergencyContactPhone" defaultValue={user.emergencyContactPhone} className="mt-1" /></div>
            <Button className="md:col-span-2">Save profile</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
