import type React from "react";
import { useState, useEffect } from "react";
import {
  Box,
  Button,
  TextField,
  Paper,
  Typography,
  Grid,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { Add, Edit, Cancel } from "@mui/icons-material";
import type { MemberFormData, MemberFormProps } from "../types";
import type { Center } from "@features/centers/types";
import { CentersAPI } from "@features/centers/api";

export default function MemberForm({
  member,
  onSubmit,
  onCancel,
  loading = false,
}: MemberFormProps) {
  const [formData, setFormData] = useState<MemberFormData>({
    firstName: "",
    lastName: "",
    middleName: "",
    contactNumber: "",
    address: "",
    birthDate: null,
    centerId: "",
  });

  const [errors, setErrors] = useState<Partial<MemberFormData>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [centers, setCenters] = useState<Center[]>([]);
  const [loadingCenters, setLoadingCenters] = useState(false);

  const isEditing = Boolean(member);

  // Load centers on component mount
  useEffect(() => {
    const loadCenters = async () => {
      try {
        setLoadingCenters(true);
        const centersData = await CentersAPI.getAll();
        setCenters(Array.isArray(centersData) ? centersData : centersData.items ?? []);
      } catch (error) {
        console.error("Failed to load centers:", error);
      } finally {
        setLoadingCenters(false);
      }
    };

    loadCenters();
  }, []);

  useEffect(() => {
    if (member) {
      setFormData({
        firstName: member.firstName,
        lastName: member.lastName,
        middleName: member.middleName || "",
        contactNumber: member.contactNumber || "",
        address: member.address || "",
        birthDate: member.birthDate ? new Date(member.birthDate) : null,
        centerId: member.center?.id || "",
      });
    } else {
      setFormData({
        firstName: "",
        lastName: "",
        middleName: "",
        contactNumber: "",
        address: "",
        birthDate: null,
        centerId: "",
      });
    }
    setErrors({});
    setSubmitError(null);
  }, [member]);

//   const validateForm = (): boolean => {
//     const newErrors: Partial<MemberFormData> = {};

//     if (!formData.firstName.trim()) newErrors.firstName = "First name is required";
//     if (!formData.lastName.trim()) newErrors.lastName = "Last name is required";
//     if (!formData.contactNumber.trim()) newErrors.contactNumber = "Contact number is required";
//     if (!formData.address.trim()) newErrors.address = "Address is required";
//     if (!formData.birthDate) newErrors.birthDate = "Birth date is required";

//     setErrors(newErrors);
//     return Object.keys(newErrors).length === 0;
//   };

  const handleInputChange =
    (field: keyof MemberFormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = field === "birthDate" ? new Date(e.target.value) : e.target.value;

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

  const handleSelectChange = (field: keyof MemberFormData) => (e: any) => {
    const value = e.target.value;

    setFormData((prev) => ({
      ...prev,
      [field]: value,
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

    // if (!validateForm()) return;

    try {
      await onSubmit(formData);
      if (!isEditing) {
        setFormData({
          firstName: "",
          lastName: "",
          middleName: "",
          contactNumber: "",
          address: "",
          birthDate: null,
        });
      }
    } catch (err) {
      setSubmitError("Failed to save member. Please try again.");
    }
  };

  const handleCancel = () => {
    setFormData({
      firstName: "",
      lastName: "",
      middleName: "",
      contactNumber: "",
      address: "",
      birthDate: null,
      centerId: "",
    });
    setErrors({});
    setSubmitError(null);
    onCancel?.();
  };

  return (
    <Paper
      sx={{
        p: 4,
        mb: 4,
        background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
        border: "1px solid #e2e8f0",
      }}
    >
      <Typography
        variant="h5"
        gutterBottom
        sx={{
          fontWeight: 600,
          color: "#1e293b",
          mb: 3,
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        {isEditing ? <Edit /> : <Add />}
        {isEditing ? "Edit Member" : "Add New Member"}
      </Typography>

      {submitError && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {submitError}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit} noValidate>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
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

          <Grid item xs={12} md={6}>
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

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Middle Name"
              value={formData.middleName}
              onChange={handleInputChange("middleName")}
              error={Boolean(errors.middleName)}
              helperText={errors.middleName}
              disabled={loading}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Contact Number"
              value={formData.contactNumber}
              onChange={handleInputChange("contactNumber")}
              error={Boolean(errors.contactNumber)}
              helperText={errors.contactNumber}
              disabled={loading}
              required
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Address"
              value={formData.address}
              onChange={handleInputChange("address")}
              error={Boolean(errors.address)}
              helperText={errors.address}
              disabled={loading}
              multiline
              rows={2}
              required
            />
          </Grid>

          <Grid item xs={12}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Birth Date"
                value={formData.birthDate}
                onChange={(newValue) => {
                  setFormData(prev => ({ ...prev, birthDate: newValue }));
                  if (errors.birthDate) {
                    setErrors(prev => ({ ...prev, birthDate: undefined }));
                  }
                }}
                maxDate={new Date()} // Cannot be in the future
                minDate={new Date(new Date().getFullYear() - 100, 0, 1)} // Max 100 years ago
                disabled={loading}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    required: true,
                    error: Boolean(errors.birthDate),
                    helperText: typeof errors.birthDate === 'string' ? errors.birthDate : "",
                  },
                }}
              />
            </LocalizationProvider>
          </Grid>

          <Grid item xs={12}>
            <FormControl fullWidth disabled={loading || loadingCenters}>
              <InputLabel>Center</InputLabel>
              <Select
                value={formData.centerId || ""}
                onChange={handleSelectChange("centerId")}
                label="Center"
                error={Boolean(errors.centerId)}
                MenuProps={{
                  PaperProps: {
                    style: {
                      maxHeight: 200,
                    },
                  },
                }}
              >
                <MenuItem value="">
                  <em>No center assigned</em>
                </MenuItem>
                {centers.map((center) => (
                  <MenuItem key={center.id} value={center.id}>
                    {center.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
              {isEditing && (
                <Button
                  variant="outlined"
                  onClick={handleCancel}
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
              )}
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
                {loading
                  ? "Saving..."
                  : isEditing
                  ? "Update Member"
                  : "Create Member"}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
}
