import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Grid,
  TextField,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Divider,
} from "@mui/material";
import { Payment, AccountBalance, Savings } from "@mui/icons-material";
import { useState, useEffect } from "react";
import collectionsService from "../api";

interface Loan {
  id: string;
  status: string;
  weeklyPaymentAmount?: number;
  savings?: number;
}

interface Collection {
  amount: number;
  paymentReceived: number;
}

interface MemberWithLoans {
  id: string;
  firstName: string;
  lastName: string;
  totalBalance: number;
  weeklyPaymentAmount: number;
  loans: Loan[];
  collection?: Collection;
}

interface PaymentDialogProps {
  open: boolean;
  member: MemberWithLoans | null;
  onClose: () => void;
  onSuccess: () => void;
  formatCurrency: (amount: number) => string;
}

export function PaymentDialog({
  open,
  member,
  onClose,
  onSuccess,
  formatCurrency,
}: PaymentDialogProps) {
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [useSavings, setUseSavings] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open && member) {
      setPaymentAmount("");
      setPaymentNotes("");
      setUseSavings(false);
      setError(null);
    }
  }, [open, member]);

  const handleSubmit = async () => {
    if (!member || !paymentAmount) return;

    setProcessing(true);
    setError(null);

    try {
      const amount = Number.parseFloat(paymentAmount);
      if (amount <= 0) {
        throw new Error("Payment amount must be greater than 0");
      }

      const activeLoan = member.loans.find((l) => l.status === "active");
      if (!activeLoan) {
        throw new Error("No active loan found for member");
      }

      await collectionsService.createRepayment({
        loanId: activeLoan.id,
        memberId: member.id,
        centerId: "", // This should be passed from parent component
        amount,
        notes: paymentNotes,
        useSavings,
      });

      onSuccess();
    } catch (error) {
      console.error("Failed to process payment:", error);
      setError(
        error instanceof Error ? error.message : "Failed to process payment"
      );
    } finally {
      setProcessing(false);
    }
  };

  if (!member) return null;

  const activeLoan = member.loans.find((l) => l.status === "active");
  const weeklyPayment =
    activeLoan?.weeklyPaymentAmount || member.weeklyPaymentAmount || 0;
  const availableSavings = activeLoan?.savings || 0;
  const paymentAmountNum = Number.parseFloat(paymentAmount) || 0;
  const shortfall = Math.max(0, weeklyPayment - paymentAmountNum);
  const canUseSavings = shortfall > 0 && availableSavings > 0;

  return (
    <Dialog
      open={open}
      onClose={onClose}
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
          background: "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)",
          color: "white",
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <Payment />
        <Box>
          <Typography variant="h6">Process Payment</Typography>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            {member.firstName} {member.lastName}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        {/* Member Financial Overview */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <Card sx={{ height: "100%", border: "1px solid #e2e8f0" }}>
              <CardContent>
                <Typography
                  variant="h6"
                  sx={{
                    mb: 2,
                    color: "#1e293b",
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <AccountBalance sx={{ color: "#ef4444" }} />
                  Outstanding Balance
                </Typography>
                <Typography
                  variant="h4"
                  sx={{ fontWeight: 700, color: "#ef4444" }}
                >
                  {formatCurrency(member.totalBalance)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ height: "100%", border: "1px solid #e2e8f0" }}>
              <CardContent>
                <Typography
                  variant="h6"
                  sx={{
                    mb: 2,
                    color: "#1e293b",
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <Payment sx={{ color: "#3b82f6" }} />
                  Weekly Payment
                </Typography>
                <Typography
                  variant="h4"
                  sx={{ fontWeight: 700, color: "#3b82f6" }}
                >
                  {formatCurrency(weeklyPayment)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <Card sx={{ height: "100%", border: "1px solid #e2e8f0" }}>
              <CardContent>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 1 }}
                >
                  Collection Amount
                </Typography>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 600, color: "#059669" }}
                >
                  {formatCurrency(
                    member.collection?.amount || member.totalBalance
                  )}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ height: "100%", border: "1px solid #e2e8f0" }}>
              <CardContent>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    mb: 1,
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                  }}
                >
                  <Savings sx={{ fontSize: 16 }} />
                  Available Savings
                </Typography>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 600, color: "#f59e0b" }}
                >
                  {formatCurrency(availableSavings)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* Payment Form */}
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            label="Payment Amount"
            type="number"
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(e.target.value)}
            InputProps={{
              startAdornment: (
                <Typography sx={{ mr: 1, color: "#6b7280" }}>₱</Typography>
              ),
            }}
            sx={{ mb: 2 }}
            helperText={`Weekly payment: ${formatCurrency(weeklyPayment)}`}
          />

          {/* Savings Usage Option */}
          {canUseSavings && (
            <Card
              sx={{
                mb: 2,
                p: 2,
                backgroundColor: "#f0f9ff",
                border: "1px solid #0ea5e9",
                borderRadius: 2,
              }}
            >
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Payment is short by {formatCurrency(shortfall)}. You can use
                savings to cover the difference.
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <input
                  type="checkbox"
                  id="useSavings"
                  checked={useSavings}
                  onChange={(e) => setUseSavings(e.target.checked)}
                />
                <label htmlFor="useSavings">
                  <Typography variant="body2">
                    Use {formatCurrency(Math.min(shortfall, availableSavings))}{" "}
                    from savings
                  </Typography>
                </label>
              </Box>
            </Card>
          )}

          <TextField
            fullWidth
            label="Payment Notes (Optional)"
            multiline
            rows={3}
            value={paymentNotes}
            onChange={(e) => setPaymentNotes(e.target.value)}
            placeholder="Enter payment notes or remarks..."
          />
        </Box>

        {/* Payment Summary */}
        {paymentAmountNum > 0 && (
          <Card
            sx={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0" }}
          >
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, color: "#1e293b" }}>
                Payment Summary
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Cash Payment:
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {formatCurrency(paymentAmountNum)}
                  </Typography>
                </Grid>
                {useSavings && (
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      From Savings:
                    </Typography>
                    <Typography
                      variant="h6"
                      sx={{ fontWeight: 600, color: "#f59e0b" }}
                    >
                      {formatCurrency(Math.min(shortfall, availableSavings))}
                    </Typography>
                  </Grid>
                )}
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    Total Payment:
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{ fontWeight: 700, color: "#10b981" }}
                  >
                    {formatCurrency(
                      paymentAmountNum +
                        (useSavings ? Math.min(shortfall, availableSavings) : 0)
                    )}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3, backgroundColor: "#f8fafc" }}>
        <Button onClick={onClose} size="large">
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!paymentAmount || processing}
          startIcon={processing ? <CircularProgress size={16} /> : <Payment />}
          size="large"
          sx={{
            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
            "&:hover": {
              background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
            },
          }}
        >
          {processing ? "Processing..." : "Process Payment"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
