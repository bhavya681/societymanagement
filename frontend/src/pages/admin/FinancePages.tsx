import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { billsApi, downloadExport, expensesApi, paymentsApi, residentsApi } from "@/api/resources";
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
            className="space-y-4"
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
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
              <p className="font-medium text-slate-900">{String(payBill.billNumber)}</p>
              <p className="mt-1 text-xs text-slate-500">
                {(payBill.flatId as { flatNumber?: string })?.flatNumber} · {monthName(payBill.billingMonth as number)} {String(payBill.billingYear)}
              </p>
              <div className="mt-3 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Maintenance</span>
                  <span className="font-medium tabular-nums">{formatINR(payBill.totalAmount as number)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Paid so far</span>
                  <span className="font-medium tabular-nums">{formatINR(payBill.paidAmount as number)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1">
                  <span className="text-slate-700">Remaining</span>
                  <span className="font-semibold tabular-nums">{formatINR((payBill.totalAmount as number) - (payBill.paidAmount as number))}</span>
                </div>
              </div>
            </div>
            <div>
              <Label>Amount received (₹)</Label>
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
              <Label>Reference / transaction ID</Label>
              <Input name="transactionId" className="mt-1" />
            </div>
            <div>
              <Label>Notes</Label>
              <Input name="notes" className="mt-1" />
            </div>
            <Button className="w-full" disabled={pay.isPending}>
              {pay.isPending ? "Saving..." : "Confirm payment"}
            </Button>
          </form>
        ) : null}
      </Modal>
    </div>
  );
}

