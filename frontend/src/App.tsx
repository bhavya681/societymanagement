import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppShell } from "@/components/layout/AppShell";
import { isAdminRole, useAuth } from "@/context/AuthContext";
import { LoginPage, RegisterPage } from "@/pages/AuthPages";
import { AdminDashboardPage } from "@/pages/admin/DashboardPage";
import { BuildingsPage, FlatsPage, ResidentsPage } from "@/pages/admin/PeoplePages";
import { BillsPage, ExpensesPage, PaymentsPage } from "@/pages/admin/FinancePages";
import { AnnouncementsPage, AuditPage, DocumentsPage, ReportsPage, RequestDetailPage, RequestsPage, SettingsPage } from "@/pages/admin/OpsPages";
import {
  DirectoryPage,
  ProfilePage,
  ResidentBillsPage,
  ResidentDashboardPage,
  ResidentPaymentsPage,
  ResidentRequestsPage,
} from "@/pages/resident/ResidentPages";

function HomeRedirect() {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return <div className="min-h-screen bg-[#f4f6f8]" />;
  }
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={isAdminRole(user.role) ? "/admin/dashboard" : "/resident/dashboard"} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/" element={<HomeRedirect />} />

      <Route element={<ProtectedRoute role="ADMIN" />}>
        <Route element={<AppShell />}>
          <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
          <Route path="/admin/residents" element={<ResidentsPage />} />
          <Route path="/admin/buildings" element={<BuildingsPage />} />
          <Route path="/admin/flats" element={<FlatsPage />} />
          <Route path="/admin/bills" element={<BillsPage />} />
          <Route path="/admin/payments" element={<PaymentsPage />} />
          <Route path="/admin/expenses" element={<ExpensesPage />} />
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
