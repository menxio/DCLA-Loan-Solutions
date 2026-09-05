import { useState, useEffect, Suspense, lazy } from "react";
import { useQuery } from "react-query";
import {
  Box,
  Typography,
  Alert,
  Snackbar,
  Button,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Pagination,
} from "@mui/material";
import { Add, Group } from "@mui/icons-material";
import DashboardLayout from "@components/layout/PrivateLayout";
import MemberCards from "./components/MemberCards";
import { useMembers } from "./hooks/useMember";
import type { Member, MemberFormData } from "./types";
import { CentersAPI } from "@features/centers/api";
import { centerKeys } from "@features/centers/hooks/useCenters";
import FullScreenLoader from "@components/common/FullScreenLoader";
import PageLoadingSkeleton from "@components/common/PageLoadingSkeleton";
import RequestErrorAlert from "@components/common/RequestErrorAlert";
import { useAuthStore } from "@features/auth/authStore";
import { canManageSavings } from "@features/auth/access";
import { getApiErrorMessage } from "@utils/apiError";

const MemberModal = lazy(() => import("./components/MemberModal"));
const LoanModal = lazy(() => import("@features/loans/components/LoanModal"));
const SavingsDepositDialog = lazy(
  () => import("@features/savings/components/SavingsDepositDialog"),
);

