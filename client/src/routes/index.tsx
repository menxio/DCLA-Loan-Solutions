import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "@features/auth/pages/LoginPage";
import DashboardPage from "@features/dashboard/pages/DashboardPage";
import MemberManagementPage from "@features/member/MemberManagementPage";
import { useAuthStore } from "@features/auth/authStore";

export default function AppRouter() {
  const token = useAuthStore((state) => state.token);

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/dashboard"
        element={token ? <DashboardPage /> : <Navigate to="/login" />}
      />
      <Route
        path="/member-management"
        element={token ? <MemberManagementPage /> : <Navigate to="/login" />}
      />
    </Routes>
  );
}
