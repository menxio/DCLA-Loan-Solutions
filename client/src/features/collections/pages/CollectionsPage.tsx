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
} from "@mui/material";
import { Refresh, Assessment } from "@mui/icons-material";
import DashboardLayout from "@components/layout/PrivateLayout";
import DailyCollectionsView from "../components/DailyCollectionsView";
import CollectionUpdateModal from "../components/CollectionUpdateModal";
import { useCollections } from "../hooks/useCollections";
import type { Collection } from "../types";

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
    allCollections,
    loading,
    error,
    updateCollection,
    refetchDaily,
    refetchAll,
  } = useCollections();
  const [tabValue, setTabValue] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
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

  const handleEditCollection = (collection: Collection) => {
    setSelectedCollection(collection);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
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

  if (loading && dailyCollections.length === 0 && allCollections.length === 0) {
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
                "& .Mui-selected": {
                  color: "#1e3a8a",
                },
                "& .MuiTabs-indicator": {
                  backgroundColor: "#1e3a8a",
                  height: 3,
                },
              }}
            >
              <Tab label="Daily Collections" />
              <Tab label="All Collections" />
            </Tabs>
          </Box>

          {/* Daily Collections Tab */}
          <TabPanel value={tabValue} index={0}>
            <Box sx={{ p: 3 }}>
              <DailyCollectionsView
                data={dailyCollections}
                onEditCollection={handleEditCollection}
                loading={loading}
              />
            </Box>
          </TabPanel>

          {/* All Collections Tab */}
          <TabPanel value={tabValue} index={1}>
            <Box sx={{ p: 3 }}>
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
                    {allCollections.map((collection, index) => (
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
            </Box>
          </TabPanel>
        </Paper>

        {/* Collection Update Modal */}
        <CollectionUpdateModal
          open={modalOpen}
          collection={selectedCollection}
          onClose={handleCloseModal}
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