export function PaymentsPage() {
  const qc = useQueryClient();
  const [method, setMethod] = useState("");
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"resident" | "bill" | "details">("resident");
  const [selectedResident, setSelectedResident] = useState<Record<string, unknown> | null>(null);
  const [selectedBill, setSelectedBill] = useState<Record<string, unknown> | null>(null);
  const [residentSearch, setResidentSearch] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [transactionId, setTransactionId] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));

  const residents = useQuery({
    queryKey: ["residents-search", residentSearch],
    queryFn: () => residentsApi.list({ search: residentSearch, limit: 10 }),
    enabled: step === "resident" && residentSearch.length >= 2,
  });

  const outstanding = useQuery({
    queryKey: ["outstanding-bills", selectedResident?.id],
    queryFn: () =>
      billsApi.outstanding({
        residentId: selectedResident?.id as string | undefined,
        status: "PENDING,PARTIALLY_PAID,OVERDUE",
      }),
    enabled: step === "bill" && Boolean(selectedResident?.id),
  });

  const record = useMutation({
    mutationFn: (p: { id: string; payload: Record<string, unknown> }) => billsApi.pay(p.id, p.payload),
    onSuccess: () => {
      toast.success("Payment recorded successfully.");
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["bills"] });
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
      setOpen(false);
      resetForm();
    },
    onError: onErr,
  });

  function resetForm() {
    setStep("resident");
    setSelectedResident(null);
    setSelectedBill(null);
    setResidentSearch("");
    setAmount("");
    setPaymentMethod("UPI");
    setTransactionId("");
    setNotes("");
    setPaymentDate(new Date().toISOString().slice(0, 10));
  }

  const paymentQuery = useQuery({
    queryKey: ["payments", method, status],
    queryFn: () =>
      paymentsApi.list({
        method: method || undefined,
        status: status || undefined,
        limit: 50,
      }),
  });
  const rows = paymentQuery.data?.items ?? [];

  const remainingAfter = selectedBill
    ? Math.max(0, (selectedBill.totalAmount as number) - (selectedBill.paidAmount as number) - Number(amount || 0))
    : 0;

  return (
    <div>
      <PageHeader
        title="Payments"
        subtitle="Successful collections across the society."
        actions={
          <Button size="sm" onClick={() => { resetForm(); setOpen(true); }}>
            Record payment
          </Button>
        }
      />
      <Toolbar>
        <Select className="sm:max-w-xs" value={method} onChange={(e) => setMethod(e.target.value)}>
          <option value="">All methods</option>
          {["CASH", "BANK_TRANSFER", "UPI", "CHEQUE", "ONLINE"].map((m) => (
            <option key={m}>{m}</option>
          ))}
        </Select>
        <Select className="sm:max-w-xs" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {["SUCCESS", "PENDING", "FAILED", "REFUNDED"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </Select>
      </Toolbar>
      {paymentQuery.isLoading ? (
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
            { header: "Reference", cell: (p) => String(p.transactionId || "—") },
            { header: "Status", cell: (p) => <Badge status={String(p.status)} /> },
          ]}
          mobile={(p) => (
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-slate-900">{(p.residentId as { name?: string })?.name}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {formatDate(p.paymentDate as string)} · {String(p.paymentMethod)}
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

      <Modal title="Record payment" open={open} onClose={() => { setOpen(false); resetForm(); }}>
        <div className="space-y-5">
          {step === "resident" && (
            <div className="space-y-3">
              <p className="text-sm text-slate-500">Search for a resident to record a payment against their outstanding bills.</p>
              <div>
                <Label>Search resident</Label>
                <Input
                  className="mt-1"
                  placeholder="Name, email or phone"
                  value={residentSearch}
                  onChange={(e) => setResidentSearch(e.target.value)}
                />
              </div>
              {residents.isLoading ? (
                <Skeleton className="h-32" />
              ) : (
                <div className="max-h-64 space-y-2 overflow-y-auto">
                  {(residents.data?.items ?? []).map((r: Record<string, unknown>) => (
                    <button
                      key={String(r.id)}
                      type="button"
                      className="flex w-full items-center justify-between rounded-md border border-slate-200 p-3 text-left hover:bg-slate-50"
                      onClick={() => { setSelectedResident(r); setStep("bill"); }}
                    >
                      <div>
                        <p className="font-medium text-slate-900">{String(r.name)}</p>
                        <p className="text-xs text-slate-500">
                          {(r.flatId as { flatNumber?: string } | null)?.flatNumber ?? "Unassigned"} · {String(r.email)}
                        </p>
                      </div>
                      {r.outstanding ? (
                        <span className="text-sm font-medium tabular-nums text-red-700">{formatINR(r.outstanding as number)}</span>
                      ) : null}
                    </button>
                  ))}
                  {residentSearch.length >= 2 && !(residents.data?.items ?? []).length ? (
                    <p className="text-sm text-slate-500">No residents found.</p>
                  ) : null}
                </div>
              )}
            </div>
          )}

          {step === "bill" && selectedResident && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-900">{String(selectedResident.name)}</p>
                <Button variant="outline" size="sm" onClick={() => { setStep("resident"); setSelectedResident(null); }}>
                  Change
                </Button>
              </div>
              {outstanding.isLoading ? (
                <Skeleton className="h-32" />
              ) : (
                <div className="max-h-64 space-y-2 overflow-y-auto">
                  {(outstanding.data ?? []).length === 0 ? (
                    <p className="text-sm text-slate-500">No outstanding bills for this resident.</p>
                  ) : (
                    (outstanding.data ?? []).map((b) => (
                      <button
                        key={String(b.id)}
                        type="button"
                        className="flex w-full items-center justify-between rounded-md border border-slate-200 p-3 text-left hover:bg-slate-50"
                        onClick={() => { setSelectedBill(b); setStep("details"); }}
                      >
                        <div>
                          <p className="font-medium text-slate-900">{String(b.billNumber)}</p>
                          <p className="text-xs text-slate-500">
                            {(b.flatId as { flatNumber?: string })?.flatNumber} · {monthName(b.billingMonth as number)} {String(b.billingYear)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium tabular-nums">{formatINR(b.totalAmount as number)}</p>
                          <p className="text-xs text-slate-500">Remaining {formatINR((b.totalAmount as number) - (b.paidAmount as number))}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {step === "details" && selectedBill && (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                record.mutate({
                  id: String(selectedBill.id),
                  payload: {
                    amount: Number(amount),
                    paymentMethod,
                    transactionId,
                    notes,
                    paymentDate: new Date(paymentDate),
                  },
                });
              }}
            >
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
                <p className="font-medium text-slate-900">{String(selectedBill.billNumber)}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {(selectedBill.flatId as { flatNumber?: string })?.flatNumber} · {monthName(selectedBill.billingMonth as number)} {String(selectedBill.billingYear)}
                </p>
                <div className="mt-3 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Maintenance</span>
                    <span className="font-medium tabular-nums">{formatINR(selectedBill.totalAmount as number)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Paid so far</span>
                    <span className="font-medium tabular-nums">{formatINR(selectedBill.paidAmount as number)}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-1">
                    <span className="text-slate-700">Remaining</span>
                    <span className="font-semibold tabular-nums">{formatINR((selectedBill.totalAmount as number) - (selectedBill.paidAmount as number))}</span>
                  </div>
                </div>
              </div>
              <div>
                <Label>Payment date</Label>
                <Input name="paymentDate" type="date" required className="mt-1" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
              </div>
              <div>
                <Label>Amount received (₹)</Label>
                <Input
                  name="amount"
                  type="number"
                  min={1}
                  required
                  className="mt-1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div>
                <Label>Method</Label>
                <Select name="paymentMethod" className="mt-1" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                  {["UPI", "CASH", "BANK_TRANSFER", "CHEQUE", "ONLINE"].map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Reference / transaction ID</Label>
                <Input name="transactionId" className="mt-1" value={transactionId} onChange={(e) => setTransactionId(e.target.value)} />
              </div>
              <div>
                <Label>Notes</Label>
                <Input name="notes" className="mt-1" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
              {Number(amount) > 0 && remainingAfter > 0 ? (
                <p className="text-sm text-amber-700">
                  Remaining after this payment: {formatINR(remainingAfter)}
                </p>
              ) : null}
              {remainingAfter === 0 && Number(amount) > 0 ? (
                <p className="text-sm text-emerald-700">This payment will clear the bill.</p>
              ) : null}
              <Button className="w-full" disabled={record.isPending}>
                {record.isPending ? "Saving..." : "Confirm payment"}
              </Button>
            </form>
          )}
        </div>
      </Modal>
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
