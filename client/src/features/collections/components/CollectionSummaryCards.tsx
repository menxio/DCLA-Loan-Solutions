import {
  Box,
  Grid,
  Card,
  CardContent,
  Avatar,
  Typography,
} from "@mui/material";
import {
  People,
  CheckCircle,
  Schedule,
  Warning,
  AccountBalance,
  TrendingUp,
  AttachMoney,
} from "@mui/icons-material";
import type { DailyCollectionGroup } from "../types";

interface MemberWithLoans {
  id: string;
  overallAmount?: number;
  totalBalance?: number;
  totalSavings?: number;
}

interface ComputedStats {
  paidCount: number;
  partialCount: number;
  unpaidCount: number;
  totalOverallAmount: number;
  totalRemainingBalance: number;
}

interface CollectionSummaryCardsProps {
  collectionGroup: DailyCollectionGroup;
  members: MemberWithLoans[];
  computedStats: ComputedStats | null;
  formatCurrency: (amount: number) => string;
}

export function CollectionSummaryCards({
  collectionGroup,
  members,
  computedStats,
  formatCurrency,
}: CollectionSummaryCardsProps) {
  const summaryCards = [
    {
      title: "Total Members",
      value: collectionGroup.totalMembers,
      icon: People,
      color: "#1e3a8a",
      bgColor: "#eff6ff",
    },
    {
      title: "Paid",
      value: computedStats?.paidCount || 0,
      icon: CheckCircle,
      color: "#10b981",
      bgColor: "#f0fdf4",
    },
    {
      title: "Partial",
      value: computedStats?.partialCount || 0,
      icon: Schedule,
      color: "#f59e0b",
      bgColor: "#fffbeb",
    },
    {
      title: "Unpaid",
      value: computedStats?.unpaidCount || 0,
      icon: Warning,
      color: "#ef4444",
      bgColor: "#fef2f2",
    },
  ];

  const financialCards = [
    {
      title: "Overall Amount",
      subtitle: "Principal + Interest",
      value: formatCurrency(computedStats?.totalOverallAmount || 0),
      icon: AccountBalance,
      color: "#8b5cf6",
      bgColor: "#faf5ff",
    },
    {
      title: "Payment Received",
      subtitle: "Today's Collections",
      value: formatCurrency(
        Math.max(
          0,
          (computedStats?.totalOverallAmount || 0) -
            (computedStats?.totalRemainingBalance || 0)
        )
      ),
      icon: AttachMoney,
      color: "#10b981",
      bgColor: "#f0fdf4",
    },
    {
      title: "Remaining Balance",
      subtitle: "Outstanding Amount",
      value: formatCurrency(computedStats?.totalRemainingBalance || 0),
      icon: TrendingUp,
      color: "#ef4444",
      bgColor: "#fef2f2",
    },
  ];

  return (
    <Box sx={{ p: 3, backgroundColor: "#f8fafc" }}>
      {/* Status Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {summaryCards.map((card, index) => (
          <Grid item xs={6} md={3} key={index}>
            <Card
              sx={{
                textAlign: "center",
                border: "1px solid #e2e8f0",
                transition: "all 0.2s ease-in-out",
                "&:hover": {
                  transform: "translateY(-2px)",
                  boxShadow: "0 8px 25px rgba(0,0,0,0.1)",
                },
              }}
            >
              <CardContent sx={{ p: 2 }}>
                <Avatar
                  sx={{
                    bgcolor: card.color,
                    mx: "auto",
                    mb: 1,
                    width: 48,
                    height: 48,
                  }}
                >
                  <card.icon sx={{ fontSize: 24 }} />
                </Avatar>
                <Typography
                  variant="h5"
                  sx={{ fontWeight: 700, color: "#1e293b", mb: 0.5 }}
                >
                  {card.value}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {card.title}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Financial Summary */}
      <Box
        sx={{
          p: 3,
          background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
          borderRadius: 3,
          border: "1px solid #e2e8f0",
          boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
        }}
      >
        <Typography
          variant="h6"
          sx={{ fontWeight: 600, color: "#1e293b", mb: 3, textAlign: "center" }}
        >
          Financial Summary
        </Typography>
        <Grid container spacing={3}>
          {financialCards.map((card, index) => (
            <Grid item xs={12} md={4} key={index}>
              <Card
                sx={{
                  textAlign: "center",
                  border: "1px solid #e2e8f0",
                  backgroundColor: card.bgColor,
                  transition: "all 0.2s ease-in-out",
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: "0 8px 25px rgba(0,0,0,0.1)",
                  },
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Avatar
                    sx={{
                      bgcolor: card.color,
                      mx: "auto",
                      mb: 2,
                      width: 56,
                      height: 56,
                    }}
                  >
                    <card.icon sx={{ fontSize: 28 }} />
                  </Avatar>
                  <Typography
                    variant="h4"
                    sx={{ fontWeight: 700, color: card.color, mb: 1 }}
                  >
                    {card.value}
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: 600, color: "#1e293b", mb: 0.5 }}
                  >
                    {card.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {card.subtitle}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  );
}
