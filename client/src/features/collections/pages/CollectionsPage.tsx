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
  TextField,
  InputAdornment,
  Skeleton,
} from "@mui/material";
import {
  Refresh,
  Assessment,
  Search,
  AccountBalance,
  Groups,
} from "@mui/icons-material";
import DashboardLayout from "@components/layout/PrivateLayout";
import PageLoadingSkeleton from "@components/common/PageLoadingSkeleton";
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

function CollectionsTabSkeleton() {
  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 2,
          flexWrap: "wrap",
          mb: 3,
        }}
      >
        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
          <Skeleton variant="rounded" width={150} height={44} />
          <Skeleton variant="rounded" width={150} height={44} />
          <Skeleton variant="rounded" width={150} height={44} />
        </Box>
        <Skeleton variant="rounded" width={190} height={44} />
      </Box>
      {Array.from({ length: 3 }).map((_, index) => (
        <Paper
          key={index}
          sx={{
            mb: 4,
            border: "1px solid #e2e8f0",
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              p: 3,
              backgroundColor: "#eff6ff",
            }}
          >
            <Skeleton variant="text" width="35%" height={38} />
            <Skeleton variant="text" width="25%" height={24} />
          </Box>
          <Box sx={{ p: 3 }}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 2,
                mb: 3,
              }}
            >
              {Array.from({ length: 4 }).map((__, statIndex) => (
                <Skeleton
                  key={statIndex}
                  variant="rounded"
                  height={92}
                />
              ))}
            </Box>
            <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
              <Skeleton variant="rounded" width={150} height={42} />
            </Box>
          </Box>
        </Paper>
      ))}
    </Box>
  );
}

export default function CollectionsPage() {
  const {
    dailyCollections,
    allCollections,
    loading,
    loadingDaily,
    loadingAll,
    error,
    updateCollection,
    refetchDaily,
    refetchAll,
    search,
    setSearch,
    allDate,
    setAllDate,
  } = useCollections();
  const [tabValue, setTabValue] = useState(0);
  const [tabSkeleton, setTabSkeleton] = useState<0 | 1 | null>(null);
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

  const handleTabChange = async (
    event: React.SyntheticEvent,
    newValue: number
  ) => {
    setTabValue(newValue);

    if (newValue === 0 && dailyCollections.length === 0) {
      setTabSkeleton(0);
      try {
        await refetchDaily();
      } catch (err) {
        console.error("Failed to refresh daily collections", err);
      } finally {
        setTabSkeleton((current) => (current === 0 ? null : current));
      }
    }

    if (newValue === 1 && allCollections.length === 0) {
      setTabSkeleton(1);
      try {
        await refetchAll();
      } catch (err) {
        console.error("Failed to refresh all collections", err);
      } finally {
        setTabSkeleton((current) => (current === 1 ? null : current));
      }
    }
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
      console.error("Failed to update collection", err);
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
      console.error("Failed to refresh collections", err);
      showSnackbar("Failed to refresh data. Please try again.", "error");
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const handleDateChange = (value: string) => {
    if (!value) return;
    setAllDate(value);
  };

  if (loading && dailyCollections.length === 0 && allCollections.length === 0) {
    return (
      <DashboardLayout>
        <PageLoadingSkeleton showStats={false} showTabs filterCount={3} rowCount={8} />
      </DashboardLayout>
    );
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
                <Assessment sx={{ fontSize: 28, color: "white" }} />
              </Box>
              <Box>
                <Typography variant="h4" fontWeight="bold" color="#1e293b" mb={1}>
                  Collection Analytics
                </Typography>
                <Typography variant="body1" color="#64748b">
                  Monitor payment status and collection progress across centers
                </Typography>
              </Box>
            </Box>

            {/* Right side - Controls */}
            <Box display="flex" alignItems="center" gap={2}>
              {tabValue === 1 && (
                <TextField
                  size="small"
                  type="date"
                  label="Collection Date"
                  value={allDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      backgroundColor: "white",
                      borderRadius: 2,
                    },
                  }}
                />
              )}
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
                  minWidth: 200,
                  "& .MuiOutlinedInput-root": {
                    backgroundColor: "white",
                    borderRadius: 2,
                  },
                }}
              />
              
              <Button
                variant="contained"
                startIcon={<Refresh />}
                onClick={handleRefresh}
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
        </Paper>

        {/* Error Alert */}
        {error && (
          <Box px={3}>
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
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
                        {dailyCollections.length}
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
                        {allCollections.length}
                      </Box>
                    </Box>
                  } 
                />
              </Tabs>
            </Box>

          {/* Daily Collections Tab */}
          <TabPanel value={tabValue} index={0}>
            <Box sx={{ p: 3 }}>
              {(tabSkeleton === 0 || loadingDaily) &&
              dailyCollections.length === 0 ? (
                <CollectionsTabSkeleton />
              ) : dailyCollections?.length === 0 && search ? (
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
              {(tabSkeleton === 1 || loadingAll) &&
              allCollections.length === 0 ? (
                <CollectionsTabSkeleton />
              ) : allCollections.length === 0 && search ? (
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
                  data={allCollections}
                  onViewDetails={handleViewDetails}
                  loading={loading}
                />
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
            } catch (error) {
              console.warn("Failed to refresh collections", error);
            }
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
