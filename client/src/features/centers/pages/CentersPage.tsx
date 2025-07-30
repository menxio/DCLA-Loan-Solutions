import { useState } from "react";
import { Box, Typography, Alert, Snackbar, Button, Paper } from "@mui/material";
import { Add, Groups } from "@mui/icons-material";
import DashboardLayout from "@components/layout/PrivateLayout";
import CenterModal from "../components/CenterModal";
import CenterTable from "../components/CenterTable";
import { useCenters } from "../hooks/useCenters";
import type { Center, CenterFormData } from "../types";

export default function CentersPage() {
  const { centers, loading, error, createCenter, updateCenter, deleteCenter } =
    useCenters();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCenter, setEditingCenter] = useState<Center | undefined>(
    undefined
  );
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

  const handleOpenModal = () => {
    setEditingCenter(undefined);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingCenter(undefined);
  };

  const handleFormSubmit = async (data: CenterFormData) => {
    try {
      if (editingCenter) {
        await updateCenter(editingCenter.id, data);
        showSnackbar("Center updated successfully!");
      } else {
        await createCenter(data);
        showSnackbar("Center created successfully!");
      }
    } catch (err) {
      showSnackbar("Failed to save center. Please try again.", "error");
      throw err;
    }
  };

  const handleEdit = (center: Center) => {
    setEditingCenter(center);
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCenter(id);
      showSnackbar("Center deleted successfully!");
    } catch (err) {
      showSnackbar("Failed to delete center. Please try again.", "error");
      throw err;
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

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
            Centers Management
          </Typography>
          <Typography
            variant="h6"
            color="text.secondary"
            sx={{ fontWeight: 400 }}
          >
            Manage your collection centers and their schedules
          </Typography>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert
            severity="error"
            sx={{ mb: 3, borderRadius: 2 }}
            onClose={() => {
              // You might want to add error clearing functionality to the hook
            }}
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
            <Groups sx={{ color: "#1e3a8a", fontSize: 28 }} />
            <Box>
              <Typography
                variant="h6"
                sx={{ fontWeight: 600, color: "#1e293b" }}
              >
                Collection Centers
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {centers.length} center{centers.length !== 1 ? "s" : ""}{" "}
                configured
              </Typography>
            </Box>
          </Box>

          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleOpenModal}
            sx={{
              background: "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)",
              "&:hover": {
                background: "linear-gradient(135deg, #1e40af 0%, #2563eb 100%)",
              },
              px: 3,
              py: 1.5,
              fontWeight: 600,
            }}
          >
            Add Center
          </Button>
        </Paper>

        {/* Centers Table */}
        <CenterTable
          centers={centers}
          onEdit={handleEdit}
          onDelete={handleDelete}
          loading={loading}
        />

        {/* Center Modal */}
        <CenterModal
          open={modalOpen}
          center={editingCenter}
          onClose={handleCloseModal}
          onSubmit={handleFormSubmit}
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
