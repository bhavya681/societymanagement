import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppShell } from "@/components/layout/AppShell";
import { isAdminRole, useAuth } from "@/context/AuthContext";
import { CreateSocietyPage, LoginPage, RegisterPage } from "@/pages/AuthPages";
import { AdminDashboardPage } from "@/pages/admin/DashboardPage";
import { BuildingsPage, FlatsPage, ResidentsPage } from "@/pages/admin/PeoplePages";
import { BillsPage, ExpensesPage, PaymentsPage } from "@/pages/admin/FinancePages";
import { AnnouncementsPage, AuditPage, DocumentsPage, ReportsPage, RequestDetailPage, RequestsPage, SettingsPage } from "@/pages/admin/OpsPages";
import { VendorsPage } from "@/pages/admin/VendorsPage";
import { RecurringExpensesPage } from "@/pages/admin/RecurringExpensesPage";
import { IncomePage } from "@/pages/admin/IncomePage";
import { MonthClosingPage } from "@/pages/admin/MonthClosingPage";
import { CashFlowPage } from "@/pages/admin/CashFlowPage";
import { AgingPage } from "@/pages/admin/AgingPage";
import {
  DirectoryPage,
  LedgerPage,
  ProfilePage,
  ResidentBillsPage,
  ResidentDashboardPage,
  ResidentPaymentsPage,
  ResidentRequestsPage,
} from "@/pages/resident/ResidentPages";

function HomeRedirect() {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f6f8]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-700 border-t-transparent" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={isAdminRole(user.role) ? "/admin/dashboard" : "/resident/dashboard"} replace />;
}

function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f6f8] p-4">
      <div className="text-center">
        <p className="text-6xl font-bold text-slate-300">404</p>
        <p className="mt-2 text-lg font-semibold text-slate-900">Page not found</p>
        <p className="mt-1 text-sm text-slate-500">The page you are looking for does not exist.</p>
        <a className="mt-4 inline-flex items-center justify-center rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800" href="/">
          Go to dashboard
        </a>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/register-society" element={<CreateSocietyPage />} />
      <Route path="*" element={<NotFound />} />

      <Route element={<ProtectedRoute role="ADMIN" />}>
        <Route element={<AppShell />}>
          <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
          <Route path="/admin/residents" element={<ResidentsPage />} />
          <Route path="/admin/buildings" element={<BuildingsPage />} />
          <Route path="/admin/flats" element={<FlatsPage />} />
          <Route path="/admin/bills" element={<BillsPage />} />
          <Route path="/admin/payments" element={<PaymentsPage />} />
          <Route path="/admin/expenses" element={<ExpensesPage />} />
          <Route path="/admin/vendors" element={<VendorsPage />} />
          <Route path="/admin/recurring-expenses" element={<RecurringExpensesPage />} />
          <Route path="/admin/income" element={<IncomePage />} />
          <Route path="/admin/month-closing" element={<MonthClosingPage />} />
          <Route path="/admin/cash-flow" element={<CashFlowPage />} />
          <Route path="/admin/aging" element={<AgingPage />} />
          <Route path="/admin/requests" element={<RequestsPage />} />
          <Route path="/admin/requests/:id" element={<RequestDetailPage basePath="admin" />} />
          <Route path="/admin/announcements" element={<AnnouncementsPage admin />} />
          <Route path="/admin/documents" element={<DocumentsPage admin />} />
          <Route path="/admin/reports" element={<ReportsPage />} />
          <Route path="/admin/settings" element={<SettingsPage />} />
          <Route path="/admin/audit" element={<AuditPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute role="RESIDENT" />}>
        <Route element={<AppShell />}>
          <Route path="/resident/dashboard" element={<ResidentDashboardPage />} />
          <Route path="/resident/bills" element={<ResidentBillsPage />} />
          <Route path="/resident/payments" element={<ResidentPaymentsPage />} />
          <Route path="/resident/ledger" element={<LedgerPage />} />
          <Route path="/resident/requests" element={<ResidentRequestsPage />} />
          <Route path="/resident/requests/:id" element={<RequestDetailPage basePath="resident" />} />
          <Route path="/resident/announcements" element={<AnnouncementsPage admin={false} />} />
          <Route path="/resident/directory" element={<DirectoryPage />} />
          <Route path="/resident/documents" element={<DocumentsPage admin={false} />} />
          <Route path="/resident/profile" element={<ProfilePage />} />
        </Route>
      </Route>
    </Routes>
  );
}
