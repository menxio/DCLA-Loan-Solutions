import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  Grid,
  InputAdornment,
  InputLabel,
  MenuItem,
  Pagination,
  Paper,
  Snackbar,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { History, Search } from "@mui/icons-material";
import DashboardLayout from "@components/layout/PrivateLayout";
import PageLoadingSkeleton from "@components/common/PageLoadingSkeleton";
import { useTransactionHistory } from "../hooks/useTransactionHistory";
import { useMemo, useState } from "react";
import type { SelectChangeEvent } from "@mui/material/Select";
import type { TransactionFilterType } from "../types";
import { useAuthStore } from "@features/auth/authStore";
import { repaymentsService } from "@features/repayments/api";

const typeOptions = [
  { value: "all", label: "All Transactions" },
  { value: "repayment", label: "Loan Repayments" },
  { value: "waiver", label: "Loan Waivers" },
  { value: "savings_deposit", label: "Savings Deposits" },
  { value: "savings_withdrawal", label: "Savings Withdrawals" },
];

const formatCurrency = (value: number) =>
  `₱${Number(value || 0).toLocaleString()}`;

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const directionColors: Record<string, "success" | "error" | "default"> = {
  credit: "success",
  debit: "error",
};

const getTransactionTypeLabel = (type: TransactionFilterType | "waiver") => {
  switch (type) {
    case "repayment":
      return "Repayment";
    case "waiver":
      return "Waiver";
    case "savings_deposit":
      return "Savings Deposit";
    case "savings_withdrawal":
      return "Savings Withdrawal";
    default:
      return type;
  }
};

