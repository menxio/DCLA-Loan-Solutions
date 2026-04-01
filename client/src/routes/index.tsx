import { Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";
import { useAuthStore } from "@features/auth/authStore";
import FullScreenLoader from "@components/common/FullScreenLoader";
import ForbiddenPage from "@components/common/ForbiddenPage";

const LoginPage = lazy(() => import("@features/auth/pages/LoginPage"));
const DashboardPage = lazy(() => import("@features/dashboard/pages/DashboardPage"));
const MemberManagementPage = lazy(
  () => import("@features/member/MemberManagementPage")
);
const CentersPage = lazy(() => import("@features/centers/pages/CentersPage"));
const CollectionsPage = lazy(
  () => import("@features/collections/pages/CollectionsPage")
);
const PortfolioPage = lazy(
  () => import("@features/portfolio/pages/PortfolioPage")
);
const TransactionHistoryPage = lazy(
  () => import("@features/transactions/pages/TransactionHistoryPage")
);
const UserManagementPage = lazy(
  () => import("@features/users/pages/UserManagementPage")
);
const RepaymentApprovalsPage = lazy(
  () => import("@features/repayments/pages/RepaymentApprovalsPage")
);

export default function AppRouter() {
  const token = useAuthStore((state) => state.token);
  const role = useAuthStore((state) => state.user?.role);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const isAdmin = role === "admin";
  const isManager = role === "manager";
  const defaultAuthenticatedRoute = isAdmin ? "/admin/users" : "/dashboard";

  if (!isInitialized) {
    return <FullScreenLoader />;
  }

  return (
    <Suspense fallback={<FullScreenLoader />}>
      <Routes>
        <Route
          path="/"
          element={<Navigate to={token ? defaultAuthenticatedRoute : "/login"} />}
        />
        <Route
          path="/login"
          element={
            token ? <Navigate to={defaultAuthenticatedRoute} replace /> : <LoginPage />
          }
        />
        <Route
          path="/dashboard"
          element={
            token ? (isAdmin ? <ForbiddenPage /> : <DashboardPage />) : <Navigate to="/login" />
          }
        />
        <Route
          path="/member-management"
          element={
            token ? (isAdmin ? <ForbiddenPage /> : <MemberManagementPage />) : <Navigate to="/login" />
          }
        />
        <Route
          path="/centers"
          element={token ? (isAdmin ? <ForbiddenPage /> : <CentersPage />) : <Navigate to="/login" />}
        />
        <Route
          path="/collections"
          element={
            token ? (isAdmin ? <ForbiddenPage /> : <CollectionsPage />) : <Navigate to="/login" />
          }
        />
        <Route
          path="/portfolio"
          element={
            token ? (isAdmin ? <ForbiddenPage /> : <PortfolioPage />) : <Navigate to="/login" />
          }
        />
        <Route
          path="/transactions"
          element={
            token ? (isAdmin ? <ForbiddenPage /> : <TransactionHistoryPage />) : <Navigate to="/login" />
          }
        />
        <Route
          path="/admin/users"
          element={
            token ? (isAdmin ? <UserManagementPage /> : <ForbiddenPage />) : <Navigate to="/login" />
          }
        />
        <Route
          path="/approvals"
          element={
            token
              ? isAdmin
                ? <ForbiddenPage />
                : isManager
                  ? <RepaymentApprovalsPage />
                  : <ForbiddenPage />
              : <Navigate to="/login" />
          }
        />
      </Routes>
    </Suspense>
  );
}
