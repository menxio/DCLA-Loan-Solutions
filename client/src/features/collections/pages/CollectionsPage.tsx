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
} from "@mui/material";
import { Refresh, Assessment, Search } from "@mui/icons-material";
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
      <Box sx={{ maxWidth: 1400, mx: "auto" }}>
        {/* Page Header */}
        <Box sx={{ mb: 4 }}>
          <Typography
            variant="h3"
            component="h1"
            gutterBottom
            sx={{
              fontWeight: 700,
              background: "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Collections Management
          </Typography>
          <Typography
            variant="h6"
            color="text.secondary"
            sx={{ fontWeight: 400 }}
          >
            Track and manage daily collections across all centers
          </Typography>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert
            severity="error"
            sx={{ mb: 3, borderRadius: 2 }}
            onClose={() => {}}
          >
            {error}
          </Alert>
        )}

        {/* Action Bar */}
        <Paper
          sx={{
            p: 3,
            mb: 3,
            background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
            border: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Assessment sx={{ color: "#1e3a8a", fontSize: 28 }} />
            <Box>
              <Typography
                variant="h6"
                sx={{ fontWeight: 600, color: "#1e293b" }}
              >
                Collection Overview
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Monitor payment status and collection progress
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <TextField
              size="small"
              placeholder={tabValue === 0 ? "Search centers..." : "Search centers/members..."}
              value={search || ""}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search fontSize="small" />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 200 }}
            />
            <Select
              size="small"
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
            >
              <MenuItem value={10}>10</MenuItem>
              <MenuItem value={25}>25</MenuItem>
              <MenuItem value={50}>50</MenuItem>
            </Select>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={handleRefresh}
              disabled={loading}
              sx={{
                borderColor: "#1e3a8a",
                color: "#1e3a8a",
                "&:hover": {
                  borderColor: "#1e40af",
                  backgroundColor: "#f0f9ff",
                },
              }}
            >
              Refresh
            </Button>
          </Box>
        </Paper>

        {/* Tabs */}
        <Paper
          sx={{
            background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
            border: "1px solid #e2e8f0",
            overflow: "hidden",
          }}
        >
          <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              sx={{
                px: 3,
                "& .MuiTab-root": {
                  fontWeight: 600,
                  textTransform: "none",
                  fontSize: "1rem",
                },
                "& .Mui-selected": { color: "#1e3a8a" },
                "& .MuiTabs-indicator": {
                  backgroundColor: "#1e3a8a",
                  height: 3,
                },
              }}
            >
              <Tab label={`Daily Collections ${dailyCollections?.length > 0 ? `(${dailyCollections.length})` : ''}`} />
              <Tab label={`All Collections ${total > 0 ? `(${total})` : ''}`} />
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
                    background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
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
                    background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
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
                  <TableContainer>
                    <Table>
                      <TableHead sx={{ backgroundColor: "#f8fafc" }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600, color: "#1e293b" }}>
                            Date
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600, color: "#1e293b" }}>
                            Center
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600, color: "#1e293b" }}>
                            Member
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600, color: "#1e293b" }}>
                            Amount
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600, color: "#1e293b" }}>
                            Received
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600, color: "#1e293b" }}>
                            Balance
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600, color: "#1e293b" }}>
                            Status
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600, color: "#1e293b" }}>
                            Notes
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(items ?? []).map((collection, index) => (
                          <TableRow
                            key={collection.id}
                            sx={{
                              "&:hover": { backgroundColor: "#f8fafc" },
                              backgroundColor:
                                index % 2 === 0 ? "#ffffff" : "#fafbfc",
                            }}
                          >
                            <TableCell>{collection.collectionDate}</TableCell>
                            <TableCell>{collection.center?.name}</TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {collection.member?.firstName}{" "}
                                {collection.member?.lastName}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                ₱{collection.amount.toLocaleString()}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                ₱{collection.paymentReceived.toLocaleString()}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography
                                variant="body2"
                                sx={{
                                  fontWeight: 600,
                                  color:
                                    collection.paymentReceived >= collection.amount
                                      ? "#10b981"
                                      : "#ef4444",
                                }}
                              >
                                ₱
                                {(
                                  collection.amount - collection.paymentReceived
                                ).toLocaleString()}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={getStatusLabel(collection)}
                                color={getStatusColor(collection)}
                                size="small"
                                sx={{ fontWeight: 600 }}
                              />
                            </TableCell>
                            <TableCell>
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

        {/* Collection Details Modal */}
        <CollectionDetailsModal
          open={detailsModalOpen}
          collectionGroup={selectedCollectionGroup}
          onClose={handleCloseDetailsModal}
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