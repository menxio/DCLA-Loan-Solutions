import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { Assessment, Paid, ReceiptLong, Refresh, TrendingUp } from "@mui/icons-material";
import { useExpectedRevenue } from "../hooks/useExpectedRevenue";
import type { RevenueGranularity } from "../types";

const formatCurrency = (amount: number): string =>
  `\u20B1${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatWeeklyCollectionDay = (periodKey: string): string => {
  const [startKey, endKey] = periodKey.split("_");
  const startDate = new Date(`${startKey}T00:00:00Z`);
  const endDate = new Date(`${endKey}T00:00:00Z`);
  const startLabel = startDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

  return `${startLabel} (Day ${endDate.getUTCDate()})`;
};

export default function ExpectedRevenueView() {
  const [granularity, setGranularity] = useState<RevenueGranularity>("monthly");
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const weeklyFilter =
    granularity === "weekly"
      ? { month: selectedMonth, year: selectedYear }
      : undefined;
  const { data, loading, error, refetch } = useExpectedRevenue(
    granularity,
    weeklyFilter,
  );
  const availableMonths = data?.availableMonths ?? [];
  const availableYears = useMemo(
    () => Array.from(new Set(availableMonths.map((option) => option.year))),
    [availableMonths],
  );
  const availableMonthsForYear = availableMonths.filter(
    (option) => option.year === selectedYear,
  );

  useEffect(() => {
    if (granularity !== "weekly" || availableMonths.length === 0) {
      return;
    }

    const hasSelection = availableMonths.some(
      (option) =>
        option.month === selectedMonth && option.year === selectedYear,
    );

    if (!hasSelection) {
      const latestMonth = availableMonths[availableMonths.length - 1];
      setSelectedMonth(latestMonth.month);
      setSelectedYear(latestMonth.year);
    }
  }, [availableMonths, granularity, selectedMonth, selectedYear]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress sx={{ color: "#2563eb" }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="outlined" onClick={refetch} startIcon={<Refresh />}>
          Retry
        </Button>
      </Box>
    );
  }

  if (!data) {
    return <Alert severity="info">No expected revenue data available</Alert>;
  }

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 4,
          p: 3,
          backgroundColor: "#f8fafc",
          borderRadius: 3,
          border: "1px solid #e2e8f0",
        }}
      >
        <Box display="flex" alignItems="center" gap={2}>
          <Box
            sx={{
              backgroundColor: "#2563eb",
              borderRadius: 2,
              p: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Assessment sx={{ color: "white", fontSize: 24 }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ color: "#1e293b", fontWeight: 700 }}>
              Expected Revenue
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {granularity === "weekly"
                ? "Weekly revenue shown by start day and end day"
                : "Monthly projections from repayment schedules and loan release fees"}
            </Typography>
          </Box>
        </Box>
        <Box display="flex" alignItems="center" gap={2}>
          <Select
            size="small"
            value={granularity}
            onChange={(event) =>
              setGranularity(event.target.value as RevenueGranularity)
            }
            sx={{
              minWidth: 140,
              borderRadius: 2,
              backgroundColor: "white",
            }}
          >
            <MenuItem value="monthly">Monthly</MenuItem>
            <MenuItem value="weekly">Weekly</MenuItem>
          </Select>
          {granularity === "weekly" && (
            <>
              <Select
                size="small"
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(Number(event.target.value))}
                disabled={availableMonthsForYear.length === 0}
                sx={{
                  minWidth: 150,
                  borderRadius: 2,
                  backgroundColor: "white",
                }}
              >
                {availableMonthsForYear.map((option) => (
                  <MenuItem
                    key={`${option.year}-${option.month}`}
                    value={option.month}
                  >
                    {option.label.replace(` ${option.year}`, "")}
                  </MenuItem>
                ))}
              </Select>
              <Select
                size="small"
                value={selectedYear}
                onChange={(event) => {
                  const nextYear = Number(event.target.value);
                  const firstMonthForYear = availableMonths.find(
                    (option) => option.year === nextYear,
                  );
                  setSelectedYear(nextYear);
                  if (firstMonthForYear) {
                    setSelectedMonth(firstMonthForYear.month);
                  }
                }}
                disabled={availableYears.length === 0}
                sx={{
                  minWidth: 110,
                  borderRadius: 2,
                  backgroundColor: "white",
                }}
              >
                {availableYears.map((year) => (
                  <MenuItem key={year} value={year}>
                    {year}
                  </MenuItem>
                ))}
              </Select>
            </>
          )}
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={refetch}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              borderColor: "#2563eb",
              color: "#2563eb",
              borderRadius: 2,
              px: 3,
              "&:hover": {
                backgroundColor: "#2563eb",
                color: "white",
              },
            }}
          >
            Refresh Data
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={3}>
          <Card
            sx={{
              borderRadius: 3,
              border: "1px solid #e2e8f0",
              borderLeft: "4px solid #059669",
              background: "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)",
            }}
          >
            <CardContent>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <TrendingUp sx={{ color: "#059669" }} />
                <Typography variant="body2" color="text.secondary" fontWeight={600}>
                  Expected Collected Interest
                </Typography>
              </Box>
              <Typography variant="h5" fontWeight="bold" color="#1e293b">
                {formatCurrency(data.totalExpectedInterest)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card
            sx={{
              borderRadius: 3,
              border: "1px solid #e2e8f0",
              borderLeft: "4px solid #2563eb",
              background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
            }}
          >
            <CardContent>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <Paid sx={{ color: "#2563eb" }} />
                <Typography variant="body2" color="text.secondary" fontWeight={600}>
                  Service Charge
                </Typography>
              </Box>
              <Typography variant="h5" fontWeight="bold" color="#1e293b">
                {formatCurrency(data.totalServiceCharge)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card
            sx={{
              borderRadius: 3,
              border: "1px solid #e2e8f0",
              borderLeft: "4px solid #d97706",
              background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
            }}
          >
            <CardContent>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <ReceiptLong sx={{ color: "#d97706" }} />
                <Typography variant="body2" color="text.secondary" fontWeight={600}>
                  Notarial Fee
                </Typography>
              </Box>
              <Typography variant="h5" fontWeight="bold" color="#1e293b">
                {formatCurrency(data.totalNotarialFee)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card
            sx={{
              borderRadius: 3,
              border: "1px solid #e2e8f0",
              borderLeft: "4px solid #7c3aed",
              background: "linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)",
            }}
          >
            <CardContent>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <Assessment sx={{ color: "#7c3aed" }} />
                <Typography variant="body2" color="text.secondary" fontWeight={600}>
                  Total Revenue
                </Typography>
              </Box>
              <Typography variant="h5" fontWeight="bold" color="#1e293b">
                {formatCurrency(data.totalRevenue)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <TableContainer
        sx={{
          borderRadius: 3,
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
          overflow: "hidden",
        }}
      >
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f8fafc" }}>
              {granularity === "weekly" ? (
                <>
                  <TableCell sx={{ fontWeight: 700, color: "#374151" }}>
                    Collection Week
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: "#374151" }}>
                    Collection Day
                  </TableCell>
                </>
              ) : (
                <TableCell sx={{ fontWeight: 700, color: "#374151" }}>
                  Period
                </TableCell>
              )}
              <TableCell align="right" sx={{ fontWeight: 700, color: "#374151" }}>
                Expected Collected Interest
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, color: "#374151" }}>
                Service Charge
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, color: "#374151" }}>
                Notarial Fee
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, color: "#374151" }}>
                Total Revenue
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.periods.map((period, index) => (
              <TableRow
                key={period.periodKey}
                hover
                sx={{
                  "&:hover": {
                    backgroundColor: "#f8fafc",
                  },
                  "&:nth-of-type(even)": {
                    backgroundColor: "#fafbfc",
                  },
                }}
              >
                {granularity === "weekly" ? (
                  <>
                    <TableCell sx={{ color: "#374151", fontWeight: 700 }}>
                      Week {index + 1}
                    </TableCell>
                    <TableCell sx={{ color: "#374151", fontWeight: 600 }}>
                      {formatWeeklyCollectionDay(period.periodKey)}
                    </TableCell>
                  </>
                ) : (
                  <TableCell sx={{ color: "#374151", fontWeight: 600 }}>
                    {period.periodLabel}
                  </TableCell>
                )}
                <TableCell align="right" sx={{ color: "#059669", fontWeight: 700 }}>
                  {formatCurrency(period.expectedInterest)}
                </TableCell>
                <TableCell align="right" sx={{ color: "#2563eb", fontWeight: 700 }}>
                  {formatCurrency(period.serviceCharge)}
                </TableCell>
                <TableCell align="right" sx={{ color: "#d97706", fontWeight: 700 }}>
                  {formatCurrency(period.notarialFee)}
                </TableCell>
                <TableCell align="right" sx={{ color: "#7c3aed", fontWeight: 700 }}>
                  {formatCurrency(period.totalRevenue)}
                </TableCell>
              </TableRow>
            ))}
            <TableRow sx={{ backgroundColor: "#f1f5f9", borderTop: "2px solid #e2e8f0" }}>
              <TableCell
                colSpan={granularity === "weekly" ? 2 : 1}
                sx={{ fontWeight: "bold", color: "#1e293b" }}
              >
                Total
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold", color: "#059669" }}>
                {formatCurrency(data.totalExpectedInterest)}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold", color: "#2563eb" }}>
                {formatCurrency(data.totalServiceCharge)}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold", color: "#d97706" }}>
                {formatCurrency(data.totalNotarialFee)}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold", color: "#7c3aed" }}>
                {formatCurrency(data.totalRevenue)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
