import PendingActionsIcon from "@mui/icons-material/PendingActions";
import RefreshIcon from "@mui/icons-material/Refresh";
import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import PrivateLayout from "@components/layout/PrivateLayout";
import { useAuthStore } from "@features/auth/authStore";
import { useNavigate } from "react-router-dom";
import RecentSmsActivity from "../components/RecentSmsActivity";
import { useRecentSmsActivity } from "../hooks/useRecentSmsActivity";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { data, loading, error, refetch } = useRecentSmsActivity(10);

  const nowLabel = new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date());

  return (
    <PrivateLayout>
      <Box
        sx={{
          backgroundColor: "background.default",
          minHeight: "100vh",
          pb: 4,
          px: { xs: 1.5, md: 0 },
          overflowX: "hidden",
        }}
      >
        <Stack spacing={3}>
          <Paper
            sx={{
              borderRadius: 1,
              p: { xs: 2.5, md: 3 },
              border: "1px solid rgba(255,255,255,0.1)",
              background: (theme) =>
                `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
              color: "common.white",
            }}
          >
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", md: "center" }}
              gap={2}
              flexDirection={{ xs: "column", md: "row" }}
            >
              <Box>
                <Typography variant="h4" fontWeight={800} color="common.white">
                  Manager Command Center
                </Typography>
                <Typography variant="body1" sx={{ color: "#e2e8f0", mt: 0.75 }}>
                  {nowLabel} | Signed in as {user?.email}
                </Typography>
              </Box>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
                <Button
                  variant="contained"
                  startIcon={<PendingActionsIcon />}
                  onClick={() => navigate("/approvals")}
                  sx={{
                    textTransform: "none",
                    fontWeight: 700,
                    background: (theme) => theme.palette.common.white,
                    color: "primary.main",
                    "&:hover": {
                      background: "#f1f5f9",
                      color: "primary.dark",
                    },
                    "&.Mui-disabled": {
                      background: (theme) => theme.palette.secondary.light,
                      color: "common.white",
                    },
                  }}
                >
                  Review Approvals
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={() => void refetch()}
                  disabled={loading}
                  sx={{
                    textTransform: "none",
                    fontWeight: 700,
                    borderColor: "rgba(255,255,255,0.4)",
                    color: "common.white",
                    backgroundColor: "transparent",
                    "&:hover": {
                      borderColor: "rgba(255,255,255,0.7)",
                      backgroundColor: "rgba(255,255,255,0.08)",
                    },
                    "&.Mui-disabled": {
                      borderColor: "rgba(255,255,255,0.35)",
                      color: "rgba(255,255,255,0.65)",
                    },
                  }}
                >
                  Refresh
                </Button>
              </Stack>
            </Box>
          </Paper>

          <RecentSmsActivity data={data} loading={loading} error={error} />
        </Stack>
      </Box>
    </PrivateLayout>
  );
}
