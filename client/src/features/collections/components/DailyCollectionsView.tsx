import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Avatar,
} from "@mui/material";
import {
  CalendarToday,
  LocationOn,
  People,
  CheckCircle,
  Schedule,
  Warning,
  Visibility,
} from "@mui/icons-material";
import CollectionStatsCard from "./CollectionStatsCard";
import type { DailyCollectionGroup } from "../types";

interface DailyCollectionsViewProps {
  data: DailyCollectionGroup[];
  onViewDetails: (group: DailyCollectionGroup) => void;
  loading?: boolean;
}

export default function DailyCollectionsView({
  data,
  onViewDetails,
  loading,
}: DailyCollectionsViewProps) {
  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString()}`;
  };

  if (data.length === 0) {
    return (
      <Card
        sx={{
          background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
          border: "1px solid #e2e8f0",
          textAlign: "center",
          py: 6,
        }}
      >
        <Schedule sx={{ fontSize: 64, color: "#94a3b8", mb: 2 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No Collections Scheduled Today
        </Typography>
        <Typography variant="body2" color="text.secondary">
          All collections for today have been completed or there are no
          scheduled collections.
        </Typography>
      </Card>
    );
  }

  return (
    <Box>
      {data.map((group) => (
        <Card
          key={group.centerId}
          sx={{
            mb: 4,
            background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
            border: "1px solid #e2e8f0",
            overflow: "hidden",
            transition: "all 0.3s ease-in-out",
            "&:hover": {
              transform: "translateY(-2px)",
              boxShadow: "0 8px 25px rgba(0, 0, 0, 0.1)",
            },
          }}
        >
          {/* Center Header */}
          <Box
            sx={{
              p: 3,
              background: "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)",
              color: "white",
            }}
          >
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={8}>
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                  {group.centerName}
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    flexWrap: "wrap",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <CalendarToday sx={{ fontSize: 16 }} />
                    <Typography variant="body2">
                      {group.collectionDay}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <LocationOn sx={{ fontSize: 16 }} />
                    <Typography variant="body2">
                      {group.collectionDate}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: { xs: "left", md: "right" } }}>
                  <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                    {formatCurrency(group.totalAmount)}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Received: {formatCurrency(group.totalReceived)}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>

          <CardContent sx={{ p: 3 }}>
            {/* Statistics Cards */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={6} md={3}>
                <CollectionStatsCard
                  title="Total Members"
                  value={group.totalMembers}
                  icon={<People />}
                  color="primary"
                />
              </Grid>
              <Grid item xs={6} md={3}>
                <CollectionStatsCard
                  title="Paid"
                  value={
                    group.collections.filter(
                      (c) => c.paymentReceived >= c.amount
                    ).length
                  }
                  icon={<CheckCircle />}
                  color="success"
                />
              </Grid>
              <Grid item xs={6} md={3}>
                <CollectionStatsCard
                  title="Pending"
                  value={group.pendingCollections}
                  icon={<Schedule />}
                  color="warning"
                />
              </Grid>
              <Grid item xs={6} md={3}>
                <CollectionStatsCard
                  title="Partial"
                  value={
                    group.collections.filter(
                      (c) =>
                        c.paymentReceived < c.amount && c.paymentReceived > 0
                    ).length
                  }
                  icon={<Warning />}
                  color="error"
                />
              </Grid>
            </Grid>

            {/* Collection Progress */}
            <Box
              sx={{
                p: 3,
                backgroundColor: "#f8fafc",
                borderRadius: 2,
                border: "1px solid #e2e8f0",
                mb: 3,
              }}
            >
              <Grid container spacing={3} alignItems="center">
                <Grid item xs={12} md={8}>
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: 600, color: "#1e293b", mb: 1 }}
                  >
                    Collection Progress
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {
                      group.collections.filter(
                        (c) => c.paymentReceived >= c.amount
                      ).length
                    }{" "}
                    of {group.totalMembers} members have completed their
                    payments
                  </Typography>

                  {/* Progress Bar */}
                  <Box sx={{ mt: 2, mb: 1 }}>
                    <Box
                      sx={{
                        width: "100%",
                        height: 8,
                        backgroundColor: "#e2e8f0",
                        borderRadius: 4,
                        overflow: "hidden",
                      }}
                    >
                      <Box
                        sx={{
                          width: `${
                            (group.totalReceived / group.totalAmount) * 100
                          }%`,
                          height: "100%",
                          background:
                            "linear-gradient(135deg, #10b981 0%, #34d399 100%)",
                          transition: "width 0.3s ease-in-out",
                        }}
                      />
                    </Box>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {((group.totalReceived / group.totalAmount) * 100).toFixed(
                      1
                    )}
                    % collected
                  </Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Box sx={{ textAlign: { xs: "left", md: "right" } }}>
                    <Button
                      variant="contained"
                      startIcon={<Visibility />}
                      onClick={() => onViewDetails(group)}
                      sx={{
                        background:
                          "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)",
                        "&:hover": {
                          background:
                            "linear-gradient(135deg, #1e40af 0%, #2563eb 100%)",
                        },
                        px: 3,
                        py: 1.5,
                        fontWeight: 600,
                        borderRadius: 2,
                      }}
                    >
                      View Details
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </Box>

            {/* Quick Summary */}
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    p: 2,
                    backgroundColor: "#f0f9ff",
                    borderRadius: 2,
                  }}
                >
                  <Avatar sx={{ bgcolor: "#3b82f6", width: 40, height: 40 }}>
                    <People />
                  </Avatar>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Members with Outstanding Balance
                    </Typography>
                    <Typography
                      variant="h6"
                      sx={{ fontWeight: 600, color: "#1e293b" }}
                    >
                      {
                        group.collections.filter(
                          (c) => c.paymentReceived < c.amount
                        ).length
                      }
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    p: 2,
                    backgroundColor: "#f0fdf4",
                    borderRadius: 2,
                  }}
                >
                  <Avatar sx={{ bgcolor: "#10b981", width: 40, height: 40 }}>
                    <CheckCircle />
                  </Avatar>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Collection Efficiency
                    </Typography>
                    <Typography
                      variant="h6"
                      sx={{ fontWeight: 600, color: "#1e293b" }}
                    >
                      {(
                        (group.collections.filter(
                          (c) => c.paymentReceived >= c.amount
                        ).length /
                          group.totalMembers) *
                        100
                      ).toFixed(1)}
                      %
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}
