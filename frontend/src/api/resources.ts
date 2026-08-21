import { api, qs } from "./client";
import type { Paginated } from "../types";

export const residentsApi = {
  list: (params: Record<string, string | number | undefined> = {}) =>
    api<Paginated<Record<string, unknown>>>(`/residents${qs(params)}`),
  get: (id: string) => api<Record<string, unknown>>(`/residents/${id}`),
  create: (body: Record<string, unknown>) =>
    api(`/residents`, { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, body: Record<string, unknown>) =>
    api(`/residents/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  status: (id: string, status: string) =>
    api(`/residents/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  resetPassword: (id: string, password: string) =>
    api(`/residents/${id}/reset-password`, { method: "POST", body: JSON.stringify({ password }) }),
  history: (id: string) => api(`/residents/${id}/history`),
  ledger: (id: string) => api<{ resident: Record<string, unknown>; summary: Record<string, number>; bills: Record<string, unknown>[]; payments: Record<string, unknown>[] }>(`/residents/${id}/ledger`),
};

export const buildingsApi = {
  list: () => api<Record<string, unknown>[]>("/buildings"),
  create: (body: Record<string, unknown>) => api("/buildings", { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, body: Record<string, unknown>) =>
    api(`/buildings/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  remove: (id: string) => api(`/buildings/${id}`, { method: "DELETE" }),
};

export const flatsApi = {
  list: (params: Record<string, string | number | undefined> = {}) =>
    api<Paginated<Record<string, unknown>>>(`/flats${qs(params)}`),
  get: (id: string) => api(`/flats/${id}`),
  create: (body: Record<string, unknown>) => api("/flats", { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, body: Record<string, unknown>) =>
    api(`/flats/${id}`, { method: "PUT", body: JSON.stringify(body) }),
};

export const billsApi = {
  list: (params: Record<string, string | number | undefined> = {}) =>
    api<Paginated<Record<string, unknown>>>(`/bills${qs(params)}`),
  get: (id: string) => api<Record<string, unknown>>(`/bills/${id}`),
  generate: (body: Record<string, unknown>) =>
    api("/bills/generate", { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, body: Record<string, unknown>) =>
    api(`/bills/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  pay: (id: string, body: Record<string, unknown>) =>
    api(`/bills/${id}/payment`, { method: "POST", body: JSON.stringify(body) }),
  outstanding: (params: Record<string, string | number | undefined> = {}) =>
    api<Record<string, unknown>[]>(`/bills/outstanding${qs(params)}`),
};

export const paymentsApi = {
  list: (params: Record<string, string | number | undefined> = {}) =>
    api<Paginated<Record<string, unknown>>>(`/payments${qs(params)}`),
  create: (body: Record<string, unknown>) => api("/payments", { method: "POST", body: JSON.stringify(body) }),
};

export const expensesApi = {
  list: (params: Record<string, string | number | undefined> = {}) =>
    api<Paginated<Record<string, unknown>>>(`/expenses${qs(params)}`),
  create: (body: Record<string, unknown>) => api("/expenses", { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, body: Record<string, unknown>) =>
    api(`/expenses/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  remove: (id: string) => api(`/expenses/${id}`, { method: "DELETE" }),
};

export const requestsApi = {
  list: (params: Record<string, string | number | undefined> = {}) =>
    api<Paginated<Record<string, unknown>>>(`/requests${qs(params)}`),
  get: (id: string) => api<Record<string, unknown>>(`/requests/${id}`),
  create: (body: Record<string, unknown>) => api("/requests", { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, body: Record<string, unknown>) =>
    api(`/requests/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  comment: (id: string, body: Record<string, unknown>) =>
    api(`/requests/${id}/comments`, { method: "POST", body: JSON.stringify(body) }),
  assign: (id: string, assignedTo: string) =>
    api(`/requests/${id}/assign`, { method: "POST", body: JSON.stringify({ assignedTo }) }),
};

export const announcementsApi = {
  list: (params: Record<string, string | number | undefined> = {}) =>
    api<Paginated<Record<string, unknown>>>(`/announcements${qs(params)}`),
  create: (body: Record<string, unknown>) =>
    api("/announcements", { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, body: Record<string, unknown>) =>
    api(`/announcements/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  remove: (id: string) => api(`/announcements/${id}`, { method: "DELETE" }),
  markRead: (id: string) => api(`/announcements/${id}/read`, { method: "POST" }),
};

export const reportsApi = {
  financial: (params: Record<string, string | undefined> = {}) => api(`/reports/financial${qs(params)}`),
  maintenance: (year?: number) => api(`/reports/maintenance${qs({ year })}`),
  expenses: (params: Record<string, string | undefined> = {}) => api(`/reports/expenses${qs(params)}`),
  requests: (params: Record<string, string | undefined> = {}) => api(`/reports/requests${qs(params)}`),
  residents: () => api(`/reports/residents`),
  cashFlow: (params: Record<string, string | undefined> = {}) => api(`/reports/cash-flow${qs(params)}`),
  aging: () => api(`/reports/aging`),
};

export const vendorsApi = {
  list: (params: Record<string, string | number | undefined> = {}) =>
    api<Paginated<Record<string, unknown>>>(`/vendors${qs(params)}`),
  create: (body: Record<string, unknown>) =>
    api(`/vendors`, { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, body: Record<string, unknown>) =>
    api(`/vendors/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  remove: (id: string) => api(`/vendors/${id}`, { method: "DELETE" }),
};

export const recurringExpensesApi = {
  list: (params: Record<string, string | number | undefined> = {}) =>
    api<Paginated<Record<string, unknown>>>(`/recurring-expenses${qs(params)}`),
  create: (body: Record<string, unknown>) =>
    api(`/recurring-expenses`, { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, body: Record<string, unknown>) =>
    api(`/recurring-expenses/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  remove: (id: string) => api(`/recurring-expenses/${id}`, { method: "DELETE" }),
};

export const incomeApi = {
  list: (params: Record<string, string | number | undefined> = {}) =>
    api<Paginated<Record<string, unknown>>>(`/income${qs(params)}`),
  create: (body: Record<string, unknown>) =>
    api(`/income`, { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, body: Record<string, unknown>) =>
    api(`/income/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  remove: (id: string) => api(`/income/${id}`, { method: "DELETE" }),
};

export const monthClosingApi = {
  list: () => api<Record<string, unknown>[]>("/month-closing"),
  status: (params: Record<string, string | number | undefined> = {}) =>
    api<Record<string, unknown>>(`/month-closing/status${qs(params)}`),
  close: (body: Record<string, unknown>) =>
    api(`/month-closing/close`, { method: "POST", body: JSON.stringify(body) }),
  reopen: (body: Record<string, unknown>) =>
    api(`/month-closing/reopen`, { method: "POST", body: JSON.stringify(body) }),
};

export const dashboardApi = {
  admin: () => api<Record<string, unknown>>("/dashboard/admin"),
  resident: () => api<Record<string, unknown>>("/dashboard/resident"),
  monthlyLedger: () => api<{ summary: Record<string, number>; rows: Record<string, unknown>[] }>("/residents/me/monthly-ledger"),
};

export const societyApi = {
  get: () => api<Record<string, unknown>>("/society"),
  update: (body: Record<string, unknown>) => api("/society", { method: "PUT", body: JSON.stringify(body) }),
};

export const documentsApi = {
  list: () => api<Record<string, unknown>[]>("/documents"),
  create: (body: Record<string, unknown>) => api("/documents", { method: "POST", body: JSON.stringify(body) }),
  remove: (id: string) => api(`/documents/${id}`, { method: "DELETE" }),
};

export const auditApi = {
  list: (params: Record<string, string | number | undefined> = {}) =>
    api<Paginated<Record<string, unknown>>>(`/audit${qs(params)}`),
};

export async function downloadExport(type: string) {
  const blob = await api<Blob>(`/exports/${type}`);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${type}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
