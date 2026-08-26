import {
  Assessment,
  AttachMoney,
  CheckCircle,
  Groups,
  LocalAtm,
  PendingActions,
  People,
  Refresh,
  TrendingDown,
  TrendingUp,
  WarningAmber,
} from "@mui/icons-material";
import type { ReactNode } from "react";
import { Alert, Box, Button, Chip, Paper, Stack, Typography } from "@mui/material";
import PageLoadingSkeleton from "@components/common/PageLoadingSkeleton";
import PrivateLayout from "@components/layout/PrivateLayout";
import { useAuthStore } from "@features/auth/authStore";
import { useNavigate } from "react-router-dom";
import CenterExposureTable from "../components/CenterExposureTable";
import CollectionPulsePanel from "../components/CollectionPulsePanel";
import ManagerActionsPanel from "../components/ManagerActionsPanel";
import MetricCard from "../components/MetricCard";
import { useDashboardData } from "../hooks/useDashboardData";
import { formatCurrency, formatPercent } from "../utils/format";

interface MetricCardConfig {
  title: string;
  value: string;
  subtitle: string;
  icon: ReactNode;
  accent: string;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { stats, loading, error, refetch } = useDashboardData();

  const nowLabel = new Intl.DateTimeFormat("en-PH", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date());

  if (loading) {
    return (
      <PrivateLayout>
        <PageLoadingSkeleton showStats statCount={6} filterCount={0} rowCount={10} />
      </PrivateLayout>
    );
  }

