import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControl,
  Grid,
  InputAdornment,
  InputLabel,
  MenuItem,
  Pagination,
  Paper,
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
import { useTransactionHistory } from "../hooks/useTransactionHistory";
import type { TransactionHistoryItem } from "../types";
import { useMemo } from "react";
import type { SelectChangeEvent } from "@mui/material/Select";

const typeOptions = [
  { value: "all", label: "All Transactions" },
  { value: "repayment", label: "Loan Repayments" },
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

export default function TransactionHistoryPage() {
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
  } = useTransactionHistory(25);

  const stats = useMemo(() => {
    const totals = transactions.reduce(
      (acc, tx) => {
        if (tx.type === "repayment") acc.repayments += 1;
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
        deposits: 0,
        withdrawals: 0,
        totalCredits: 0,
        totalDebits: 0,
      }
    );
    return totals;
  }, [transactions]);

  const handleLimitChange = (event: SelectChangeEvent) => {
    const newLimit = Number(event.target.value);
    setLimit(newLimit);
    setPage(1);
  };

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
                Review repayments and savings activity across all centers.
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
                    updateFilters({ type: event.target.value as any })
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
          <Grid item xs={12} md={3}>
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
          <Grid item xs={12} md={3}>
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
          <Grid item xs={12} md={3}>
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
          <Grid item xs={12} md={3}>
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
                </TableRow>
              </TableHead>
              <TableBody>
                {transactions.map((transaction) => {
                  const savingsAppliedToRepayment =
                    transaction.type === "savings_withdrawal" &&
                    (transaction.notes || "").toLowerCase().includes("applied to repayment");
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
                    <TableCell sx={{ textTransform: "capitalize" }}>
                      {transaction.type.replace("_", " ")}
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
                  </TableRow>
                  );
                })}
                {!loading && transactions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
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
      </Box>
    </DashboardLayout>
  );
}
