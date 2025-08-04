import type React from "react";
import { useState, useEffect } from "react";
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
  IconButton,
  Box,
  Typography,
} from "@mui/material";
import {
  Add,
  Edit,
  Close,
} from "@mui/icons-material";
import type { Member, MemberFormData } from "../types";

interface MemberModalProps {
  open: boolean;
  member?: Member;
  onClose: () => void;
  onSubmit: (data: MemberFormData) => Promise<void>;
  loading?: boolean;
}

export default function MemberModal({
  open,
  member,
  onClose,
  onSubmit,
  loading = false,
}: MemberModalProps) {
  const [formData, setFormData] = useState<MemberFormData>({
    firstName: "",
    lastName: "",
    middleName: "",
    contactNumber: "",
    address: "",
    birthDate: null,
  });

  const [errors, setErrors] = useState<Partial<MemberFormData>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isEditing = Boolean(member);

  useEffect(() => {
    if (open) {
      if (member) {
        setFormData({
          firstName: member.firstName,
          lastName: member.lastName,
          middleName: member.middleName || "",
          contactNumber: member.contactNumber || "",
          address: member.address || "",
          birthDate: member.birthDate ? new Date(member.birthDate) : null,
        });
      } else {
        setFormData({
          firstName: "",
          lastName: "",
          middleName: "",
          contactNumber: "",
          address: "",
          birthDate: null,
        });
      }
      setErrors({});
      setSubmitError(null);
    }
  }, [open, member]);

  const handleInputChange =
    (field: keyof MemberFormData) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value =
        field === "birthDate" ? new Date(e.target.value) : e.target.value;

      setFormData((prev) => ({
        ...prev,
        [field]: value as any,
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
    try {
      await onSubmit(formData);
      onClose();
    } catch (err) {
      setSubmitError("Failed to submit form. Please try again.");
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
      fullWidth
      maxWidth="md"
      PaperProps={{
        sx: {
          borderRadius: 3,
          background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
          p: 2,
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
          pb: 1,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {isEditing ? <Edit fontSize="small" /> : <Add fontSize="small" />}
          <Typography variant="h6" fontWeight={600}>
            {isEditing ? "Edit Member" : "Add New Member"}
          </Typography>
        </Box>
        <IconButton onClick={handleClose} disabled={loading} size="small">
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="First Name"
                value={formData.firstName}
                onChange={handleInputChange("firstName")}
                error={Boolean(errors.firstName)}
                helperText={errors.firstName}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Last Name"
                value={formData.lastName}
                onChange={handleInputChange("lastName")}
                error={Boolean(errors.lastName)}
                helperText={errors.lastName}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Middle Name"
                value={formData.middleName}
                onChange={handleInputChange("middleName")}
                error={Boolean(errors.middleName)}
                helperText={errors.middleName}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Contact Number"
                value={formData.contactNumber}
                onChange={handleInputChange("contactNumber")}
                error={Boolean(errors.contactNumber)}
                helperText={errors.contactNumber}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Address"
                value={formData.address}
                onChange={handleInputChange("address")}
                error={Boolean(errors.address)}
                helperText={errors.address}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Birth Date"
                type="date"
                value={
                  formData.birthDate
                    ? formData.birthDate.toISOString().split("T")[0]
                    : ""
                }
                onChange={handleInputChange("birthDate")}
                error={Boolean(errors.birthDate)}
                fullWidth
                required
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>

          {submitError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {submitError}
            </Alert>
          )}

          <DialogActions sx={{ mt: 3 }}>
            <Button
              onClick={handleClose}
              disabled={loading}
              sx={{ color: "#64748b" }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={loading}
              startIcon={
                loading ? <CircularProgress size={16} /> : isEditing ? <Edit /> : <Add />
              }
            >
              {loading ? "Saving..." : isEditing ? "Update" : "Create"}
            </Button>
          </DialogActions>
        </form>
      </DialogContent>
    </Dialog>
  );
}
