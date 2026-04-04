import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Paper,
  Snackbar,
  TextField,
} from "@mui/material";
import { Add, AdminPanelSettings } from "@mui/icons-material";
import DashboardLayout from "@components/layout/PrivateLayout";
import PageLoadingSkeleton from "@components/common/PageLoadingSkeleton";
import { useUsers } from "../hooks/useUsers";
import UserModal from "../components/UserModal";
import UserTable from "../components/UserTable";
import TempPasswordDialog from "../components/TempPasswordDialog";
import type { AdminUser, CreateUserPayload, UpdateUserPayload } from "../types";
import { useAuthStore } from "@features/auth/authStore";

type PasswordDialogState = {
  open: boolean;
  title: string;
  password: string;
};

type StatusDialogState = {
  open: boolean;
  user: AdminUser | null;
  nextActive: boolean;
};

type ResetDialogState = {
  open: boolean;
  user: AdminUser | null;
};

export default function UserManagementPage() {
  const { user } = useAuthStore();
  const {
    users,
    loading,
    error,
    createUser,
    updateUser,
    updateStatus,
    resetPassword,
  } = useUsers();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | undefined>(
    undefined
  );
  const [search, setSearch] = useState("");
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });
  const [passwordDialog, setPasswordDialog] = useState<PasswordDialogState>({
    open: false,
    title: "",
    password: "",
  });
  const [statusDialog, setStatusDialog] = useState<StatusDialogState>({
    open: false,
    user: null,
    nextActive: false,
  });
  const [resetDialog, setResetDialog] = useState<ResetDialogState>({
    open: false,
    user: null,
  });

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;
    return users.filter((entry) => {
      const name = [entry.firstName, entry.middleName, entry.lastName]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return (
        name.includes(query) ||
        entry.email.toLowerCase().includes(query) ||
        entry.role.toLowerCase().includes(query)
      );
    });
  }, [users, search]);

  const showSnackbar = (
    message: string,
    severity: "success" | "error" = "success"
  ) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleOpenModal = () => {
    setEditingUser(undefined);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingUser(undefined);
  };

  const handleCreateOrUpdate = async (
    payload: CreateUserPayload | UpdateUserPayload
  ) => {
    if (editingUser) {
      await updateUser(editingUser.id, payload as UpdateUserPayload);
      showSnackbar("User updated successfully!");
      return;
    }

    const response = await createUser(payload as CreateUserPayload);
    showSnackbar("User created successfully!");
    setPasswordDialog({
      open: true,
      title: "Temporary Password",
      password: response.tempPassword,
    });
  };

  const handleEdit = (selected: AdminUser) => {
    setEditingUser(selected);
    setModalOpen(true);
  };

  const handleToggleStatus = (selected: AdminUser) => {
    setStatusDialog({
      open: true,
      user: selected,
      nextActive: !selected.isActive,
    });
  };

  const handleConfirmStatus = async () => {
    if (!statusDialog.user) return;
    try {
      await updateStatus(statusDialog.user.id, statusDialog.nextActive);
      showSnackbar(
        statusDialog.nextActive
          ? "User reactivated successfully!"
          : "User deactivated successfully!"
      );
    } catch (err) {
      showSnackbar("Failed to update user status.", "error");
    } finally {
      setStatusDialog({ open: false, user: null, nextActive: false });
    }
  };

  const handleResetPassword = (selected: AdminUser) => {
    setResetDialog({ open: true, user: selected });
  };

  const handleConfirmReset = async () => {
    if (!resetDialog.user) return;
    try {
      const response = await resetPassword(resetDialog.user.id);
      showSnackbar("Password reset successfully!");
      setPasswordDialog({
        open: true,
        title: "Temporary Password",
        password: response.tempPassword,
      });
    } catch (err) {
      showSnackbar("Failed to reset password.", "error");
    } finally {
      setResetDialog({ open: false, user: null });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  if (loading && users.length === 0) {
    return (
      <DashboardLayout>
        <PageLoadingSkeleton showStats={false} filterCount={2} rowCount={6} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Box sx={{ backgroundColor: "#f8fafc", minHeight: "100vh" }}>
        <Paper
          sx={{
            background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
            border: "1px solid #e2e8f0",
            borderRadius: 3,
            p: 4,
            mb: 3,
            boxShadow:
              "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
          }}
        >
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mb={3}
          >
            <Box display="flex" alignItems="center" gap={3}>
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
                }}
              >
                <AdminPanelSettings sx={{ fontSize: 28, color: "white" }} />
              </Box>
              <Box>
                <Box
                  component="span"
                  sx={{ display: "block", fontSize: 28, fontWeight: 700 }}
                >
                  User Management
                </Box>
                <Box
                  component="span"
                  sx={{ display: "block", color: "#64748b" }}
                >
                  Create and manage system users
                </Box>
              </Box>
            </Box>

            <Box display="flex" alignItems="center" gap={2}>
              <TextField
                size="small"
                placeholder="Search users..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                sx={{
                  minWidth: 220,
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
                  "&:hover": {
                    background:
                      "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                    boxShadow: "0 6px 20px 0 rgba(59, 130, 246, 0.4)",
                  },
                }}
              >
                Add User
              </Button>
            </Box>
          </Box>
        </Paper>

        {error && (
          <Box px={3}>
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
              {error}
            </Alert>
          </Box>
        )}

        <Box px={3}>
          <UserTable
            users={filteredUsers}
            loading={loading}
            currentUserId={user?.id}
            onEdit={handleEdit}
            onResetPassword={handleResetPassword}
            onToggleStatus={handleToggleStatus}
          />
        </Box>

        <UserModal
          open={modalOpen}
          user={editingUser}
          onClose={handleCloseModal}
          onSubmit={handleCreateOrUpdate}
          loading={loading}
        />

        <TempPasswordDialog
          open={passwordDialog.open}
          title={passwordDialog.title}
          password={passwordDialog.password}
          onClose={() =>
            setPasswordDialog({ open: false, title: "", password: "" })
          }
        />

        <Dialog
          open={statusDialog.open}
          onClose={() =>
            setStatusDialog({ open: false, user: null, nextActive: false })
          }
        >
          <DialogTitle>
            {statusDialog.nextActive ? "Reactivate User" : "Deactivate User"}
          </DialogTitle>
          <DialogContent>
            <DialogContentText>
              {statusDialog.nextActive
                ? "This user will regain access to the system."
                : "This user will be unable to log in until reactivated."}
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ p: 3, gap: 1 }}>
            <Button
              onClick={() =>
                setStatusDialog({ open: false, user: null, nextActive: false })
              }
              sx={{ color: "#64748b" }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleConfirmStatus}
              sx={{
                background:
                  "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)",
                "&:hover": {
                  background:
                    "linear-gradient(135deg, #1e40af 0%, #2563eb 100%)",
                },
              }}
            >
              {statusDialog.nextActive ? "Reactivate" : "Deactivate"}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={resetDialog.open}
          onClose={() => setResetDialog({ open: false, user: null })}
        >
          <DialogTitle>Reset Password</DialogTitle>
          <DialogContent>
            <DialogContentText>
              This will generate a new temporary password for the user.
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ p: 3, gap: 1 }}>
            <Button
              onClick={() => setResetDialog({ open: false, user: null })}
              sx={{ color: "#64748b" }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleConfirmReset}
              sx={{
                background:
                  "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)",
                "&:hover": {
                  background:
                    "linear-gradient(135deg, #1e40af 0%, #2563eb 100%)",
                },
              }}
            >
              Reset Password
            </Button>
          </DialogActions>
        </Dialog>

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
