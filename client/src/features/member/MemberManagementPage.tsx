import { useState, useEffect } from "react";
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
  Grid,
  Card,
  CardContent,
  InputAdornment,
} from "@mui/material";
import { Add, Group, FilterList, Person } from "@mui/icons-material";
import DashboardLayout from "@components/layout/PrivateLayout";
import MemberModal from "./components/MemberModal";
import MemberCards from "./components/MemberCards";
import LoanModal from "@features/loans/components/LoanModal";
import { useMembers } from "./hooks/useMember";
import type { Member, MemberFormData } from "./types";
import type { Center } from "@features/centers/types";
import { CentersAPI } from "@features/centers/api";
import SavingsDepositDialog from "@features/savings/components/SavingsDepositDialog";

export default function MembersPage() {
  const { members, total, page, limit, setPage, setLimit, loading, error, createMember, updateMember, deleteMember, refetch } = useMembers();
  
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | undefined>(undefined);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({
    open: false,
    message: "",
    severity: "success",
  });
  const [centers, setCenters] = useState<Center[]>([]);
  const [selectedCenterId, setSelectedCenterId] = useState<string>("");
  const [loadingCenters, setLoadingCenters] = useState(false);
  const [loanModalOpen, setLoanModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [savingsDialogOpen, setSavingsDialogOpen] = useState(false);
  const [savingsMember, setSavingsMember] = useState<Member | null>(null);
  const [searchMember, setSearchMember] = useState("");

  // Reset to page 1 and refetch when filters change
  useEffect(() => {
    setPage(1);
  }, [selectedCenterId, searchMember, setPage]);

  // Refetch whenever filters, page, or limit change (server-side filtering)
  useEffect(() => {
    const query = {
      page,
      limit,
      search: searchMember.trim() || undefined,
      centerId: selectedCenterId || undefined,
    } as any;
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    refetch(query);
  }, [page, limit, selectedCenterId, searchMember, refetch]);

  const showSnackbar = (message: string, severity: "success" | "error" = "success") => {
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
      showSnackbar("Failed to save member. Please try again.", "error");
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
      showSnackbar("Failed to delete member. Please try again.", "error");
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
    const query = {
      page,
      limit,
      search: searchMember.trim() || undefined,
      centerId: selectedCenterId || undefined,
    } as any;
    await refetch(query);
    showSnackbar("Savings deposit recorded!");
    handleCloseSavingsDialog();
  };

  // Load centers on component mount
  useEffect(() => {
    const loadCenters = async () => {
      try {
        setLoadingCenters(true);
        const centersData = await CentersAPI.getAll({ limit: 1000 });
        setCenters(Array.isArray(centersData) ? centersData : centersData.items ?? []);
      } catch (error) {
        console.error("Failed to load centers:", error);
      } finally {
        setLoadingCenters(false);
      }
    };

    loadCenters();
  }, []);

  // Use server-side filtered results directly
  const filteredMembers = members;

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
                <Group sx={{ fontSize: 28, color: "white" }} />
              </Box>
              <Box>
                <Typography variant="h4" fontWeight="bold" color="#1e293b" mb={1}>
                  Members
                </Typography>
                <Typography variant="body1" color="#64748b">
                  Members management and overview
                </Typography>
              </Box>
            </Box>

            {/* Right side - Controls */}
            <Box display="flex" alignItems="center" gap={2}>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Center</InputLabel>
                <Select
                  value={selectedCenterId}
                  label="Center"
                  onChange={(e) => setSelectedCenterId(e.target.value)}
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
                  minWidth: 200,
                  "& .MuiOutlinedInput-root": {
                    backgroundColor: "white",
                    borderRadius: 2,
                  },
                }}
              />
              
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setModalOpen(true)}
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
                ADD MEMBER
              </Button>
            </Box>
          </Box>
        </Paper>
        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
            {error}
          </Alert>
        )}


        {/* Members Cards */}
        <MemberCards 
        members={filteredMembers} 
        onEdit={handleEdit} 
        onDelete={handleDelete} 
        onViewLoan={handleViewLoan}
        onAddSavings={handleOpenSavingsDialog}
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
        <MemberModal
          open={modalOpen}
          member={editingMember}
          onClose={handleCloseModal}
          onSubmit={handleFormSubmit}
          loading={loading}
        />

        {/* Loan Modal */}
        {selectedMember && (
          <LoanModal
            open={loanModalOpen}
            member={selectedMember}
            onClose={handleCloseLoanModal}
            onLoanCreated={handleLoanCreated}
          />
        )}

        {/* Savings Deposit Dialog */}
        <SavingsDepositDialog
          open={savingsDialogOpen}
          member={savingsMember}
          onClose={handleCloseSavingsDialog}
          onSuccess={handleSavingsSuccess}
          formatCurrency={formatCurrency}
        />

        {/* Success/Error Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        >
          <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: "100%" }}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </DashboardLayout>
  );
}
