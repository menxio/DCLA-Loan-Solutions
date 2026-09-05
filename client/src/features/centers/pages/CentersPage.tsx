import { useState } from "react";
import {
  Box,
  Typography,
  Alert,
  Snackbar,
  Button,
  Paper,
  Pagination,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
} from "@mui/material";
import { Add, Groups, Search } from "@mui/icons-material";
import DashboardLayout from "@components/layout/PrivateLayout";
import PageLoadingSkeleton from "@components/common/PageLoadingSkeleton";
import RequestErrorAlert from "@components/common/RequestErrorAlert";
import CenterModal from "../components/CenterModal";
import CenterTable from "../components/CenterTable";
import { useCenters } from "../hooks/useCenters";
import type { Center, CenterFormData } from "../types";
import { getApiErrorMessage } from "@utils/apiError";

export default function CentersPage() {
  const {
    centers,
    total,
    page,
    limit,
    setPage,
    setLimit,
    search,
    setSearch,
    loading,
    error,
    createCenter,
    updateCenter,
    deleteCenter,
    refetch,
  } = useCenters();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCenter, setEditingCenter] = useState<Center | undefined>(
    undefined,
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
    severity: "success" | "error" = "success",
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
      console.error("Failed to save center:", err);
      showSnackbar(getApiErrorMessage(err), "error");
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
      console.error("Failed to delete center:", err);
      showSnackbar(getApiErrorMessage(err), "error");
      throw err;
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  if (loading && centers.length === 0) {
    return (
      <DashboardLayout>
        <PageLoadingSkeleton
          showStats={false}
          filterCount={3}
          rowCount={limit}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Box
        sx={{
          backgroundColor: "#f8fafc",
          minHeight: "100vh",
          minWidth: 0,
          maxWidth: "100%",
        }}
      >
        {/* Header Section */}
        <Paper
          sx={{
            background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
            border: "1px solid #e2e8f0",
            borderRadius: 3,
            p: { xs: 2, sm: 4 },
            mb: 3,
            boxShadow:
              "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: { xs: "stretch", md: "center" },
              flexDirection: { xs: "column", md: "row" },
              gap: 2,
              mb: 3,
              minWidth: 0,
            }}
          >
            {/* Left side - Title and Description */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: { xs: 1.5, sm: 3 },
                minWidth: 0,
              }}
            >
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: 2,
                  background:
                    "linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 14px 0 rgba(59, 130, 246, 0.3)",
                  flexShrink: 0,
                }}
              >
                <Groups sx={{ fontSize: 28, color: "white" }} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  variant="h4"
                  fontWeight="bold"
                  color="#1e293b"
                  mb={1}
                >
                  Collection Centers
                </Typography>
                <Typography variant="body1" color="#64748b">
                  Centers management and overview
                </Typography>
              </Box>
            </Box>

            {/* Right side - Controls */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                flexDirection: { xs: "column", sm: "row" },
                gap: 2,
                width: { xs: "100%", md: "auto" },
                minWidth: 0,
              }}
            >
              <TextField
                size="small"
                placeholder="Search centers..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search sx={{ color: "#64748b", fontSize: 20 }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  minWidth: { sm: 200 },
                  width: { xs: "100%", sm: "auto" },
                  "& .MuiOutlinedInput-root": {
                    backgroundColor: "white",
                    borderRadius: 2,
                  },
                }}
              />

              <FormControl
                size="small"
                sx={{ width: { xs: "100%", sm: "auto" } }}
              >
                <Select
                  value={limit}
                  onChange={(event) => {
                    setPage(1);
                    setLimit(Number(event.target.value));
                  }}
                  sx={{
                    minWidth: 80,
                    backgroundColor: "white",
                    borderRadius: 2,
                  }}
                >
                  <MenuItem value={3}>3</MenuItem>
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
                  background:
                    "linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)",
                  borderRadius: 2,
                  px: 3,
                  py: 1.5,
                  textTransform: "none",
                  fontWeight: 600,
                  boxShadow: "0 4px 14px 0 rgba(59, 130, 246, 0.3)",
                  width: { xs: "100%", sm: "auto" },
                  "&:hover": {
                    background:
                      "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                    boxShadow: "0 6px 20px 0 rgba(59, 130, 246, 0.4)",
                  },
                }}
              >
                Add Center
              </Button>
            </Box>
          </Box>
        </Paper>

        {/* Error Alert */}
        {error && (
          <Box sx={{ px: { xs: 0, sm: 3 }, minWidth: 0, maxWidth: "100%" }}>
            <RequestErrorAlert message={error} onRetry={() => refetch()} />
          </Box>
        )}

        {/* Main Content Card */}
        <Box sx={{ px: { xs: 0, sm: 3 }, minWidth: 0, maxWidth: "100%" }}>
          <Paper
            sx={{
              borderRadius: 3,
              border: "1px solid #e2e8f0",
              boxShadow:
                "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
              overflow: "hidden",
            }}
          >
            {/* Centers Table */}
            <Box sx={{ p: { xs: 1.5, sm: 3 }, minWidth: 0, maxWidth: "100%" }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 2,
                  mb: 2,
                  flexWrap: "wrap",
                }}
              ></Box>
              <CenterTable
                centers={centers}
                onEdit={handleEdit}
                onDelete={handleDelete}
                loading={loading}
              />
              <Box
                sx={{
                  mt: 3,
                  display: "flex",
                  justifyContent: "center",
                }}
              >
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
