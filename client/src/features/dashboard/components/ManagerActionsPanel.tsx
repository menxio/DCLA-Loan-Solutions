import { Assessment, PendingActions, WarningAmber } from "@mui/icons-material";
import { Button, Paper, Stack, Typography } from "@mui/material";

interface ManagerActionsPanelProps {
  onOpenApprovals: () => void;
  onOpenWaivers: () => void;
  onOpenTransactions: () => void;
}

export default function ManagerActionsPanel({
  onOpenApprovals,
  onOpenWaivers,
  onOpenTransactions,
}: ManagerActionsPanelProps) {
  return (
    <Paper
      sx={{
        borderRadius: 3,
        border: "1px solid #e2e8f0",
        p: 2.5,
      }}
    >
      <Typography variant="h6" fontWeight={800} color="#0f172a" mb={1}>
        Manager Actions
      </Typography>
      <Stack spacing={1.25}>
        <Button
          fullWidth
          variant="contained"
          startIcon={<PendingActions />}
          onClick={onOpenApprovals}
          sx={{ textTransform: "none", fontWeight: 700 }}
        >
          Open Collection Approvals
        </Button>
        <Button
          fullWidth
          variant="outlined"
          startIcon={<WarningAmber />}
          onClick={onOpenWaivers}
          sx={{ textTransform: "none", fontWeight: 700 }}
        >
          Review Loan Waivers
        </Button>
        <Button
          fullWidth
          variant="outlined"
          startIcon={<Assessment />}
          onClick={onOpenTransactions}
          sx={{ textTransform: "none", fontWeight: 700 }}
        >
          Audit Transaction History
        </Button>
      </Stack>
    </Paper>
  );
}