  if (error) {
    return (
      <PrivateLayout>
        <Box p={3}>
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={refetch}>
                Retry
              </Button>
            }
          >
            {error}
          </Alert>
        </Box>
      </PrivateLayout>
    );
  }

  if (!stats) {
    return (
      <PrivateLayout>
        <Box p={3}>
          <Alert severity="info">No dashboard data available.</Alert>
        </Box>
      </PrivateLayout>
    );
  }

  const healthTone =
    stats.outstandingRatio >= 60
      ? { label: "High portfolio pressure", color: "error" as const }
      : stats.outstandingRatio >= 30
        ? { label: "Moderate portfolio pressure", color: "warning" as const }
        : { label: "Healthy collection momentum", color: "success" as const };

  const metricCards: MetricCardConfig[] = [
    {
      title: "Total Portfolio",
      value: formatCurrency(stats.totalAmountDisbursed),
      subtitle: "Total disbursed principal",
      icon: <AttachMoney fontSize="small" />,
      accent: "#2563eb",
    },
    {
      title: "Outstanding Balance",
      value: formatCurrency(stats.totalOutstandingCollection),
      subtitle: `Exposure ratio ${formatPercent(stats.outstandingRatio)}`,
      icon: <TrendingDown fontSize="small" />,
      accent: "#dc2626",
    },
    {
      title: "Today's Collections",
      value: formatCurrency(stats.totalCollectedToday),
      subtitle: `${stats.centersWithCollectionsToday} centers posted today`,
      icon: <LocalAtm fontSize="small" />,
      accent: "#059669",
    },
    {
      title: "Collection Rate",
      value: formatPercent(stats.collectionRate),
      subtitle: `${stats.pendingCollectionsToday} entries need posting`,
      icon: <TrendingUp fontSize="small" />,
      accent: "#7c3aed",
    },
    {
      title: "Members",
      value: stats.totalMembers.toLocaleString("en-US"),
      subtitle: "Registered borrowers",
      icon: <People fontSize="small" />,
      accent: "#0f766e",
    },
    {
      title: "Centers",
      value: stats.totalCenters.toLocaleString("en-US"),
      subtitle: `${stats.activeLoans} centers with active balances`,
      icon: <Groups fontSize="small" />,
      accent: "#f59e0b",
    },
    {
      title: "Risk (High)",
      value: stats.riskBands.high.toString(),
      subtitle: "Centers at >= 60% outstanding",
      icon: <WarningAmber fontSize="small" />,
      accent: "#b91c1c",
    },
    {
      title: "Risk (Low + Medium)",
      value: (stats.riskBands.low + stats.riskBands.medium).toString(),
      subtitle: "Centers below high-risk threshold",
      icon: <CheckCircle fontSize="small" />,
      accent: "#15803d",
    },
  ];
  const topMetricCards = metricCards.slice(0, 4);
  const bottomMetricCards = metricCards.slice(4, 8);

  return (
    <PrivateLayout>
      <Box
        sx={{
          backgroundColor: "#f1f5f9",
          minHeight: "100vh",
          pb: 4,
          px: { xs: 1.5, md: 0 },
          overflowX: "hidden",
        }}
      >
        <Stack spacing={3}>
          <Paper
            sx={{
              borderRadius: 3,
              p: { xs: 2.5, md: 4 },
              border: "1px solid #dbe7ff",
              background:
                "linear-gradient(120deg, #0f172a 0%, #1d4ed8 46%, #2563eb 100%)",
              color: "#ffffff",
              overflow: "hidden",
              position: "relative",
            }}
          >
            <Box
              sx={{
                position: "absolute",
                right: -90,
                top: -90,
                width: 240,
                height: 240,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.08)",
              }}
            />

            <Box
              display="flex"
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", md: "center" }}
              gap={2}
              flexDirection={{ xs: "column", md: "row" }}
              sx={{ position: "relative", zIndex: 1 }}
            >
              <Box>
                <Typography variant="h4" fontWeight={800}>
                  Manager Command Center
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.92, mt: 0.75 }}>
                  {nowLabel} | Signed in as {user?.email}
                </Typography>
                <Stack direction="row" spacing={1} mt={2} flexWrap="wrap" useFlexGap>
                  <Chip
                    label={`Collection rate ${formatPercent(stats.collectionRate)}`}
                    size="small"
                    sx={{ backgroundColor: "rgba(255,255,255,0.2)", color: "#fff" }}
                  />
                  <Chip
                    label={`${stats.pendingCollectionsToday} pending entries today`}
                    size="small"
                    sx={{ backgroundColor: "rgba(255,255,255,0.2)", color: "#fff" }}
                  />
                  <Chip label={healthTone.label} size="small" color={healthTone.color} />
                </Stack>
              </Box>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
                <Button
                  variant="contained"
                  startIcon={<PendingActions />}
                  onClick={() => navigate("/approvals")}
                  sx={{
                    textTransform: "none",
                    fontWeight: 700,
                    background: "#ffffff",
                    color: "#1d4ed8",
                    border: "1px solid rgba(255,255,255,0.6)",
                    "&:hover": { background: "#e2e8f0" },
                    "&:active": { background: "#dbeafe" },
                    "&.Mui-disabled": {
                      background: "rgba(255,255,255,0.24)",
                      color: "rgba(255,255,255,0.9)",
                    },
                  }}
                >
                  Review Approvals
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Assessment />}
                  onClick={() => navigate("/portfolio")}
                  sx={{
                    textTransform: "none",
                    fontWeight: 700,
                    borderColor: "rgba(255,255,255,0.6)",
                    color: "#ffffff",
                    "&:hover": {
                      borderColor: "#ffffff",
                      backgroundColor: "rgba(255,255,255,0.08)",
                    },
                  }}
                >
                  Open Portfolio
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={refetch}
                  sx={{
                    textTransform: "none",
                    fontWeight: 700,
                    borderColor: "rgba(255,255,255,0.6)",
                    color: "#ffffff",
                    "&:hover": {
                      borderColor: "#ffffff",
                      backgroundColor: "rgba(255,255,255,0.08)",
                    },
                  }}
                >
                  Refresh
                </Button>
              </Stack>
            </Box>
          </Paper>

          <Stack spacing={3}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, minmax(0, 1fr))",
                  lg: "repeat(4, minmax(0, 1fr))",
                },
                columnGap: "24px",
                rowGap: "24px",
                alignItems: "stretch",
              }}
            >
              {topMetricCards.map((card) => (
                <MetricCard
                  key={card.title}
                  title={card.title}
                  value={card.value}
                  subtitle={card.subtitle}
                  icon={card.icon}
                  accent={card.accent}
                />
              ))}
            </Box>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, minmax(0, 1fr))",
                  lg: "repeat(4, minmax(0, 1fr))",
                },
                columnGap: "24px",
                rowGap: "24px",
                alignItems: "stretch",
              }}
            >
              {bottomMetricCards.map((card) => (
                <MetricCard
                  key={card.title}
                  title={card.title}
                  value={card.value}
                  subtitle={card.subtitle}
                  icon={card.icon}
                  accent={card.accent}
                />
              ))}
            </Box>
          </Stack>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 2fr) minmax(0, 1fr)" },
              columnGap: "24px",
              rowGap: "24px",
              alignItems: "start",
            }}
          >
            <CenterExposureTable centers={stats.topCentersByOutstanding} />

            <Stack spacing={3} sx={{ width: "100%", minWidth: 0 }}>
              <CollectionPulsePanel activity={stats.todayCollectionActivity} />
              <ManagerActionsPanel
                onOpenApprovals={() => navigate("/approvals")}
                // onOpenWaivers={() => navigate("/waivers")}
                onOpenTransactions={() => navigate("/transactions")}
              />
            </Stack>
          </Box>
        </Stack>
      </Box>
    </PrivateLayout>
  );
}
