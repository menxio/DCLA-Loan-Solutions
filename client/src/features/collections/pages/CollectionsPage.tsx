import type React from "react";

import { useState } from "react";
import {
  Box,
  Typography,
  Alert,
  Snackbar,
  Button,
  Paper,
  Tabs,
  Tab,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  Pagination,
  Grid,
  Card,
  CardContent,
  FormControl,
} from "@mui/material";
import { Refresh, Assessment, Search, AccountBalance, TrendingUp, Groups, Download } from "@mui/icons-material";
import DashboardLayout from "@components/layout/PrivateLayout";
import DailyCollectionsView from "../components/DailyCollectionsView";
import CollectionDetailsModal from "../components/CollectionDetailsModal";
import CollectionUpdateModal from "../components/CollectionUpdateModal";
import { useCollections } from "../hooks/useCollections";
import type { Collection, DailyCollectionGroup } from "../types";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`collections-tabpanel-${index}`}
      aria-labelledby={`collections-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export default function CollectionsPage() {
  const {
    dailyCollections,
    items,
    loading,
    error,
    updateCollection,
    refetchDaily,
    refetchAll,
    // pagination/filter state
    page,
    limit,
    total,
    totalPages,
    setPage,
    setLimit,
    search,
    setSearch,
  } = useCollections();
  const [tabValue, setTabValue] = useState(0);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [selectedCollectionGroup, setSelectedCollectionGroup] = useState<
    DailyCollectionGroup | undefined
  >(undefined);
  const [selectedCollection, setSelectedCollection] = useState<
    Collection | undefined
  >(undefined);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({
    open: false,
    message: "",
    severity: "success",
  });

  const showSnackbar = (
    message: string,
    severity: "success" | "error" = "success"
  ) => {
    setSnackbar({
      open: true,
      message,
      severity,
    });
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleViewDetails = (group: DailyCollectionGroup) => {
    setSelectedCollectionGroup(group);
    setDetailsModalOpen(true);
  };

  const handleCloseDetailsModal = () => {
    setDetailsModalOpen(false);
    setSelectedCollectionGroup(undefined);
  };

  const handleEditCollection = (collection: Collection) => {
    setSelectedCollection(collection);
    setUpdateModalOpen(true);
  };

  const handleCloseUpdateModal = () => {
    setUpdateModalOpen(false);
    setSelectedCollection(undefined);
  };

  const handleUpdateCollection = async (
    id: string,
    data: { paymentReceived: number; notes?: string }
  ) => {
    try {
      await updateCollection(id, data);
      showSnackbar("Collection updated successfully!");
    } catch (err) {
      showSnackbar("Failed to update collection. Please try again.", "error");
      throw err;
    }
  };

  const handleRefresh = async () => {
    try {
      if (tabValue === 0) {
        await refetchDaily();
      } else {
        await refetchAll();
      }
      showSnackbar("Data refreshed successfully!");
    } catch (err) {
      showSnackbar("Failed to refresh data. Please try again.", "error");
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const getStatusColor = (collection: Collection) => {
    if (collection.paymentReceived >= collection.amount) return "success";
    if (collection.paymentReceived > 0) return "warning";
    return "error";
  };

  const getStatusLabel = (collection: Collection) => {
    if (collection.paymentReceived >= collection.amount) return "PAID";
    if (collection.paymentReceived > 0) return "PARTIAL";
    return "PENDING";
  };

  if (
    loading &&
    (dailyCollections?.length ?? 0) === 0 &&
    (items?.length ?? 0) === 0
  ) {
    return (
      <DashboardLayout>
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "400px",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <CircularProgress size={40} />
          <Typography variant="body1" color="text.secondary">
            Loading collections...
          </Typography>
        </Box>
      </DashboardLayout>
    );
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
            <Assessment sx={{ fontSize: 32 }} />
            <Box>
              <Typography variant="h4" fontWeight="bold" mb={1}>
                Collections Management
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9 }}>
                Track and manage daily collections across all centers
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
                  Daily Collections
                </Typography>
                <Typography variant="h5" fontWeight="bold">
                  {dailyCollections?.length || 0}
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
                  Total Collections
                </Typography>
                <Typography variant="h5" fontWeight="bold">
                  {total || 0}
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
                  Active Centers
                </Typography>
                <Typography variant="h5" fontWeight="bold">
                  {dailyCollections?.length || 0}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Box>

        {/* Error Alert */}
        {error && (
          <Box px={3}>
            <Alert
              severity="error"
              sx={{ mb: 3, borderRadius: 2 }}
              onClose={() => {}}
            >
              {error}
            </Alert>
          </Box>
        )}

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
                    <Assessment sx={{ color: "white", fontSize: 24 }} />
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ color: "#1e293b", fontWeight: 700 }}>
                      Collection Analytics
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Monitor payment status and collection progress across centers
                    </Typography>
                  </Box>
                </Box>
                <Box display="flex" alignItems="center" gap={2}>
                  <TextField
                    size="small"
                    placeholder={
                      tabValue === 0
                        ? "Search centers..."
                        : "Search centers/members..."
                    }
                    value={search || ""}
                    onChange={(e) => setSearch(e.target.value)}
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
                      value={limit} 
                      onChange={(e) => setLimit(Number(e.target.value))}
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
                    onClick={handleRefresh}
                    disabled={loading}
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
                value={tabValue}
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
                      <Groups sx={{ fontSize: 20 }} />
                      <span>Daily Collections</span>
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
                        {dailyCollections?.length || 0}
                      </Box>
                    </Box>
                  } 
                />
                <Tab 
                  label={
                    <Box display="flex" alignItems="center" gap={1}>
                      <AccountBalance sx={{ fontSize: 20 }} />
                      <span>All Collections</span>
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
                        {total || 0}
                      </Box>
                    </Box>
                  } 
                />
              </Tabs>
            </Box>

          {/* Daily Collections Tab */}
          <TabPanel value={tabValue} index={0}>
            <Box sx={{ p: 3 }}>
              {dailyCollections?.length === 0 && search ? (
                <Paper
                  sx={{
                    textAlign: "center",
                    py: 6,
                    background:
                      "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <Search sx={{ fontSize: 64, color: "#94a3b8", mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    No centers found matching "{search}"
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Try adjusting your search terms or check for typos.
                  </Typography>
                </Paper>
              ) : (
                <DailyCollectionsView
                  data={dailyCollections ?? []}
                  onViewDetails={handleViewDetails}
                  loading={loading}
                />
              )}
            </Box>
          </TabPanel>

          {/* All Collections Tab */}
          <TabPanel value={tabValue} index={1}>
            <Box sx={{ p: 3 }}>
              {(items ?? []).length === 0 && search ? (
                <Paper
                  sx={{
                    textAlign: "center",
                    py: 6,
                    background:
                      "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <Search sx={{ fontSize: 64, color: "#94a3b8", mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    No collections found matching "{search}"
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Try adjusting your search terms or check for typos.
                  </Typography>
                </Paper>
              ) : (
                <>
                  <TableContainer
                    sx={{
                      borderRadius: 3,
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                      overflow: "hidden",
                    }}
                  >
                    <Table>
                      <TableHead sx={{ backgroundColor: "#f8fafc" }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700, color: "#374151", fontSize: "0.95rem" }}>
                            Date
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700, color: "#374151", fontSize: "0.95rem" }}>
                            Center
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700, color: "#374151", fontSize: "0.95rem" }}>
                            Member
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700, color: "#374151", fontSize: "0.95rem" }}>
                            Amount
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700, color: "#374151", fontSize: "0.95rem" }}>
                            Received
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700, color: "#374151", fontSize: "0.95rem" }}>
                            Balance
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700, color: "#374151", fontSize: "0.95rem" }}>
                            Status
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700, color: "#374151", fontSize: "0.95rem" }}>
                            Notes
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(items ?? []).map((collection, index) => (
                          <TableRow
                            key={collection.id}
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
                            <TableCell sx={{ color: "#374151", fontWeight: 500 }}>
                              {collection.collectionDate}
                            </TableCell>
                            <TableCell sx={{ color: "#374151", fontWeight: 500 }}>
                              {collection.center?.name}
                            </TableCell>
                            <TableCell sx={{ color: "#374151", fontWeight: 500 }}>
                              <Typography
                                variant="body2"
                                sx={{ fontWeight: 600 }}
                              >
                                {collection.member?.firstName}{" "}
                                {collection.member?.lastName}
                              </Typography>
                            </TableCell>
                            <TableCell sx={{ color: "#374151", fontWeight: 500 }}>
                              <Typography
                                variant="body2"
                                sx={{
                                  fontWeight: 700,
                                  color: "#059669",
                                  backgroundColor: "#ecfdf5",
                                  px: 2,
                                  py: 0.5,
                                  borderRadius: 2,
                                  display: "inline-block",
                                }}
                              >
                                ₱{collection.amount.toLocaleString()}
                              </Typography>
                            </TableCell>
                            <TableCell sx={{ color: "#374151", fontWeight: 500 }}>
                              <Typography
                                variant="body2"
                                sx={{
                                  fontWeight: 700,
                                  color: "#2563eb",
                                  backgroundColor: "#f0f9ff",
                                  px: 2,
                                  py: 0.5,
                                  borderRadius: 2,
                                  display: "inline-block",
                                }}
                              >
                                ₱{collection.paymentReceived.toLocaleString()}
                              </Typography>
                            </TableCell>
                            <TableCell sx={{ color: "#374151", fontWeight: 500 }}>
                              <Typography
                                variant="body2"
                                sx={{
                                  fontWeight: 700,
                                  color: collection.paymentReceived >= collection.amount ? "#059669" : "#dc2626",
                                  backgroundColor: collection.paymentReceived >= collection.amount ? "#ecfdf5" : "#fef2f2",
                                  px: 2,
                                  py: 0.5,
                                  borderRadius: 2,
                                  display: "inline-block",
                                }}
                              >
                                ₱{(collection.amount - collection.paymentReceived).toLocaleString()}
                              </Typography>
                            </TableCell>
                            <TableCell sx={{ color: "#374151", fontWeight: 500 }}>
                              <Chip
                                label={getStatusLabel(collection)}
                                color={getStatusColor(collection)}
                                size="small"
                                sx={{ 
                                  fontWeight: 600,
                                  borderRadius: 2,
                                }}
                              />
                            </TableCell>
                            <TableCell sx={{ color: "#374151", fontWeight: 500 }}>
                              <Typography
                                variant="body2"
                                sx={{
                                  maxWidth: 150,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {collection.notes || "-"}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      mt: 2,
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      Showing {items?.length ?? 0} of {total} records
                    </Typography>
                    <Pagination
                      page={page}
                      count={totalPages}
                      onChange={(_, p) => setPage(p)}
                      color="primary"
                    />
                  </Box>
                </>
              )}
            </Box>
          </TabPanel>
          </Paper>
        </Box>

        {/* Collection Details Modal */}
        <CollectionDetailsModal
          open={detailsModalOpen}
          collectionGroup={selectedCollectionGroup}
          onClose={handleCloseDetailsModal}
          onDataChanged={async () => {
            try {
              await refetchDaily();
              await refetchAll();
            } catch {}
          }}
          onEditCollection={handleEditCollection}
        />

        {/* Collection Update Modal */}
        <CollectionUpdateModal
          open={updateModalOpen}
          collection={selectedCollection}
          onClose={handleCloseUpdateModal}
          onSubmit={handleUpdateCollection}
          loading={loading}
        />

        {/* Success/Error Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        >
          <Alert
            onClose={handleCloseSnackbar}
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