export default function TransactionHistoryPage() {
  const role = useAuthStore((state) => state.user?.role ?? "");
  const {
    transactions,
    loading,
    error,
    page,
    limit,
    totalPages,
    total,
    filters,
    setPage,
    setLimit,
    updateFilters,
    refresh,
  } = useTransactionHistory(25);
  const [reversalDialog, setReversalDialog] = useState<{
    open: boolean;
    repaymentId: string | null;
    reason: string;
  }>({ open: false, repaymentId: null, reason: "" });
  const [submittingReversal, setSubmittingReversal] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  const stats = useMemo(() => {
    const totals = transactions.reduce(
      (acc, tx) => {
        if (tx.type === "repayment") acc.repayments += 1;
        if (tx.type === "waiver") acc.waivers += 1;
        if (tx.type === "savings_deposit") acc.deposits += 1;
        if (tx.type === "savings_withdrawal") acc.withdrawals += 1;
        if (tx.direction === "credit") {
          acc.totalCredits += tx.amount;
        } else {
          acc.totalDebits += tx.amount;
        }
        return acc;
      },
      {
        repayments: 0,
        waivers: 0,
        deposits: 0,
        withdrawals: 0,
        totalCredits: 0,
        totalDebits: 0,
      }
    );
    return totals;
  }, [transactions]);

  const showSnackbar = (
    message: string,
    severity: "success" | "error" = "success"
  ) => {
    setSnackbar({ open: true, message, severity });
  };

  const canRequestReversal = role === "cashier";

  const handleLimitChange = (event: SelectChangeEvent) => {
    const newLimit = Number(event.target.value);
    setLimit(newLimit);
    setPage(1);
  };

  const handleOpenReversalDialog = (repaymentId: string) => {
    setReversalDialog({ open: true, repaymentId, reason: "" });
  };

  const handleCloseReversalDialog = () => {
    if (submittingReversal) return;
    setReversalDialog({ open: false, repaymentId: null, reason: "" });
  };

  const handleSubmitReversalRequest = async () => {
    if (!reversalDialog.repaymentId) return;
    setSubmittingReversal(true);
    try {
      await repaymentsService.requestReversal(
        reversalDialog.repaymentId,
        reversalDialog.reason.trim() || undefined
      );
      showSnackbar("Reversal request submitted for manager approval.");
      handleCloseReversalDialog();
      await refresh();
    } catch (err) {
      showSnackbar("Failed to submit reversal request.", "error");
    } finally {
      setSubmittingReversal(false);
    }
  };

  if (loading && transactions.length === 0) {
    return (
      <DashboardLayout>
        <PageLoadingSkeleton
          showStats
          statCount={4}
          filterCount={4}
          rowCount={8}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Box sx={{ backgroundColor: "#f8fafc", minHeight: "100vh", p: 3 }}>
        <Paper
          sx={{
            mb: 3,
            p: 3,
            borderRadius: 3,
            border: "1px solid #e2e8f0",
            background:
              "linear-gradient(135deg, rgba(30,58,138,0.05) 0%, rgba(59,130,246,0.1) 100%)",
          }}
        >
          <Box display="flex" alignItems="center" gap={2}>
            <History sx={{ fontSize: 40, color: "#1e3a8a" }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: "#0f172a" }}>
                Transaction History
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Review repayments, waivers, and savings activity across all centers.
              </Typography>
            </Box>
          </Box>
        </Paper>

        <Paper
          sx={{
            p: 3,
            borderRadius: 3,
            border: "1px solid #e2e8f0",
            mb: 3,
          }}
        >
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Search by member or center"
                value={filters.search}
                onChange={(event) =>
                  updateFilters({ search: event.target.value })
                }
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={4} md={3}>
              <FormControl fullWidth>
                <InputLabel id="transaction-type-label">Type</InputLabel>
                <Select
                  labelId="transaction-type-label"
                  label="Type"
                  value={filters.type}
                  onChange={(event) =>
                    updateFilters({
                      type: event.target.value as TransactionFilterType | "all",
                    })
                  }
                >
                  {typeOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4} md={2.5}>
              <TextField
                label="Start Date"
                type="date"
                InputLabelProps={{ shrink: true }}
                fullWidth
                value={filters.startDate}
                onChange={(event) =>
                  updateFilters({ startDate: event.target.value })
                }
              />
            </Grid>
            <Grid item xs={12} sm={4} md={2.5}>
              <TextField
                label="End Date"
                type="date"
                InputLabelProps={{ shrink: true }}
                fullWidth
                value={filters.endDate}
                onChange={(event) =>
                  updateFilters({ endDate: event.target.value })
                }
              />
            </Grid>
          </Grid>
        </Paper>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <Card
              sx={{
                borderRadius: 3,
                border: "1px solid #e2e8f0",
                backgroundColor: "#eef2ff",
              }}
            >
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">
                  Total Records
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {total.toLocaleString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ borderRadius: 3, border: "1px solid #e2e8f0" }}>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">
                  Repayments
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {stats.repayments}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ borderRadius: 3, border: "1px solid #e2e8f0" }}>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">
                  Waivers
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {stats.waivers}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ borderRadius: 3, border: "1px solid #e2e8f0" }}>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">
                  Savings Deposits
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {stats.deposits}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ borderRadius: 3, border: "1px solid #e2e8f0" }}>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">
                  Savings Withdrawals
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {stats.withdrawals}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Paper
          sx={{
            borderRadius: 3,
            border: "1px solid #e2e8f0",
            p: 2,
          }}
        >
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <TableContainer>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Member</TableCell>
                  <TableCell>Center</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Direction</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell>Notes</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {transactions.map((transaction) => {
                  const savingsAppliedToRepayment =
                    transaction.type === "savings_withdrawal" &&
                    (transaction.notes || "").toLowerCase().includes("applied to repayment");
                  const isRepaymentPayment =
                    transaction.type === "repayment" &&
                    transaction.direction === "credit" &&
                    (transaction.repaymentOperationType ?? "payment") === "payment";
                  const showReversalAction = canRequestReversal && isRepaymentPayment;
                  return (
                  <TableRow key={transaction.id} hover>
                    <TableCell>{formatDate(transaction.createdAt)}</TableCell>
                    <TableCell>
                      <Typography sx={{ fontWeight: 600 }}>
                        {transaction.member.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {transaction.loan?.id ? `Loan #${transaction.loan.id}` : "—"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {transaction.member.center?.name ?? "No center"}
                    </TableCell>
                    <TableCell>
                      {getTransactionTypeLabel(transaction.type)}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={transaction.direction.toUpperCase()}
                        color={directionColors[transaction.direction]}
                        size="small"
                        sx={{ fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      {formatCurrency(transaction.amount)}
                      {savingsAppliedToRepayment && (
                        <Typography variant="body2" color="text.secondary">
                          Used for repayment
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {transaction.notes || "—"}
                    </TableCell>
                    <TableCell align="right">
                      {showReversalAction ? (
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          onClick={() => handleOpenReversalDialog(transaction.id)}
                          sx={{ textTransform: "none", fontWeight: 600 }}
                        >
                          Request Reversal
                        </Button>
                      ) : (
                        "---"
                      )}
                    </TableCell>
                  </TableRow>
                  );
                })}
                {!loading && transactions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      <Typography variant="body2" color="text.secondary">
                        No transactions found for the selected filters.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          {loading && (
            <Box sx={{ py: 6, display: "flex", justifyContent: "center" }}>
              <CircularProgress />
            </Box>
          )}
          <Box
            sx={{
              mt: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 2,
            }}
          >
            <Pagination
              count={totalPages}
              page={page}
              shape="rounded"
              color="primary"
              onChange={(_, value) => setPage(value)}
            />
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel id="page-size-label">Rows</InputLabel>
              <Select
                labelId="page-size-label"
                label="Rows"
                value={String(limit)}
                onChange={handleLimitChange}
              >
                {[10, 25, 50, 100].map((size) => (
                  <MenuItem key={size} value={size}>
                    {size} / page
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Paper>

        <Dialog open={reversalDialog.open} onClose={handleCloseReversalDialog}>
          <DialogTitle>Request repayment reversal</DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ mb: 2 }}>
              This request will stay pending until a manager approves it.
            </DialogContentText>
            <TextField
              fullWidth
              label="Reason (optional)"
              value={reversalDialog.reason}
              onChange={(event) =>
                setReversalDialog((prev) => ({
                  ...prev,
                  reason: event.target.value,
                }))
              }
              multiline
              minRows={2}
            />
          </DialogContent>
          <DialogActions sx={{ p: 3, gap: 1 }}>
            <Button
              onClick={handleCloseReversalDialog}
              disabled={submittingReversal}
              sx={{ color: "#64748b" }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleSubmitReversalRequest}
              disabled={submittingReversal}
            >
              {submittingReversal ? "Submitting..." : "Submit Request"}
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        >
          <Alert
            onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
            severity={snackbar.severity}
            sx={{ width: "100%" }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </DashboardLayout>
  );
}

