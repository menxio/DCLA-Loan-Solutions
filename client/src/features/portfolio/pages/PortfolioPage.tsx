import type React from "react"
import { useState } from "react"
import {
  Box,
  Typography,
  Paper,
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
  Tabs,
  Tab,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
} from "@mui/material"
import { Download, TrendingUp, AccountBalance, Refresh, Search, BarChart } from "@mui/icons-material"
import DashboardLayout from "@components/layout/PrivateLayout"
import PageLoadingSkeleton from "@components/common/PageLoadingSkeleton"
import { usePortfolio } from "../hooks/usePortfolio"
import { exportPortfolioToExcel } from "../utils/exportUtils"
import ProjectedIncomeView from "../components/ProjectedIncomeView"

export default function PortfolioPage() {
  const { data, loading, error, refetch } = usePortfolio()
  const [exporting, setExporting] = useState(false)
  const [activeTab, setActiveTab] = useState(0)

  const formatCurrency = (amount: number): string => {
    return `₱${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const handleExport = async () => {
    if (!data) return

    setExporting(true)
    try {
      await exportPortfolioToExcel(data)
    } catch (error) {
      console.error("Export failed:", error)
    } finally {
      setExporting(false)
    }
  }

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue)
  }

  if (loading) {
    return (
      <DashboardLayout>
        <PageLoadingSkeleton showStats showTabs statCount={3} filterCount={3} rowCount={8} />
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout>
        <Box p={3}>
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
          <Button variant="outlined" onClick={refetch} startIcon={<Refresh />}>
            Retry
          </Button>
        </Box>
      </DashboardLayout>
    )
  }

  if (!data) {
    return (
      <DashboardLayout>
        <Box p={3}>
          <Alert severity="info">No portfolio data available</Alert>
        </Box>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <Box sx={{ backgroundColor: "#f8fafc", minHeight: "100vh" }}>
        {/* Header Section */}
        <Paper
          sx={{
            background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
            border: "1px solid #e2e8f0",
            borderRadius: 3,
            p: 4,
            mb: 3,
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
          }}
        >
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            {/* Left side - Title and Description */}
            <Box display="flex" alignItems="center" gap={3}>
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: 2,
                  background: "linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 14px 0 rgba(59, 130, 246, 0.3)",
                }}
              >
                <BarChart sx={{ fontSize: 28, color: "white" }} />
              </Box>
              <Box>
                <Typography variant="h4" fontWeight="bold" color="#1e293b" mb={1}>
                  Portfolio Analytics
                </Typography>
                <Typography variant="body1" color="#64748b">
                  Track and manage loan disbursements and collections across all centers
                </Typography>
              </Box>
            </Box>

            {/* Right side - Controls */}
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
                  minWidth: 200,
                  "& .MuiOutlinedInput-root": {
                    backgroundColor: "white",
                    borderRadius: 2,
                  },
                }}
              />
              
              <FormControl size="small">
                <Select 
                  value={10} 
                  sx={{ 
                    minWidth: 80,
                    backgroundColor: "white",
                    borderRadius: 2,
                  }}
                >
                  <MenuItem value={10}>10</MenuItem>
                  <MenuItem value={25}>25</MenuItem>
                  <MenuItem value={50}>50</MenuItem>
                </Select>
              </FormControl>
              
              <Button
                variant="contained"
                startIcon={<Refresh />}
                onClick={refetch}
                sx={{
                  background: "linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)",
                  borderRadius: 2,
                  px: 3,
                  py: 1.5,
                  textTransform: "none",
                  fontWeight: 600,
                  boxShadow: "0 4px 14px 0 rgba(59, 130, 246, 0.3)",
                  "&:hover": {
                    background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                    boxShadow: "0 6px 20px 0 rgba(59, 130, 246, 0.4)",
                  },
                }}
              >
                Refresh Data
              </Button>
            </Box>
          </Box>
          
          {/* Quick Stats */}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Box
                sx={{
                  backgroundColor: "rgba(59, 130, 246, 0.05)",
                  borderRadius: 2,
                  p: 2,
                  border: "1px solid rgba(59, 130, 246, 0.1)",
                }}
              >
                <Typography variant="body2" color="#64748b" mb={1}>
                  Total Centers
                </Typography>
                <Typography variant="h5" fontWeight="bold" color="#1e40af">
                  {data?.centers.length || 0}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box
                sx={{
                  backgroundColor: "rgba(16, 185, 129, 0.05)",
                  borderRadius: 2,
                  p: 2,
                  border: "1px solid rgba(16, 185, 129, 0.1)",
                }}
              >
                <Typography variant="body2" color="#64748b" mb={1}>
                  Total Disbursed
                </Typography>
                <Typography variant="h5" fontWeight="bold" color="#059669">
                  {data ? formatCurrency(data.totalAmountDisbursed) : "₱0.00"}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box
                sx={{
                  backgroundColor: "rgba(245, 158, 11, 0.05)",
                  borderRadius: 2,
                  p: 2,
                  border: "1px solid rgba(245, 158, 11, 0.1)",
                }}
              >
                <Typography variant="body2" color="#64748b" mb={1}>
                  Outstanding Balance
                </Typography>
                <Typography variant="h5" fontWeight="bold" color="#d97706">
                  {data ? formatCurrency(data.totalOutstandingCollection) : "₱0.00"}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* Main Content Card */}
        <Box px={3}>
          <Paper
            sx={{
              borderRadius: 3,
              border: "1px solid #e2e8f0",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
              overflow: "hidden",
            }}
          >

            {/* Tabs */}
            <Box sx={{ backgroundColor: "#ffffff" }}>
              <Tabs
                value={activeTab}
                onChange={handleTabChange}
                sx={{
                  px: 3,
                  "& .MuiTab-root": {
                    textTransform: "none",
                    fontWeight: 600,
                    color: "#64748b",
                    minHeight: 60,
                    fontSize: "0.95rem",
                    "&:hover": {
                      backgroundColor: "#f8fafc",
                    },
                  },
                  "& .Mui-selected": {
                    color: "#2563eb !important",
                    backgroundColor: "#f0f9ff",
                  },
                  "& .MuiTabs-indicator": {
                    backgroundColor: "#2563eb",
                    height: 3,
                    borderRadius: "2px 2px 0 0",
                  },
                }}
              >
                <Tab 
                  label={
                    <Box display="flex" alignItems="center" gap={1}>
                      <AccountBalance sx={{ fontSize: 20 }} />
                      <span>Portfolio Overview</span>
                      <Box
                        sx={{
                          backgroundColor: "#2563eb",
                          color: "white",
                          borderRadius: "12px",
                          px: 1,
                          py: 0.5,
                          fontSize: "0.75rem",
                          fontWeight: 600,
                        }}
                      >
                        {data?.centers.length || 0}
                      </Box>
                    </Box>
                  } 
                />
                <Tab 
                  label={
                    <Box display="flex" alignItems="center" gap={1}>
                      <TrendingUp sx={{ fontSize: 20 }} />
                      <span>Projected Income</span>
                    </Box>
                  } 
                />
              </Tabs>
            </Box>

          {/* Tab Content */}
          {activeTab === 0 && (
            <Box p={3}>
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

              {/* Portfolio Table */}
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
                      <TableCell sx={{ fontWeight: 700, color: "#374151", fontSize: "0.95rem" }}>
                        No.
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, color: "#374151", fontSize: "0.95rem" }}>
                        Center Name
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: "#374151", fontSize: "0.95rem" }}>
                        Amount Disbursed
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: "#374151", fontSize: "0.95rem" }}>
                        Outstanding Collection
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
                        <TableCell align="right" sx={{ color: "#374151", fontWeight: 600 }}>
                          <Typography
                            variant="body2"
                            sx={{
                              color: "#059669",
                              fontWeight: 700,
                              backgroundColor: "#ecfdf5",
                              px: 2,
                              py: 0.5,
                              borderRadius: 2,
                              display: "inline-block",
                            }}
                          >
                            {formatCurrency(center.amountDisbursed)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right" sx={{ color: "#374151", fontWeight: 600 }}>
                          <Typography
                            variant="body2"
                            sx={{
                              color: center.outstandingCollection > 0 ? "#dc2626" : "#059669",
                              fontWeight: 700,
                              backgroundColor: center.outstandingCollection > 0 ? "#fef2f2" : "#ecfdf5",
                              px: 2,
                              py: 0.5,
                              borderRadius: 2,
                              display: "inline-block",
                            }}
                          >
                            {formatCurrency(center.outstandingCollection)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}

                    {/* Total Row */}
                    <TableRow sx={{ backgroundColor: "#f1f5f9", borderTop: "2px solid #e2e8f0" }}>
                      <TableCell sx={{ fontWeight: "bold", color: "#1e293b", fontSize: "1rem" }}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="body1" fontWeight="bold">
                            Total
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ fontWeight: "bold", color: "#1e293b", fontSize: "1rem" }}>
                        <Typography variant="body1" fontWeight="bold">
                          {data.centers.length} Centers
                        </Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: "bold", color: "#1e293b", fontSize: "1rem" }}>
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
                          }}
                        >
                          {formatCurrency(data.totalAmountDisbursed)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: "bold", color: "#1e293b", fontSize: "1rem" }}>
                        <Typography
                          variant="body1"
                          sx={{
                            color: "#dc2626",
                            fontWeight: "bold",
                            backgroundColor: "#fef2f2",
                            px: 2,
                            py: 1,
                            borderRadius: 2,
                            display: "inline-block",
                          }}
                        >
                          {formatCurrency(data.totalOutstandingCollection)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

            {/* Projected Income Tab */}
            {activeTab === 1 && (
              <Box p={3}>
                <ProjectedIncomeView />
              </Box>
            )}
          </Paper>
        </Box>
      </Box>
    </DashboardLayout>
  )
}
