import { useState } from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Alert,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
} from "@mui/material";
import {
  Download,
  TrendingUp,
  AccountBalance,
  Refresh,
  Search,
  Assessment,
} from "@mui/icons-material";
import { useProjectedIncome } from "../hooks/useProjectedIncome";

export default function ProjectedIncomeView() {
  const { data, loading, error, refetch } = useProjectedIncome();
  const [exporting, setExporting] = useState(false);

  const formatCurrency = (amount: number): string => {
    return `₱${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleExport = async () => {
    if (!data) return;

    setExporting(true);
    try {
      const { exportProjectedIncomeToExcel } =
        await import("../utils/exportUtils");
      await exportProjectedIncomeToExcel(data);
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
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
    return <Alert severity="info">No projected income data available</Alert>;
  }

  return (
    <Box sx={{ minWidth: 0, maxWidth: "100%" }}>
      {/* Header with Controls */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexDirection: { xs: "column", md: "row" },
          gap: 2,
          mb: 4,
          p: 3,
          backgroundColor: "#f8fafc",
          borderRadius: 3,
          border: "1px solid #e2e8f0",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            flexDirection: { xs: "column", sm: "row" },
            gap: 2,
            width: { xs: "100%", md: "auto" },
          }}
        >
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
              Projected Income Analytics
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Monitor interest projections and outstanding balances across
              centers
            </Typography>
          </Box>
        </Box>
        <Box display="flex" alignItems="center" gap={2}>
          <TextField
            size="small"
            placeholder="Search centers..."
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ color: "#64748b", fontSize: 20 }} />
                </InputAdornment>
              ),
            }}
            sx={{
              width: { xs: "100%", sm: 250 },
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
              },
            }}
          />
          <FormControl size="small">
            <Select
              value={10}
              sx={{
                minWidth: 80,
                borderRadius: 2,
              }}
            >
              <MenuItem value={10}>10</MenuItem>
              <MenuItem value={25}>25</MenuItem>
              <MenuItem value={50}>50</MenuItem>
            </Select>
          </FormControl>
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

      {/* Summary Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={6}>
          <Card
            sx={{
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
              borderRadius: 3,
              background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
              borderLeft: "4px solid #f59e0b",
              transition: "all 0.3s ease",
              "&:hover": {
                transform: "translateY(-2px)",
                boxShadow: "0 4px 12px rgba(245, 158, 11, 0.15)",
              },
            }}
          >
            <CardContent>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <Box
                  sx={{
                    backgroundColor: "#f59e0b",
                    borderRadius: 2,
                    p: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <AccountBalance sx={{ color: "white", fontSize: 20 }} />
                </Box>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  fontWeight={600}
                >
                  Total Outstanding Balance
                </Typography>
              </Box>
              <Typography
                variant="h4"
                sx={{ color: "#1e293b", fontWeight: "bold" }}
              >
                {formatCurrency(data.totalOutstandingBalance)}
              </Typography>
              <Typography
                variant="body2"
                color="warning.main"
                sx={{ mt: 1, fontWeight: 600 }}
              >
                ⚠ Active Loans Balance
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card
            sx={{
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
              borderRadius: 3,
              background: "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)",
              borderLeft: "4px solid #10b981",
              transition: "all 0.3s ease",
              "&:hover": {
                transform: "translateY(-2px)",
                boxShadow: "0 4px 12px rgba(16, 185, 129, 0.15)",
              },
            }}
          >
            <CardContent>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <Box
                  sx={{
                    backgroundColor: "#10b981",
                    borderRadius: 2,
                    p: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <TrendingUp sx={{ color: "white", fontSize: 20 }} />
                </Box>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  fontWeight={600}
                >
                  Total Interest Income
                </Typography>
              </Box>
              <Typography
                variant="h4"
                sx={{ color: "#1e293b", fontWeight: "bold" }}
              >
                {formatCurrency(data.totalInterestIncome)}
              </Typography>
              <Typography
                variant="body2"
                color="success.main"
                sx={{ mt: 1, fontWeight: 600 }}
              >
                💰 Projected Revenue
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Export Button */}
      <Box display="flex" justifyContent="flex-end" mb={3}>
        <Button
          variant="contained"
          startIcon={<Download />}
          onClick={handleExport}
          disabled={exporting}
          sx={{
            backgroundColor: "#2563eb",
            textTransform: "none",
            fontWeight: 600,
            borderRadius: 2,
            px: 3,
            py: 1.5,
            boxShadow: "0 2px 4px rgba(37, 99, 235, 0.2)",
            "&:hover": {
              backgroundColor: "#1d4ed8",
              boxShadow: "0 4px 8px rgba(37, 99, 235, 0.3)",
            },
            "&:disabled": {
              backgroundColor: "#94a3b8",
            },
          }}
        >
          {exporting ? "Exporting..." : "Export to Excel"}
        </Button>
      </Box>

      {/* Projected Income Table */}
      <TableContainer
        sx={{
          borderRadius: 3,
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
          overflowX: "auto",
          maxWidth: "100%",
        }}
      >
        <Table sx={{ minWidth: 640 }}>
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f8fafc" }}>
              <TableCell
                sx={{ fontWeight: 700, color: "#374151", fontSize: "0.95rem" }}
              >
                No.
              </TableCell>
              <TableCell
                sx={{ fontWeight: 700, color: "#374151", fontSize: "0.95rem" }}
              >
                Center Name
              </TableCell>
              <TableCell
                align="right"
                sx={{ fontWeight: 700, color: "#374151", fontSize: "0.95rem" }}
              >
                Outstanding Balance
              </TableCell>
              <TableCell
                align="right"
                sx={{ fontWeight: 700, color: "#374151", fontSize: "0.95rem" }}
              >
                Interest Income
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.centers.map((center) => (
              <TableRow
                key={center.no}
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
                <TableCell sx={{ color: "#374151", fontWeight: 600 }}>
                  <Box
                    sx={{
                      backgroundColor: "#2563eb",
                      color: "white",
                      borderRadius: "50%",
                      width: 24,
                      height: 24,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                    }}
                  >
                    {center.no}
                  </Box>
                </TableCell>
                <TableCell sx={{ color: "#374151", fontWeight: 600 }}>
                  {center.centerName}
                </TableCell>
                <TableCell
                  align="right"
                  sx={{ color: "#374151", fontWeight: 600 }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      color: "#f59e0b",
                      fontWeight: 700,
                      backgroundColor: "#fef3c7",
                      px: 2,
                      py: 0.5,
                      borderRadius: 2,
                      display: "inline-block",
                    }}
                  >
                    {formatCurrency(center.outstandingBalance)}
                  </Typography>
                </TableCell>
                <TableCell
                  align="right"
                  sx={{ color: "#374151", fontWeight: 600 }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      color: center.interestIncome > 0 ? "#059669" : "#6b7280",
                      fontWeight: 700,
                      backgroundColor:
                        center.interestIncome > 0 ? "#ecfdf5" : "#f9fafb",
                      px: 2,
                      py: 0.5,
                      borderRadius: 2,
                      display: "inline-block",
                      border:
                        center.interestIncome > 0
                          ? "1px solid #d1fae5"
                          : "1px solid #e5e7eb",
                    }}
                  >
                    {formatCurrency(center.interestIncome)}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}

            {/* Total Row */}
            <TableRow
              sx={{
                backgroundColor: "#f1f5f9",
                borderTop: "2px solid #e2e8f0",
              }}
            >
              <TableCell
                sx={{ fontWeight: "bold", color: "#1e293b", fontSize: "1rem" }}
              >
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="body1" fontWeight="bold">
                    Total
                  </Typography>
                </Box>
              </TableCell>
              <TableCell
                sx={{ fontWeight: "bold", color: "#1e293b", fontSize: "1rem" }}
              >
                <Typography variant="body1" fontWeight="bold">
                  {data.centers.length} Centers
                </Typography>
              </TableCell>
              <TableCell
                align="right"
                sx={{ fontWeight: "bold", color: "#1e293b", fontSize: "1rem" }}
              >
                <Typography
                  variant="body1"
                  sx={{
                    color: "#f59e0b",
                    fontWeight: "bold",
                    backgroundColor: "#fef3c7",
                    px: 2,
                    py: 1,
                    borderRadius: 2,
                    display: "inline-block",
                  }}
                >
                  {formatCurrency(data.totalOutstandingBalance)}
                </Typography>
              </TableCell>
              <TableCell
                align="right"
                sx={{ fontWeight: "bold", color: "#1e293b", fontSize: "1rem" }}
              >
                <Typography
                  variant="body1"
                  sx={{
                    color: "#059669",
                    fontWeight: "bold",
                    backgroundColor: "#ecfdf5",
                    px: 2,
                    py: 1,
                    borderRadius: 2,
                    display: "inline-block",
                    border: "1px solid #d1fae5",
                  }}
                >
                  {formatCurrency(data.totalInterestIncome)}
                </Typography>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
