export type Role = "ADMIN" | "RESIDENT" | "COMMITTEE" | "SECRETARY" | "CHAIRMAN" | "ACCOUNTANT" | "SECURITY" | "MAINTENANCE_STAFF";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  status: string;
  societyId: string | { id: string; name: string; city?: string; currency?: string };
  flatId?: { id: string; flatNumber: string; floor?: number } | string | null;
  occupancyRole?: string | null;
  avatar?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

export interface Paginated<T> {
  items: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export type BillStatus = "PENDING" | "PARTIALLY_PAID" | "PAID" | "OVERDUE" | "CANCELLED";
