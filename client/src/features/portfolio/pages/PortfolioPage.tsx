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
  Card,
  CardContent,
  Tabs,
  Tab,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
} from "@mui/material"
import { Download, TrendingUp, AccountBalance, Refresh, Search, BarChart, Assessment } from "@mui/icons-material"
import DashboardLayout from "@components/layout/PrivateLayout"
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
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress sx={{ color: "#2563eb" }} />
        </Box>
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
        <Box
          sx={{
            background: "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)",
            color: "white",
            p: 4,
            mb: 3,
          }}
        >
          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <BarChart sx={{ fontSize: 32 }} />
            <Box>
              <Typography variant="h4" fontWeight="bold" mb={1}>
                Portfolio Management
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9 }}>
                Track and manage loan disbursements and collections across all centers
              </Typography>
            </Box>
          </Box>
          
          {/* Quick Stats */}
          <Grid container spacing={2} mt={2}>
            <Grid item xs={12} sm={4}>
              <Box
                sx={{
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  borderRadius: 2,
                  p: 2,
                  backdropFilter: "blur(10px)",
                }}
              >
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  Total Centers
                </Typography>
                <Typography variant="h5" fontWeight="bold">
                  {data?.centers.length || 0}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box
                sx={{
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  borderRadius: 2,
                  p: 2,
                  backdropFilter: "blur(10px)",
                }}
              >
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  Total Disbursed
                </Typography>
                <Typography variant="h5" fontWeight="bold">
                  {data ? formatCurrency(data.totalAmountDisbursed) : "₱0.00"}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box
                sx={{
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  borderRadius: 2,
                  p: 2,
                  backdropFilter: "blur(10px)",
                }}
              >
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  Outstanding Balance
                </Typography>
                <Typography variant="h5" fontWeight="bold">
                  {data ? formatCurrency(data.totalOutstandingCollection) : "₱0.00"}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Box>

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
            {/* Card Header */}
            <Box
              sx={{
                background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
                p: 3,
                borderBottom: "1px solid #e2e8f0",
              }}
            >
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
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
                    <BarChart sx={{ color: "white", fontSize: 24 }} />
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ color: "#1e293b", fontWeight: 700 }}>
                      Portfolio Analytics
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Comprehensive view of loan disbursements and collections
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
                      width: 250,
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 2,
                      }
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
            </Box>

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
              {/* Summary Cards */}
              <Grid container spacing={3} mb={4}>
                <Grid item xs={12} md={4}>
                  <Card 
                    sx={{ 
                      border: "1px solid #e2e8f0", 
                      boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                      borderRadius: 3,
                      background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)",
                      borderLeft: "4px solid #2563eb",
                      transition: "all 0.3s ease",
                      "&:hover": {
                        transform: "translateY(-2px)",
                        boxShadow: "0 4px 12px rgba(37, 99, 235, 0.15)",
                      }
                    }}
                  >
                    <CardContent>
                      <Box display="flex" alignItems="center" gap={2} mb={2}>
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
                          <AccountBalance sx={{ color: "white", fontSize: 20 }} />
                        </Box>
                        <Typography variant="body2" color="text.secondary" fontWeight={600}>
                          Total Amount Disbursed
                        </Typography>
                      </Box>
                      <Typography variant="h4" sx={{ color: "#1e293b", fontWeight: "bold" }}>
                        {formatCurrency(data.totalAmountDisbursed)}
                      </Typography>
                      <Typography variant="body2" color="success.main" sx={{ mt: 1, fontWeight: 600 }}>
                        ✓ Active Loans
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={4}>
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
                      }
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
                          <TrendingUp sx={{ color: "white", fontSize: 20 }} />
                        </Box>
                        <Typography variant="body2" color="text.secondary" fontWeight={600}>
                          Outstanding Collection
                        </Typography>
                      </Box>
                      <Typography variant="h4" sx={{ color: "#1e293b", fontWeight: "bold" }}>
                        {formatCurrency(data.totalOutstandingCollection)}
                      </Typography>
                      <Typography variant="body2" color="warning.main" sx={{ mt: 1, fontWeight: 600 }}>
                        ⚠ Pending Collection
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={4}>
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
                      }
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
                          <Assessment sx={{ color: "white", fontSize: 20 }} />
                        </Box>
                        <Typography variant="body2" color="text.secondary" fontWeight={600}>
                          Collection Rate
                        </Typography>
                      </Box>
                      <Typography variant="h4" sx={{ color: "#1e293b", fontWeight: "bold" }}>
                        {((data.totalOutstandingCollection / data.totalAmountDisbursed) * 100).toFixed(1)}%
                      </Typography>
                      <Typography variant="body2" color="success.main" sx={{ mt: 1, fontWeight: 600 }}>
                        📊 Performance Metric
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
