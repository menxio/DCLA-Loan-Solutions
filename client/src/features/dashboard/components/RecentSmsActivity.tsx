import {
  Alert,
  Box,
  Chip,
  Divider,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import type { ChipProps } from "@mui/material";
import type {
  RecentSmsActivityResult,
  SmsEventType,
  SmsNotificationStatus,
} from "@features/notifications/types";
import {
  formatSmsActivityTime,
  selectSmsActivityTimestamp,
} from "../utils/recentSmsActivity";

interface RecentSmsActivityProps {
  data: RecentSmsActivityResult | null;
  loading: boolean;
  error: string | null;
}

const eventLabels: Record<SmsEventType, string> = {
  loan_created: "Loan Approval",
  repayment_posted: "Repayment",
};

const statusColors: Record<SmsNotificationStatus, ChipProps["color"]> = {
  pending: "warning",
  processing: "info",
  sent: "success",
  failed: "error",
};

export default function RecentSmsActivity({
  data,
  loading,
  error,
}: RecentSmsActivityProps) {
  const summary = data?.summary ?? {
    sentToday: 0,
    pending: 0,
    failedToday: 0,
  };

  return (
    <Paper
      variant="outlined"
      sx={{ borderRadius: 1, overflow: "hidden", borderColor: "#dbe3ec" }}
    >
      <Box sx={{ px: { xs: 2, md: 2.5 }, py: 2 }}>
        <Typography variant="h6" fontWeight={800} color="#172033">
          SMS Notifications
        </Typography>
        <Stack
          direction="row"
          spacing={{ xs: 1.5, sm: 2.5 }}
          useFlexGap
          flexWrap="wrap"
          mt={1}
          aria-label="SMS notification summary"
        >
          <Typography variant="body2" color="#18794e" fontWeight={700}>
            {summary.sentToday} Sent Today
          </Typography>
          <Typography variant="body2" color="#9a6700" fontWeight={700}>
            {summary.pending} Pending
          </Typography>
          <Typography variant="body2" color="#c62828" fontWeight={700}>
            {summary.failedToday} Failed Today
          </Typography>
        </Stack>
      </Box>

      <Divider />

      <Box sx={{ px: { xs: 2, md: 2.5 }, pt: 2, pb: 1 }}>
        <Typography variant="subtitle1" fontWeight={800} color="#172033">
          Recent SMS Activity
        </Typography>
      </Box>

      {error && (
        <Box sx={{ px: { xs: 2, md: 2.5 }, pb: 2 }}>
          <Alert severity="error">{error}</Alert>
        </Box>
      )}

      {loading && !data && (
        <Stack
          spacing={1}
          sx={{ px: { xs: 2, md: 2.5 }, pb: 2.5 }}
          data-testid="recent-sms-loading"
        >
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} variant="rounded" height={42} />
          ))}
        </Stack>
      )}

      {!loading && !error && data?.items.length === 0 && (
        <Typography color="text.secondary" textAlign="center" py={4} px={2}>
          No SMS notifications yet.
        </Typography>
      )}

      {data && data.items.length > 0 && (
        <TableContainer sx={{ overflowX: "auto" }}>
          <Table size="small" sx={{ minWidth: 680 }}>
            <TableHead>
              <TableRow sx={{ backgroundColor: "#f7f9fc" }}>
                <TableCell sx={{ fontWeight: 700 }}>Client</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Notification Type</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Time</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.items.map((item) => (
                <TableRow key={item.notificationId} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{item.memberName}</TableCell>
                  <TableCell>{eventLabels[item.eventType]}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      color={statusColors[item.status]}
                      label={item.status}
                      sx={{ textTransform: "capitalize", minWidth: 82 }}
                    />
                  </TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>
                    {formatSmsActivityTime(selectSmsActivityTimestamp(item))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
}
