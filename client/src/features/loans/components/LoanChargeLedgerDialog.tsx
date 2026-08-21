import {
  Box,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Button,
} from "@mui/material";
import type { LoanChargeBreakdown, LoanChargeLedgerEntry } from "../types";

interface LoanChargeLedgerDialogProps {
  open: boolean;
  loading: boolean;
  borrowerName: string;
  breakdown: LoanChargeBreakdown | null;
  onClose: () => void;
}

const formatCurrency = (value: number) =>
  `PHP ${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDateTime = (value?: string | null) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const getChargeLabel = (entry: LoanChargeLedgerEntry) =>
  entry.chargeType === "past_due_interest"
    ? "Past Due Interest"
    : entry.metadata?.penaltyKind === "weekly_delayed_payment"
      ? "Weekly Penalty"
      : "Maturity Penalty";

const getEventLabel = (entry: LoanChargeLedgerEntry) => {
  if (entry.eventType === "payment_reversal") return "Payment Reversal";
  if (entry.eventType === "payment") return "Payment";
  return "Accrual";
};

const getEventColor = (entry: LoanChargeLedgerEntry) => {
  if (entry.eventType === "payment_reversal") return "warning" as const;
  if (entry.eventType === "payment") return "success" as const;
  return "error" as const;
};

export default function LoanChargeLedgerDialog({
  open,
  loading,
  borrowerName,
  breakdown,
  onClose,
}: LoanChargeLedgerDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>Charge Ledger</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          {breakdown
            ? `Loan ${breakdown.loanId} - ${borrowerName}`
            : "Penalty and past-due-interest history"}
        </DialogContentText>

        {loading ? (
          <Typography variant="body2" color="text.secondary">
            Loading charge ledger...
          </Typography>
        ) : breakdown ? (
          <>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, 1fr)",
                  md: "repeat(4, 1fr)",
                },
                gap: 2,
                mb: 3,
              }}
            >
              {[
                ["Regular Outstanding", breakdown.regularOutstanding],
                ["Past Due Interest", breakdown.pastDueInterestOutstanding],
                ["Penalty", breakdown.penaltyOutstanding],
                ["Total Loan Balance", breakdown.balance],
              ].map(([label, value]) => (
                <Paper key={String(label)} variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    {label}
                  </Typography>
                  <Typography variant="h6" fontWeight={700}>
                    {formatCurrency(Number(value))}
                  </Typography>
                </Paper>
              ))}
            </Box>

            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Posted</TableCell>
                    <TableCell>Charge</TableCell>
                    <TableCell>Event</TableCell>
                    <TableCell>Period</TableCell>
                    <TableCell align="right">Basis</TableCell>
                    <TableCell align="right">Rate</TableCell>
                    <TableCell align="right">Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {breakdown.entries.map((entry) => (
                    <TableRow key={entry.id} hover>
                      <TableCell>{formatDateTime(entry.createdAt)}</TableCell>
                      <TableCell>{getChargeLabel(entry)}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={getEventLabel(entry)}
                          color={getEventColor(entry)}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        {entry.periodStart || entry.periodEnd
                          ? `${entry.periodStart ?? "N/A"} to ${entry.periodEnd ?? "N/A"}`
                          : "N/A"}
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(entry.baseAmount)}
                      </TableCell>
                      <TableCell align="right">
                        {entry.rate > 0
                          ? `${(entry.rate * 100).toFixed(4)}%`
                          : "Fixed"}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        {formatCurrency(entry.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {breakdown.entries.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <Typography variant="body2" color="text.secondary">
                          No charge ledger entries found for this loan.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Charge details could not be loaded.
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
