import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { billsApi, downloadExport, expensesApi, paymentsApi } from "@/api/resources";
import { PageHeader } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Modal } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty";
import { Input, Label, Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable, Toolbar } from "@/components/ui/table";
import { formatINR } from "@/lib/money";
import { formatDate, monthName } from "@/lib/utils";
import { ApiError } from "@/api/client";

function onErr(e: Error) {
  toast.error(e instanceof ApiError ? e.message : e.message);
}

export function BillsPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("");
  const query = useQuery({
    queryKey: ["bills", status],
    queryFn: () => billsApi.list({ status: status || undefined, limit: 50 }),
  });
  const [open, setOpen] = useState(false);
  const [payBill, setPayBill] = useState<Record<string, unknown> | null>(null);
  const generate = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      billsApi.generate(body) as Promise<{ created: unknown[]; skipped: unknown[] }>,
    onSuccess: (data: { created: unknown[]; skipped: unknown[] }) => {
      toast.success(`${data.created.length} bill(s) generated`);
      qc.invalidateQueries({ queryKey: ["bills"] });
      setOpen(false);
    },
    onError: onErr,
  });
  const pay = useMutation({
    mutationFn: (body: { id: string; payload: Record<string, unknown> }) => billsApi.pay(body.id, body.payload),
    onSuccess: () => {
      toast.success("Payment recorded successfully.");
      qc.invalidateQueries({ queryKey: ["bills"] });
      setPayBill(null);
    },
    onError: onErr,
  });
  const rows = query.data?.items ?? [];

  return (
    <div>
      <PageHeader
        title="Maintenance bills"
        subtitle="Generate monthly bills and track collections."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => downloadExport("bills")}>
              Export CSV
            </Button>
            <Button size="sm" onClick={() => setOpen(true)}>
              Generate bills
            </Button>
          </>
        }
      />
      <Toolbar>
        <Select className="sm:max-w-xs" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {["PENDING", "PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </Select>
      </Toolbar>
      {query.isLoading ? (
        <Skeleton className="h-64" />
      ) : !rows.length ? (
        <EmptyState title="No maintenance bills." action={{ label: "Generate bills", onClick: () => setOpen(true) }} />
      ) : (
        <DataTable
          rows={rows}
          rowKey={(row) => String(row.id)}
          columns={[
            { header: "Bill", cell: (b) => <span className="font-medium text-slate-900">{String(b.billNumber)}</span> },
            { header: "Flat", cell: (b) => (b.flatId as { flatNumber?: string })?.flatNumber },
            { header: "Period", cell: (b) => `${monthName(b.billingMonth as number)} ${String(b.billingYear)}` },
            { header: "Total", align: "right", cell: (b) => formatINR(b.totalAmount as number) },
            { header: "Paid", align: "right", cell: (b) => formatINR(b.paidAmount as number) },
            { header: "Due", cell: (b) => formatDate(b.dueDate as string) },
            { header: "Status", cell: (b) => <Badge status={String(b.status)} /> },
            {
              header: "",
              cell: (b) =>
                b.status !== "PAID" && b.status !== "CANCELLED" ? (
                  <Button size="sm" variant="outline" onClick={() => setPayBill(b)}>
                    Record payment
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
                    {(b.flatId as { flatNumber?: string })?.flatNumber} · {monthName(b.billingMonth as number)} {String(b.billingYear)}
                  </p>
                </div>
                <Badge status={String(b.status)} />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Due {formatDate(b.dueDate as string)}</span>
                <span className="font-medium tabular-nums">{formatINR(b.totalAmount as number)}</span>
              </div>
              {b.status !== "PAID" && b.status !== "CANCELLED" ? (
                <Button size="sm" className="w-full" onClick={() => setPayBill(b)}>
                  Record payment
                </Button>
              ) : null}
            </div>
          )}
        />
      )}
      <Modal title="Generate monthly bills" open={open} onClose={() => setOpen(false)}>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            generate.mutate({
              billingMonth: Number(f.get("month")),
              billingYear: Number(f.get("year")),
              dueDate: f.get("dueDate"),
              baseAmount: Number(f.get("baseAmount")),
              additionalChargeItems: f.get("sinking")
                ? [{ label: "Sinking fund", amount: Number(f.get("sinking")) }]
                : [],
              notes: f.get("notes"),
            });
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Month</Label>
              <Input name="month" type="number" min={1} max={12} defaultValue={new Date().getMonth() + 1} className="mt-1" />
            </div>
            <div>
              <Label>Year</Label>
              <Input name="year" type="number" defaultValue={new Date().getFullYear()} className="mt-1" />
            </div>
          </div>
          <div>
            <Label>Base amount (₹)</Label>
            <Input name="baseAmount" type="number" defaultValue={3500} className="mt-1" />
          </div>
          <div>
            <Label>Sinking fund (₹)</Label>
            <Input name="sinking" type="number" defaultValue={0} className="mt-1" />
          </div>
          <div>
            <Label>Due date</Label>
            <Input name="dueDate" type="date" required className="mt-1" />
          </div>
          <div>
            <Label>Notes</Label>
            <Input name="notes" className="mt-1" />
          </div>
          <Button className="w-full" disabled={generate.isPending}>
            Generate
          </Button>
        </form>
      </Modal>
      <Modal title="Record payment" open={Boolean(payBill)} onClose={() => setPayBill(null)}>
        {payBill ? (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              pay.mutate({
                id: String(payBill.id),
                payload: {
                  amount: Number(f.get("amount")),
                  paymentMethod: f.get("paymentMethod"),
                  transactionId: f.get("transactionId"),
                  notes: f.get("notes"),
                },
              });
            }}
          >
            <p className="text-sm text-slate-500">
              Remaining {formatINR((payBill.totalAmount as number) - (payBill.paidAmount as number))}
            </p>
            <div>
              <Label>Amount</Label>
              <Input
                name="amount"
                type="number"
                min={1}
                required
                className="mt-1"
                defaultValue={(payBill.totalAmount as number) - (payBill.paidAmount as number)}
              />
            </div>
            <div>
              <Label>Method</Label>
              <Select name="paymentMethod" className="mt-1">
                {["UPI", "CASH", "BANK_TRANSFER", "CHEQUE", "ONLINE"].map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Transaction ID</Label>
              <Input name="transactionId" className="mt-1" />
            </div>
            <Button className="w-full">Save payment</Button>
          </form>
        ) : null}
      </Modal>
    </div>
  );
}

export function PaymentsPage() {
  const query = useQuery({ queryKey: ["payments"], queryFn: () => paymentsApi.list({ limit: 50 }) });
  const rows = query.data?.items ?? [];
  return (
    <div>
      <PageHeader
        title="Payments"
        subtitle="Successful collections across the society."
        actions={
          <Button variant="outline" size="sm" onClick={() => downloadExport("payments")}>
            Export CSV
          </Button>
        }
      />
      {query.isLoading ? (
        <Skeleton className="h-64" />
      ) : !rows.length ? (
        <EmptyState title="No payments recorded yet." />
      ) : (
        <DataTable
          rows={rows}
          rowKey={(row) => String(row.id)}
          columns={[
            { header: "Date", cell: (p) => formatDate(p.paymentDate as string) },
            { header: "Resident", cell: (p) => (p.residentId as { name?: string })?.name },
            { header: "Flat", cell: (p) => (p.flatId as { flatNumber?: string })?.flatNumber },
            { header: "Amount", align: "right", cell: (p) => formatINR(p.amount as number) },
            { header: "Method", cell: (p) => String(p.paymentMethod) },
            { header: "Status", cell: (p) => <Badge status={String(p.status)} /> },
          ]}
          mobile={(p) => (
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-slate-900">{(p.residentId as { name?: string })?.name}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {formatDate(p.paymentDate as string)} · {String(p.paymentMethod)}
                </p>
              </div>
              <p className="font-medium tabular-nums">{formatINR(p.amount as number)}</p>
            </div>
          )}
        />
      )}
    </div>
  );
}

const EXPENSE_CATS = [
  "electricity",
  "water",
  "security",
  "housekeeping",
  "repairs",
  "lift",
  "gardening",
  "plumbing",
  "painting",
  "insurance",
  "staff",
  "administrative",
  "other",
];

export function ExpensesPage() {
  const qc = useQueryClient();
  const [category, setCategory] = useState("");
  const query = useQuery({
    queryKey: ["expenses", category],
    queryFn: () => expensesApi.list({ category: category || undefined, limit: 50 }),
  });
  const [open, setOpen] = useState(false);
  const create = useMutation({
    mutationFn: expensesApi.create,
    onSuccess: () => {
      toast.success("Expense recorded");
      qc.invalidateQueries({ queryKey: ["expenses"] });
      setOpen(false);
    },
    onError: onErr,
  });
  const remove = useMutation({
    mutationFn: expensesApi.remove,
    onSuccess: () => {
      toast.success("Expense deleted");
      qc.invalidateQueries({ queryKey: ["expenses"] });
    },
  });
  const rows = query.data?.items ?? [];
  return (
    <div>
      <PageHeader
        title="Expenses"
        subtitle="Vendor spends against the society account."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => downloadExport("expenses")}>
              Export CSV
            </Button>
            <Button size="sm" onClick={() => setOpen(true)}>
              Add expense
            </Button>
          </>
        }
      />
      <Toolbar>
        <Select className="sm:max-w-xs" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {EXPENSE_CATS.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </Select>
      </Toolbar>
      {query.isLoading ? (
        <Skeleton className="h-64" />
      ) : !rows.length ? (
        <EmptyState title="No expenses found for this period." action={{ label: "Add expense", onClick: () => setOpen(true) }} />
      ) : (
        <DataTable
          rows={rows}
          rowKey={(row) => String(row.id)}
          columns={[
            { header: "Title", cell: (e) => <span className="font-medium text-slate-900">{String(e.title)}</span> },
            { header: "Category", cell: (e) => String(e.category) },
            { header: "Vendor", cell: (e) => String(e.vendor || "—") },
            { header: "Date", cell: (e) => formatDate(e.expenseDate as string) },
            { header: "Amount", align: "right", cell: (e) => formatINR(e.amount as number) },
            {
              header: "",
              cell: (e) => (
                <ConfirmDialog
                  title="Delete expense?"
                  description="This removes the expense record from reports."
                  trigger={
                    <Button variant="outline" size="sm">
                      Delete
                    </Button>
                  }
                  onConfirm={() => remove.mutate(String(e.id))}
                  confirmLabel="Delete"
                />
              ),
            },
          ]}
          mobile={(e) => (
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-slate-900">{String(e.title)}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {String(e.category)} · {formatDate(e.expenseDate as string)}
                </p>
              </div>
              <div className="text-right">
                <p className="font-medium tabular-nums">{formatINR(e.amount as number)}</p>
                <div className="mt-2">
                  <ConfirmDialog
                    title="Delete expense?"
                    description="This removes the expense record from reports."
                    trigger={
                      <Button variant="outline" size="sm">
                        Delete
                      </Button>
                    }
                    onConfirm={() => remove.mutate(String(e.id))}
                    confirmLabel="Delete"
                  />
                </div>
              </div>
            </div>
          )}
        />
      )}
      <Modal title="Add expense" open={open} onClose={() => setOpen(false)}>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            create.mutate({
              title: f.get("title"),
              category: f.get("category"),
              amount: Number(f.get("amount")),
              vendor: f.get("vendor"),
              invoiceNumber: f.get("invoiceNumber"),
              expenseDate: f.get("expenseDate"),
              description: f.get("description"),
              paymentMethod: f.get("paymentMethod"),
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
              {EXPENSE_CATS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Amount (₹)</Label>
            <Input name="amount" type="number" min={1} required className="mt-1" />
          </div>
          <div>
            <Label>Vendor</Label>
            <Input name="vendor" className="mt-1" />
          </div>
          <div>
            <Label>Invoice #</Label>
            <Input name="invoiceNumber" className="mt-1" />
          </div>
          <div>
            <Label>Date</Label>
            <Input name="expenseDate" type="date" required className="mt-1" />
          </div>
          <div>
            <Label>Payment method</Label>
            <Select name="paymentMethod" className="mt-1">
              {["BANK_TRANSFER", "UPI", "CHEQUE", "CASH"].map((m) => (
                <option key={m}>{m}</option>
              ))}
            </Select>
          </div>
          <Button className="w-full">Save expense</Button>
        </form>
      </Modal>
    </div>
  );
}
