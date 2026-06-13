import type React from "react";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Alert,
  CircularProgress,
  MenuItem,
  IconButton,
  Box,
} from "@mui/material";
import { Add, Edit, Cancel, Close } from "@mui/icons-material";
import type {
  AdminUser,
  CreateUserPayload,
  UpdateUserPayload,
} from "../types";
import { USER_ROLE_OPTIONS } from "../types";

interface UserModalProps {
  open: boolean;
  user?: AdminUser;
  onClose: () => void;
  onSubmit: (data: CreateUserPayload | UpdateUserPayload) => Promise<void>;
  loading?: boolean;
}

type UserFormState = {
  email: string;
  firstName: string;
  middleName: string;
  lastName: string;
  role: string;
};

export default function UserModal({
  open,
  user,
  onClose,
  onSubmit,
  loading = false,
}: UserModalProps) {
  const [formData, setFormData] = useState<UserFormState>({
    email: "",
    firstName: "",
    middleName: "",
    lastName: "",
    role: "",
  });
  const [errors, setErrors] = useState<Partial<UserFormState>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isEditing = Boolean(user);

  useEffect(() => {
    if (open) {
      if (user) {
        setFormData({
          email: user.email,
          firstName: user.firstName ?? "",
          middleName: user.middleName ?? "",
          lastName: user.lastName ?? "",
          role: user.role ?? "",
        });
      } else {
        setFormData({
          email: "",
          firstName: "",
          middleName: "",
          lastName: "",
          role: "",
        });
      }
      setErrors({});
      setSubmitError(null);
    }
  }, [open, user]);

  const validateForm = (): boolean => {
    const newErrors: Partial<UserFormState> = {};

    if (!formData.email.trim()) newErrors.email = "Email is required";
    if (!formData.firstName.trim())
      newErrors.firstName = "First name is required";
    if (!formData.lastName.trim()) newErrors.lastName = "Last name is required";
    if (!formData.role.trim()) newErrors.role = "Role is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange =
    (field: keyof UserFormState) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({
        ...prev,
        [field]: e.target.value,
      }));

      if (errors[field]) {
        setErrors((prev) => ({
          ...prev,
          [field]: undefined,
        }));
      }

      if (submitError) {
        setSubmitError(null);
      }
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const payload = {
      email: formData.email.trim(),
      firstName: formData.firstName.trim(),
      middleName: formData.middleName.trim() || undefined,
      lastName: formData.lastName.trim(),
      role: formData.role as CreateUserPayload["role"],
    };

    try {
      await onSubmit(payload);
      onClose();
    } catch (err) {
      setSubmitError("Failed to save user. Please try again.");
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
        },
      }}
    >
      <DialogTitle
        sx={{
          fontWeight: 600,
          color: "#1e293b",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
          pb: 1,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {isEditing ? <Edit /> : <Add />}
          {isEditing ? "Edit User" : "Add New User"}
        </Box>
        <IconButton onClick={handleClose} disabled={loading} size="small">
          <Close />
        </IconButton>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ pt: 2 }}>
          {submitError && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
              {submitError}
            </Alert>
          )}

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email"
                value={formData.email}
                onChange={handleInputChange("email")}
                error={Boolean(errors.email)}
                helperText={errors.email}
                disabled={loading}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                select
                label="Role"
                value={formData.role}
                onChange={handleInputChange("role")}
                error={Boolean(errors.role)}
                helperText={errors.role}
                disabled={loading}
                required
              >
                {USER_ROLE_OPTIONS.map((role) => (
                  <MenuItem key={role.value} value={role.value}>
                    {role.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="First Name"
                value={formData.firstName}
                onChange={handleInputChange("firstName")}
                error={Boolean(errors.firstName)}
                helperText={errors.firstName}
                disabled={loading}
                required
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Middle Name"
                value={formData.middleName}
                onChange={handleInputChange("middleName")}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Last Name"
                value={formData.lastName}
                onChange={handleInputChange("lastName")}
                error={Boolean(errors.lastName)}
                helperText={errors.lastName}
                disabled={loading}
                required
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 3, gap: 1 }}>
          <Button
            onClick={handleClose}
            disabled={loading}
            startIcon={<Cancel />}
            sx={{
              borderColor: "#64748b",
              color: "#64748b",
              "&:hover": {
                borderColor: "#475569",
                backgroundColor: "#f8fafc",
              },
            }}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            startIcon={
              loading ? (
                <CircularProgress size={20} color="inherit" />
              ) : isEditing ? (
                <Edit />
              ) : (
                <Add />
              )
            }
            sx={{
              minWidth: 140,
              background: "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)",
              "&:hover": {
                background: "linear-gradient(135deg, #1e40af 0%, #2563eb 100%)",
              },
            }}
          >
            {loading ? "Saving..." : isEditing ? "Update User" : "Create User"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
