import type React from "react";
import {
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  Avatar,
  Chip,
} from "@mui/material";
import {
  TrendingUp,
  AccountBalance,
  People,
  Assessment,
} from "@mui/icons-material";
import DashboardLayout from "@components/layout/DashboardLayout";
import { useAuthStore } from "@features/auth/authStore";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: "primary" | "secondary" | "success" | "warning";
  trend?: string;
}

function StatCard({ title, value, icon, color, trend }: StatCardProps) {
  return (
    <Card sx={{ height: "100%" }}>
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
          <Avatar sx={{ bgcolor: `${color}.main`, mr: 2 }}>{icon}</Avatar>
          <Box>
            <Typography variant="h4" component="div" fontWeight="bold">
              {value}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {title}
            </Typography>
          </Box>
        </Box>
        {trend && (
          <Chip label={trend} size="small" color="success" variant="outlined" />
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();

  const stats = [
    {
      title: "Total Loans",
      value: "1,234",
      icon: <AccountBalance />,
      color: "primary" as const,
      trend: "+12% from last month",
    },
    {
      title: "Active Applications",
      value: "89",
      icon: <Assessment />,
      color: "secondary" as const,
      trend: "+5% from last week",
    },
    {
      title: "Total Customers",
      value: "2,456",
      icon: <People />,
      color: "success" as const,
      trend: "+8% from last month",
    },
    {
      title: "Revenue",
      value: "$125,430",
      icon: <TrendingUp />,
      color: "warning" as const,
      trend: "+15% from last month",
    },
  ];

  return (
    <DashboardLayout>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Welcome back, {user?.email}! Here's what's happening with your loans
          today.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {stats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <StatCard {...stat} />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              Recent Loan Applications
            </Typography>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "80%",
                color: "text.secondary",
              }}
            >
              <Typography>Chart/Table component would go here</Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              Quick Actions
            </Typography>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "80%",
                color: "text.secondary",
              }}
            >
              <Typography>Quick action buttons would go here</Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </DashboardLayout>
  );
}
