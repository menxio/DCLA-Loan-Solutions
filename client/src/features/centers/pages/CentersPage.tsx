import { useState } from "react";
import { 
  Box, 
  Typography, 
  Alert, 
  Snackbar, 
  Button, 
  Paper, 
  Pagination,
  Grid,
  Card,
  CardContent,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
} from "@mui/material";
import { Add, Groups, Search, Refresh, AccountBalance, TrendingUp, Assessment } from "@mui/icons-material";
import DashboardLayout from "@components/layout/PrivateLayout";
import CenterModal from "../components/CenterModal";
import CenterTable from "../components/CenterTable";
import { useCenters } from "../hooks/useCenters";
import type { Center, CenterFormData } from "../types";

export default function CentersPage() {
  const { centers, total, page, limit, setPage, loading, error, createCenter, updateCenter, deleteCenter } =
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
            <Groups sx={{ fontSize: 32 }} />
            <Box>
              <Typography variant="h4" fontWeight="bold" mb={1}>
                Centers Management
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9 }}>
                Manage centers and their information across the organization
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
                  {centers?.length || 0}
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
                  Total Members
                </Typography>
                       <Typography variant="h5" fontWeight="bold">
                         {centers?.length || 0}
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
              onClose={() => {
                // You might want to add error clearing functionality to the hook
              }}
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
                    <Groups sx={{ color: "white", fontSize: 24 }} />
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ color: "#1e293b", fontWeight: 700 }}>
                      Collection Centers
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {centers.length} of {total} center{total !== 1 ? "s" : ""} configured
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
                      value={limit} 
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
                    variant="contained"
                    startIcon={<Add />}
                    onClick={handleOpenModal}
                    sx={{
                      backgroundColor: "#2563eb",
                      textTransform: "none",
                      fontWeight: 600,
                      borderRadius: 2,
                      px: 3,
                      "&:hover": {
                        backgroundColor: "#1d4ed8",
                      },
                    }}
                  >
                    Add Center
                  </Button>
                </Box>
              </Box>
            </Box>

            {/* Centers Table */}
            <Box p={3}>
              <CenterTable
                centers={centers}
                onEdit={handleEdit}
                onDelete={handleDelete}
                loading={loading}
              />
              
              {/* Pagination */}
              <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
                <Pagination
                  count={Math.ceil(total / limit) || 1}
                  page={page}
                  onChange={(_, value) => setPage(value)}
                  color="primary"
                  sx={{
                    "& .MuiPaginationItem-root": {
                      borderRadius: 2,
                    },
                  }}
                />
              </Box>
            </Box>
          </Paper>
        </Box>

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
