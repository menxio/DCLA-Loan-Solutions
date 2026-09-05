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
  Autocomplete,
} from "@mui/material";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import {
  Add,
  Edit,
  Close,
} from "@mui/icons-material";
import type { Member, MemberFormData } from "../types";
import type { Center } from "@features/centers/types";
import { CentersAPI } from "@features/centers/api";

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
    centerId: "",
  });

  const [errors, setErrors] = useState<Partial<MemberFormData>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [centers, setCenters] = useState<Center[]>([]);
  const [loadingCenters, setLoadingCenters] = useState(false);
  const [loadingMoreCenters, setLoadingMoreCenters] = useState(false);
  const [centersPage, setCentersPage] = useState(1);
  const [centersTotalPages, setCentersTotalPages] = useState(1);
  const [centerInput, setCenterInput] = useState("");
  const [centerQuery, setCenterQuery] = useState("");
  const [selectedCenter, setSelectedCenter] = useState<Center | null>(null);

  const isEditing = Boolean(member);

  const mergeCenters = (
    existing: Center[],
    items: Center[],
    append: boolean,
    selected: Center | null,
  ) => {
    const merged = append ? [...existing] : [];
    items.forEach((center) => {
      if (!merged.some((existing) => existing.id === center.id)) {
        merged.push(center);
      }
    });
    if (selected && !merged.some((existing) => existing.id === selected.id)) {
      merged.unshift(selected);
    }
    return merged;
  };

  useEffect(() => {
    if (!open) {
      return;
    }
    const loadCenters = async (page: number, search: string, append = false) => {
      try {
        if (append) {
          setLoadingMoreCenters(true);
        } else {
          setLoadingCenters(true);
        }
        const centersData = await CentersAPI.getAll({ page, limit: 20, search });
        const items = Array.isArray(centersData) ? centersData : centersData.items ?? [];
        const totalPages = Array.isArray(centersData) ? 1 : centersData.totalPages ?? 1;
        setCentersTotalPages(totalPages);
        setCenters((prev) => mergeCenters(prev, items, append, selectedCenter));
      } catch (error) {
        console.error("Failed to load centers:", error);
      } finally {
        setLoadingCenters(false);
        setLoadingMoreCenters(false);
      }
    };

    const timeoutId = setTimeout(() => {
      setCentersPage(1);
      loadCenters(1, centerQuery, false);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [open, centerQuery, selectedCenter]);

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
          centerId: member.center?.id || "",
        });
        setSelectedCenter(member.center ?? null);
        setCenterInput(member.center?.name ?? "");
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
        setSelectedCenter(null);
        setCenterInput("");
      }
      setErrors({});
      setSubmitError(null);
    }
  }, [open, member]);

  useEffect(() => {
    if (!selectedCenter) return;
    setCenters((prev) => mergeCenters(prev, [], true, selectedCenter));
  }, [selectedCenter]);

  type MemberTextField = Exclude<keyof MemberFormData, "birthDate">;

  const handleInputChange =
    (field: MemberTextField) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleCenterChange = (_: React.SyntheticEvent, value: Center | null) => {
    setSelectedCenter(value);
    setCenterInput(value?.name ?? "");
    setFormData((prev) => ({
      ...prev,
      centerId: value?.id || "",
    }));

    if (errors.centerId) {
      setErrors((prev) => ({
        ...prev,
        centerId: undefined,
      }));
    }

    if (submitError) {
      setSubmitError(null);
    }
  };

  const handleCenterScroll = (event: React.UIEvent<HTMLUListElement>) => {
    const listboxNode = event.currentTarget;
    const nearBottom =
      listboxNode.scrollTop + listboxNode.clientHeight >= listboxNode.scrollHeight - 32;

    if (nearBottom && !loadingCenters && !loadingMoreCenters && centersPage < centersTotalPages) {
      const nextPage = centersPage + 1;
      setLoadingMoreCenters(true);
      setCentersPage(nextPage);
      CentersAPI.getAll({ page: nextPage, limit: 20, search: centerQuery })
        .then((centersData) => {
          const items = Array.isArray(centersData)
            ? centersData
            : centersData.items ?? [];
          const totalPages = Array.isArray(centersData)
            ? 1
            : centersData.totalPages ?? 1;
          setCentersTotalPages(totalPages);
          setCenters((prev) => mergeCenters(prev, items, true, selectedCenter));
        })
        .catch((error) => {
          console.error("Failed to load more centers:", error);
        })
        .finally(() => {
          setLoadingMoreCenters(false);
        });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSubmit(formData);
      onClose();
    } catch (err) {
      console.error("Failed to submit member form:", err);
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
        <IconButton
          aria-label="Close member form"
          onClick={handleClose}
          disabled={loading}
          size="small"
        >
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
              <Autocomplete
                options={centers}
                value={selectedCenter}
                loading={loadingCenters || loadingMoreCenters}
                onChange={handleCenterChange}
                inputValue={centerInput}
                onInputChange={(_, value, reason) => {
                  setCenterInput(value);
                  if (reason === "input") {
                    setCenterQuery(value);
                  }
                  if (reason === "clear") {
                    setCenterQuery("");
                  }
                }}
                filterOptions={(options) => options}
                getOptionLabel={(option) => option.name || ""}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                noOptionsText={centerInput ? "No centers found" : "No centers available"}
                ListboxProps={{
                  onScroll: handleCenterScroll,
                  style: { maxHeight: 240, overflow: "auto" },
                }}
                disabled={loading}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Center"
                    error={Boolean(errors.centerId)}
                    helperText={errors.centerId}
                  />
                )}
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
