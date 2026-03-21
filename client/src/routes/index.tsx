import { Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";
import { useAuthStore } from "@features/auth/authStore";
import FullScreenLoader from "@components/common/FullScreenLoader";

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

export default function AppRouter() {
  const token = useAuthStore((state) => state.token);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const defaultAuthenticatedRoute = "/dashboard";

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
          element={token ? <DashboardPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/member-management"
          element={token ? <MemberManagementPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/centers"
          element={token ? <CentersPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/collections"
          element={token ? <CollectionsPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/portfolio"
          element={token ? <PortfolioPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/transactions"
          element={token ? <TransactionHistoryPage /> : <Navigate to="/login" />}
        />
      </Routes>
    </Suspense>
  );
}
