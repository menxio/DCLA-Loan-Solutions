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
  Divider,
} from "@mui/material";
import { Add, Calculate } from "@mui/icons-material";
import type { LoanFormData, LoanCalculation } from "../types";
import { calculateLoanDetails, formatCurrency, formatPercentage } from "../utils/loanCalculations";

interface LoanFormProps {
  memberId: string;
  memberName: string;
  onSubmit: (data: LoanFormData) => Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
  isFirstLoan?: boolean;
}

export default function LoanForm({
  memberName,
  onSubmit,
  onCancel,
  loading = false,
  isFirstLoan = false,
}: LoanFormProps) {
  const [formData, setFormData] = useState<LoanFormData>({
    principalAmount: 0,
    termWeeks: 8,
    savings: undefined,
  });

  const [calculation, setCalculation] = useState<LoanCalculation | null>(null);
  const [errors, setErrors] = useState<Partial<LoanFormData>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Calculate loan details when form data changes
  useEffect(() => {
    if (formData.principalAmount > 0) {
      const calc = calculateLoanDetails(formData.principalAmount, formData.termWeeks);
      setCalculation(calc);
    } else {
      setCalculation(null);
    }
  }, [formData.principalAmount, formData.termWeeks]);

  const handleInputChange = (field: keyof LoanFormData) => (
    e: React.ChangeEvent<HTMLInputElement | { value: unknown }>
  ) => {
    const value = field === "principalAmount" || field === "savings"
      ? Number((e as React.ChangeEvent<HTMLInputElement>).target.value)
      : (e as React.ChangeEvent<{ value: unknown }>).target.value;

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

    // Validation
    const newErrors: Partial<LoanFormData> = {};
    if (!formData.principalAmount || formData.principalAmount <= 0) {
      (newErrors as any).principalAmount = "Principal amount must be greater than 0";
    }
    if (isFirstLoan) {
      if (formData.savings === undefined || formData.savings === null || Number(formData.savings) <= 0) {
        (newErrors as any).savings = "Savings amount is required for first loan";
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      await onSubmit(formData);
    } catch (err) {
      setSubmitError("Failed to create loan. Please try again.");
    }
  };

  return (
    <Paper
      sx={{
        p: 4,
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
        <Add />
        Create Loan - {memberName}
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
              label="Principal Amount"
              type="number"
              value={formData.principalAmount || ""}
              onChange={handleInputChange("principalAmount")}
              error={Boolean(errors.principalAmount)}
              helperText={errors.principalAmount}
              disabled={loading}
              required
              InputProps={{
                startAdornment: <Typography sx={{ mr: 1 }}>₱</Typography>,
              }}
            />
          </Grid>

          {/* Savings Amount (manual input) */}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Savings Amount"
              type="number"
              value={formData.savings ?? ""}
              onChange={handleInputChange("savings")}
              error={Boolean((errors as any).savings)}
              helperText={(errors as any).savings}
              disabled={loading}
              required={isFirstLoan}
              InputProps={{
                startAdornment: <Typography sx={{ mr: 1 }}>₱</Typography>,
              }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth disabled={loading}>
              <InputLabel>Term</InputLabel>
              <Select
                value={formData.termWeeks}
                onChange={(e) => {
                  setFormData((prev) => ({
                    ...prev,
                    termWeeks: e.target.value as 4 | 8 | 12,
                  }));
                }}
                label="Term"
              >
                <MenuItem value={4}>4 weeks (10% interest)</MenuItem>
                <MenuItem value={8}>8 weeks (20% interest)</MenuItem>
                <MenuItem value={12}>12 weeks (30% interest)</MenuItem>
              </Select>
            </FormControl>
          </Grid>



          {/* Loan Calculation Preview */}
          {calculation && (
            <>
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" sx={{ mb: 2, color: "#1e293b" }}>
                  <Calculate sx={{ mr: 1, verticalAlign: "middle" }} />
                  Loan Calculation
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <Paper
                  sx={{
                    p: 2,
                    backgroundColor: "#f8fafc",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Interest Rate
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: "#1e293b" }}>
                    {formatPercentage(calculation.interestRate)}
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} md={6}>
                <Paper
                  sx={{
                    p: 2,
                    backgroundColor: "#f8fafc",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Total Interest
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: "#1e293b" }}>
                    {formatCurrency(calculation.totalInterest)}
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} md={6}>
                <Paper
                  sx={{
                    p: 2,
                    backgroundColor: "#f8fafc",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Total Amount
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: "#1e293b" }}>
                    {formatCurrency(calculation.totalAmount)}
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} md={6}>
                <Paper
                  sx={{
                    p: 2,
                    backgroundColor: "#f8fafc",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Weekly Payment
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: "#1e293b" }}>
                    {formatCurrency(calculation.weeklyPaymentAmount)}
                  </Typography>
                </Paper>
              </Grid>

              {/* Removed auto 10% savings preview */}
            </>
          )}

          <Grid item xs={12}>
            <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
              <Button
                variant="outlined"
                onClick={onCancel}
                disabled={loading}
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
                disabled={loading || !calculation}
                startIcon={
                  loading ? (
                    <CircularProgress size={20} color="inherit" />
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
                {loading ? "Creating..." : "Create Loan"}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
} 