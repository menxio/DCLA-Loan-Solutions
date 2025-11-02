import type React from "react";
import {
  Grid,
  Typography,
  Box,
  Card,
  CardContent,
  Avatar,
  Chip,
  CircularProgress,
  Alert,
  Stack,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import {
  TrendingUp,
  AccountBalance,
  People,
  Assessment,
  Groups,
  AttachMoney,
  TrendingDown,
} from "@mui/icons-material";
import PrivateLayout from "@components/layout/PrivateLayout";
import { useAuthStore } from "@features/auth/authStore";
import { useDashboardData } from "../hooks/useDashboardData";
import ActivityLogList from "@features/activity/components/ActivityLogList";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: "primary" | "secondary" | "success" | "warning";
  trend?: string;
}

function StatCard({ title, value, icon, color, trend }: StatCardProps) {
  const colorMap = {
    primary: "#1e3a8a",
    secondary: "#64748b",
    success: "#10b981",
    warning: "#f59e0b",
  };

  return (
    <Card
      sx={{
        height: "100%",
        background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
        border: "1px solid #e2e8f0",
        transition: "all 0.3s ease-in-out",
        "&:hover": {
          transform: "translateY(-4px)",
          boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
        },
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
          <Avatar
            sx={{
              bgcolor: colorMap[color],
              mr: 2,
              width: 56,
              height: 56,
              background: `linear-gradient(135deg, ${colorMap[color]} 0%, ${colorMap[color]}CC 100%)`,
              boxShadow: `0 4px 15px ${colorMap[color]}40`,
            }}
          >
            {icon}
          </Avatar>
          <Box>
            <Typography
              variant="h4"
              component="div"
              fontWeight="bold"
              sx={{
                color: "#1e293b",
                mb: 0.5,
              }}
            >
              {value}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontWeight: 500 }}
            >
              {title}
            </Typography>
          </Box>
        </Box>
        {trend && (
          <Chip
            label={trend}
            size="small"
            sx={{
              backgroundColor: "#dcfce7",
              color: "#166534",
              fontWeight: 600,
              border: "1px solid #bbf7d0",
            }}
          />
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { stats, loading, error } = useDashboardData();
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down("sm"));

  const formatCurrency = (amount: number): string =>
    `₱${amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  if (loading) {
    return (
      <PrivateLayout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress sx={{ color: "#2563eb" }} />
        </Box>
      </PrivateLayout>
    );
  }

  if (error) {
    return (
      <PrivateLayout>
        <Box p={3}>
          <Alert severity="error" sx={{ mb: 2 }}>
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
          <Alert severity="info">No dashboard data available</Alert>
        </Box>
      </PrivateLayout>
    );
  }

  const dashboardStats = [
    {
      title: "Total Centers",
      value: stats.totalCenters,
      icon: <Groups />,
      color: "primary" as const,
      trend: `${stats.totalCenters} active centers`,
    },
    {
      title: "Total Members",
      value: stats.totalMembers,
      icon: <People />,
      color: "success" as const,
      trend: `${stats.totalMembers} registered members`,
    },
    {
      title: "Amount Disbursed",
      value: formatCurrency(stats.totalAmountDisbursed),
      icon: <AttachMoney />,
      color: "warning" as const,
      trend: "Total loan disbursements",
    },
    {
      title: "Outstanding Collection",
      value: formatCurrency(stats.totalOutstandingCollection),
      icon: <TrendingUp />,
      color: "secondary" as const,
      trend: "Pending collections",
    },
  ];

  return (
    <PrivateLayout>
      <Stack
        direction="column"
        spacing={1.5}
        sx={{
          mb: isSmall ? 3 : 4,
          textAlign: isSmall ? "center" : "left",
        }}
      >
        <Typography
          variant="h3"
          component="h1"
          gutterBottom
          sx={{
            fontWeight: 700,
            background: "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)",
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Dashboard
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400 }}>
          Welcome back, {user?.email}! Here's what's happening with your loans today.
        </Typography>
      </Stack>

      <Grid container spacing={3}>
        {dashboardStats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <StatCard {...stat} />
          </Grid>
        ))}
      </Grid>

      <Box
        sx={{
          mt: isSmall ? 4 : 5,
          display: "flex",
          flexDirection: "column",
          gap: isSmall ? 2 : 3,
        }}
      >
        <ActivityLogList title="Transaction History" limit={20} />
      </Box>
    </PrivateLayout>
  );
}
