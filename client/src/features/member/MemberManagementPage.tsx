import { useState, useEffect } from "react";
import { Box, Typography, Alert, Snackbar, Button, Paper, FormControl, InputLabel, Select, MenuItem, TextField } from "@mui/material";
import { Add, Group, FilterList } from "@mui/icons-material";
import DashboardLayout from "@components/layout/PrivateLayout";
import MemberModal from "./components/MemberModal";
import MemberCards from "./components/MemberCards";
import LoanModal from "@features/loans/components/LoanModal";
import { useMembers } from "./hooks/useMember";
import type { Member, MemberFormData } from "./types";
import type { Center } from "@features/centers/types";
import { CentersAPI } from "@features/centers/api";

export default function MembersPage() {
  const { members, loading, error, createMember, updateMember, deleteMember } = useMembers();
  
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
  const [searchMember, setSearchMember] = useState("");

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

  const handleCloseLoanModal = () => {
    setLoanModalOpen(false);
    setSelectedMember(null);
  };

  const handleLoanCreated = () => {
    showSnackbar("Loan created successfully!");
  };

  // Load centers on component mount
  useEffect(() => {
    const loadCenters = async () => {
      try {
        setLoadingCenters(true);
        const centersData = await CentersAPI.getAll();
        setCenters(centersData);
      } catch (error) {
        console.error("Failed to load centers:", error);
      } finally {
        setLoadingCenters(false);
      }
    };

    loadCenters();
  }, []);

  // Filter members based on selected center
  const filteredMembers = members
  .filter((member) =>
    selectedCenterId ? member.center?.id === selectedCenterId : true
  )
  .filter((member) => {
    if (!searchMember) return true;
    const fullName = `${member.firstName} ${member.middleName || ""} ${member.lastName}`
      .toLowerCase()
      .trim();
    return fullName.includes(searchMember.toLowerCase().trim());
  });

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
            Members Management
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400 }}>
            Manage your registered members
          </Typography>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
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
            <Group sx={{ color: "#1e3a8a", fontSize: 28 }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, color: "#1e293b" }}>
                Members
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {filteredMembers.length} of {members.length} member{members.length !== 1 ? "s" : ""} registered
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            {/* Filter Section */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <FilterList sx={{ color: "#64748b", fontSize: 18 }} />
              <Typography
                variant="body2"
                sx={{ fontWeight: 500, color: "#374151", mr: 1 }}
              >
                Center:
              </Typography>
              <FormControl sx={{ minWidth: 180}} disabled={loadingCenters}>
                <InputLabel>Select Center</InputLabel>
                <Select
                  value={selectedCenterId}
                  onChange={(e) => setSelectedCenterId(e.target.value)}
                  label="Select Center"
                  size="small"
                  MenuProps={{
                    PaperProps: {
                      style: { maxHeight: 200 },
                    },
                  }}
                >
                  <MenuItem value="">
                    <em>All Centers</em>
                  </MenuItem>
                  {centers.map((center) => (
                    <MenuItem key={center.id} value={center.id}>
                      {center.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Search Section */}
            <TextField
              size="small"
              label="Search by name"
              variant="outlined"
              value={searchMember}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSearchMember(e.target.value)
              }
              sx={{ minWidth: 200 }}
            />

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
              Add Member
            </Button>
          </Box>
        </Paper>

        {/* Members Cards */}
        <MemberCards 
        members={filteredMembers} 
        onEdit={handleEdit} 
        onDelete={handleDelete} 
        onViewLoan={handleViewLoan}
        loading={loading} 
        />

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
