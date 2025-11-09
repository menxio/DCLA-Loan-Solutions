import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Divider,
  Snackbar,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import { Savings } from "@mui/icons-material";
import { useEffect, useMemo, useState } from "react";
import savingsService from "@features/savings/api";

interface MemberLite {
  id: string;
  firstName: string;
  lastName: string;
}

interface SavingsSummary {
  activeLoanId: string | null;
  activeLoanSavings: number;
}

interface SavingsDepositDialogProps {
  open: boolean;
  member: MemberLite | null;
  onClose: () => void;
  onSuccess: () => void;
  formatCurrency: (amount: number) => string;
}

export function SavingsDepositDialog({
  open,
  member,
  onClose,
  onSuccess,
  formatCurrency,
}: SavingsDepositDialogProps) {
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<"deposit" | "withdraw">("deposit");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<SavingsSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const previewAmount = Number.parseFloat(amount || "0");
  const currentSavings = summary?.activeLoanSavings ?? 0;
  const isWithdraw = mode === "withdraw";
  const projectedSavings = useMemo(() => {
    if (Number.isNaN(previewAmount) || previewAmount <= 0) {
      return currentSavings;
    }
    return isWithdraw
      ? Math.max(currentSavings - previewAmount, 0)
      : currentSavings + previewAmount;
  }, [currentSavings, previewAmount, isWithdraw]);
  const insufficientFunds =
    isWithdraw && previewAmount > 0 && previewAmount > currentSavings;

  useEffect(() => {
    if (!open || !member) {
      setSummary(null);
      setSummaryError(null);
      setAmount("");
      setError(null);
      setMode("deposit");
      return;
    }

    setAmount("");
    setError(null);
    setMode("deposit");

    setSummaryLoading(true);
    setSummaryError(null);

    savingsService
      .getByMember(member.id)
      .then((data) => {
        setSummary({
          activeLoanId: data?.activeLoanId ?? null,
          activeLoanSavings: Number(data?.activeLoanSavings ?? 0),
        });
      })
      .catch((err: any) => {
        const message =
          err?.response?.data?.message ||
          err?.message ||
          "Unable to load savings information.";
        setSummaryError(
          Array.isArray(message) ? (message[0] as string) : String(message)
        );
        setSummary({
          activeLoanId: null,
          activeLoanSavings: 0,
        });
      })
      .finally(() => {
        setSummaryLoading(false);
      });
  }, [open, member]);

  const handleSubmit = async () => {
    if (!member) {
      setError("No member selected.");
      return;
    }

    if (!summary?.activeLoanId) {
      setError("This member has no active loan to attach savings to.");
      return;
    }

    const numericAmount = Number.parseFloat(amount || "0");
    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      setError("Savings amount must be greater than 0.");
      return;
    }

    if (isWithdraw && numericAmount > currentSavings) {
      setError("Withdrawal amount cannot exceed available savings.");
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const payload = {
        memberId: member.id,
        loanId: summary.activeLoanId || undefined,
        amount: numericAmount,
      };

      const response = isWithdraw
        ? await savingsService.withdraw(payload)
        : await savingsService.deposit(payload);

      const updatedSavings =
        response?.loan?.savings ??
        (isWithdraw
          ? Math.max(currentSavings - numericAmount, 0)
          : currentSavings + numericAmount);
      const updatedLoanId =
        response?.loan?.id ?? summary.activeLoanId ?? null;

      setSummary({
        activeLoanId: updatedLoanId,
        activeLoanSavings: updatedSavings,
      });
      setSuccessMessage(
        isWithdraw
          ? "Savings withdrawal recorded successfully."
          : "Savings deposit recorded successfully."
      );
      setAmount("");
      onSuccess();
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        `Unable to record savings ${isWithdraw ? "withdrawal" : "deposit"}. Please try again.`;
      setError(
        Array.isArray(message) ? (message[0] as string) : String(message)
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleSuccessClose = () => {
    setSuccessMessage(null);
  };

  const disableSubmit =
    processing ||
    summaryLoading ||
    !amount.trim() ||
    Number.isNaN(previewAmount) ||
    previewAmount <= 0 ||
    !summary?.activeLoanId ||
    insufficientFunds;

  return (
    <>
      <Snackbar
        open={Boolean(successMessage)}
        autoHideDuration={3000}
        onClose={handleSuccessClose}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert onClose={handleSuccessClose} severity="success" sx={{ width: "100%" }}>
          {successMessage}
        </Alert>
      </Snackbar>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Savings sx={{ color: "#f59e0b" }} />
          Manage Savings
        </DialogTitle>

        <DialogContent dividers>
          {summaryError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {summaryError}
            </Alert>
          )}

          {!summaryLoading && !summary?.activeLoanId && !summaryError ? (
            <Alert severity="warning" sx={{ mb: 2 }}>
              This member does not currently have an active loan. Savings
              transactions require an active loan to attach funds to.
            </Alert>
          ) : null}

          {error && (
            <Alert
              severity="error"
              sx={{ mb: 2 }}
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          )}

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <ToggleButtonGroup
              color="primary"
              value={mode}
              exclusive
              onChange={(_, value) => value && setMode(value)}
              sx={{ alignSelf: "center" }}
            >
              <ToggleButton value="deposit">Deposit</ToggleButton>
              <ToggleButton value="withdraw">Withdraw</ToggleButton>
            </ToggleButtonGroup>

            <Card
              variant="outlined"
              sx={{
                backgroundColor: "#fffbeb",
                borderColor: "#f59e0b",
              }}
            >
              <CardContent>
                <Typography
                  variant="subtitle1"
                  sx={{ fontWeight: 600, color: "#92400e", mb: 1 }}
                >
                  Current Savings Balance
                </Typography>
                {summaryLoading ? (
                  <CircularProgress size={24} />
                ) : (
                  <Typography
                    variant="h4"
                    sx={{ fontWeight: 700, color: "#92400e" }}
                  >
                    {formatCurrency(currentSavings)}
                  </Typography>
                )}
              </CardContent>
            </Card>

            <TextField
              label={isWithdraw ? "Withdrawal Amount" : "Deposit Amount"}
              type="number"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              InputProps={{
                startAdornment: (
                  <Typography sx={{ mr: 1, color: "#6b7280" }}>₱</Typography>
                ),
              }}
              helperText={
                isWithdraw
                  ? insufficientFunds
                    ? "Withdrawal amount exceeds available savings."
                    : "Enter the amount to withdraw from the member's savings."
                  : "Enter the amount to add to the member's savings."
              }
              error={insufficientFunds}
              fullWidth
              inputProps={{ min: 0, step: "0.01" }}
            />
            <Card variant="outlined" sx={{ backgroundColor: "#f8fafc" }}>
              <CardContent>
                <Typography variant="subtitle2" sx={{ color: "#64748b" }}>
                  Active Loan Overview
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Typography variant="body2" sx={{ color: "#1e293b" }}>
                  Loan Status:{" "}
                  <strong>
                    {summary?.activeLoanId ? "Active" : "Not Available"}
                  </strong>
                </Typography>
                <Typography variant="body2" sx={{ color: "#1e293b" }}>
                  Savings After Transaction:
                  <strong> {formatCurrency(projectedSavings)}</strong>
                </Typography>
              </CardContent>
            </Card>
          </Box>
        </DialogContent>

        <DialogActions
          sx={{
            p: 3,
            backgroundColor: "#f8fafc",
            borderTop: "1px solid #e2e8f0",
          }}
        >
          <Button onClick={onClose} size="large">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            size="large"
            disabled={disableSubmit}
            startIcon={processing ? <CircularProgress size={18} /> : <Savings />}
            sx={{
              background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
              "&:hover": {
                background: "linear-gradient(135deg, #d97706 0%, #b45309 100%)",
              },
            }}
          >
            {processing
              ? "Processing..."
              : mode === "withdraw"
                ? "Withdraw"
                : "Deposit"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default SavingsDepositDialog;