export default function MembersPage() {
  const role = useAuthStore((state) => state.user?.role ?? "");
  const savingsActionsAllowed = canManageSavings(role);
  const [selectedCenterId, setSelectedCenterId] = useState<string>("");
  const [searchMember, setSearchMember] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const {
    members,
    total,
    page,
    limit,
    setPage,
    loading,
    error,
    createMember,
    updateMember,
    deleteMember,
    refetch,
  } = useMembers({
    search: debouncedSearch || undefined,
    centerId: selectedCenterId || undefined,
  });
  const centersQuery = useQuery(
    centerKeys.options,
    ({ signal }) => CentersAPI.getOptions(signal),
    { staleTime: 5 * 60_000 },
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | undefined>(
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
  const [loanModalOpen, setLoanModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [savingsDialogOpen, setSavingsDialogOpen] = useState(false);
  const [savingsMember, setSavingsMember] = useState<Member | null>(null);
  const centers = centersQuery.data ?? [];
  const centersError = centersQuery.error
    ? `Center filters are unavailable. ${getApiErrorMessage(centersQuery.error)}`
    : null;

  useEffect(() => {
    setPage(1);
    const timer = setTimeout(
      () => setDebouncedSearch(searchMember.trim()),
      300,
    );
    return () => clearTimeout(timer);
  }, [searchMember, setPage]);

  const handleCenterFilterChange = (centerId: string) => {
    setSelectedCenterId(centerId);
    setPage(1);
  };

  const showSnackbar = (
    message: string,
    severity: "success" | "error" = "success",
  ) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleOpenModal = () => {
    setEditingMember(undefined);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingMember(undefined);
  };

  const handleFormSubmit = async (data: MemberFormData) => {
    try {
      if (editingMember) {
        await updateMember(editingMember.id, data);
        showSnackbar("Member updated successfully!");
      } else {
        await createMember(data);
        showSnackbar("Member created successfully!");
      }
    } catch (err) {
      console.error("Failed to save member:", err);
      showSnackbar(getApiErrorMessage(err), "error");
      throw err;
    }
  };

  const handleEdit = (member: Member) => {
    setEditingMember(member);
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMember(id);
      showSnackbar("Member deleted successfully!");
    } catch (err) {
      console.error("Failed to delete member:", err);
      showSnackbar(getApiErrorMessage(err), "error");
      throw err;
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const handleViewLoan = (member: Member) => {
    setSelectedMember(member);
    setLoanModalOpen(true);
  };

  const handleOpenSavingsDialog = (member: Member) => {
    setSavingsMember(member);
    setSavingsDialogOpen(true);
  };

  const handleCloseLoanModal = () => {
    setLoanModalOpen(false);
    setSelectedMember(null);
  };

  const handleCloseSavingsDialog = () => {
    setSavingsDialogOpen(false);
    setSavingsMember(null);
  };

  const handleLoanCreated = () => {
    showSnackbar("Loan created successfully!");
  };

  const formatCurrency = (amount: number): string =>
    `₱${Number(amount || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const handleSavingsSuccess = async () => {
    await refetch();
    showSnackbar("Savings deposit recorded!");
    handleCloseSavingsDialog();
  };

  // Use server-side filtered results directly
  const filteredMembers = members;

  if (loading && filteredMembers.length === 0) {
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
                <Group sx={{ fontSize: 28, color: "white" }} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  variant="h4"
                  fontWeight="bold"
                  color="#1e293b"
                  mb={1}
                >
                  Members
                </Typography>
                <Typography variant="body1" color="#64748b">
                  Members management and overview
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
              <FormControl
                size="small"
                sx={{
                  minWidth: { sm: 150 },
                  width: { xs: "100%", sm: "auto" },
                }}
              >
                <InputLabel id="member-center-filter-label">Center</InputLabel>
                <Select
                  labelId="member-center-filter-label"
                  value={selectedCenterId}
                  label="Center"
                  onChange={(e) => handleCenterFilterChange(e.target.value)}
                  MenuProps={{
                    anchorOrigin: {
                      vertical: "bottom",
                      horizontal: "left",
                    },
                    transformOrigin: {
                      vertical: "top",
                      horizontal: "left",
                    },
                    PaperProps: {
                      sx: {
                        maxHeight: { xs: 280, sm: 320 },
                        maxWidth: "calc(100vw - 32px)",
                        overflowY: "auto",
                      },
                    },
                  }}
                  sx={{
                    backgroundColor: "white",
                    borderRadius: 2,
                  }}
                >
                  <MenuItem value="">All Centers</MenuItem>
                  {centers.map((center) => (
                    <MenuItem key={center.id} value={center.id}>
                      {center.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                size="small"
                placeholder="Search by name"
                value={searchMember}
                onChange={(e) => setSearchMember(e.target.value)}
                sx={{
                  minWidth: { sm: 200 },
                  width: { xs: "100%", sm: "auto" },
                  "& .MuiOutlinedInput-root": {
                    backgroundColor: "white",
                    borderRadius: 2,
                  },
                }}
              />

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
                ADD MEMBER
              </Button>
            </Box>
          </Box>
        </Paper>
        {/* Error Alert */}
        {error && (
          <RequestErrorAlert message={error} onRetry={() => refetch()} />
        )}
        {centersError && (
          <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
            {centersError}
          </Alert>
        )}

        {/* Members Cards */}
        <MemberCards
          members={filteredMembers}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onViewLoan={handleViewLoan}
          onAddSavings={
            savingsActionsAllowed ? handleOpenSavingsDialog : undefined
          }
          loading={loading}
        />

        {/* Pagination Controls */}
        <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
          <Pagination
            count={Math.ceil(total / limit) || 1}
            page={page}
            onChange={(_, value) => setPage(value)}
            color="primary"
          />
        </Box>

        {/* Member Modal */}
        {modalOpen && (
          <Suspense fallback={<FullScreenLoader />}>
            <MemberModal
              open
              member={editingMember}
              onClose={handleCloseModal}
              onSubmit={handleFormSubmit}
              loading={loading}
            />
          </Suspense>
        )}

        {/* Loan Modal */}
        {selectedMember && (
          <Suspense fallback={<FullScreenLoader />}>
            <LoanModal
              open={loanModalOpen}
              member={selectedMember}
              onClose={handleCloseLoanModal}
              onLoanCreated={handleLoanCreated}
            />
          </Suspense>
        )}

        {/* Savings Deposit Dialog */}
        {savingsDialogOpen && (
          <Suspense fallback={<FullScreenLoader />}>
            <SavingsDepositDialog
              open
              member={savingsMember}
              onClose={handleCloseSavingsDialog}
              onSuccess={handleSavingsSuccess}
              formatCurrency={formatCurrency}
            />
          </Suspense>
        )}

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
