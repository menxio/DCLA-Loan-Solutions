import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
  Alert,
  CircularProgress,
  Paper,
  Grid,
  Chip,
  Snackbar,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import {
  Close,
  Add,
  AccountBalance,
  TrendingUp,
  Savings,
  Schedule,
} from "@mui/icons-material";
import type { Loan } from "../types";
import type { Member } from "@features/member/types";
import { LoansAPI } from "../api";
import LoanForm from "./LoanForm";
import { calculateLoanDetails, formatCurrency } from "../utils/loanCalculations";
import { generateLoanPassbookPDF } from "@components/export/loanPassbookPDF";

interface LoanModalProps {
  open: boolean;
  member: Member;
  onClose: () => void;
  onLoanCreated?: () => void;
}

export default function LoanModal({
  open,
  member,
  onClose,
  onLoanCreated,
}: LoanModalProps) {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(false);
  const [creatingLoan, setCreatingLoan] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [termDialogOpen, setTermDialogOpen] = useState(false);
  const [termValue, setTermValue] = useState<4 | 8 | 12>(4);
  const [termUpdating, setTermUpdating] = useState(false);
  const [termMessage, setTermMessage] = useState<string | null>(null);
  const [termError, setTermError] = useState<string | null>(null);

  // Get the active loan (should be only one)
  const activeLoan = loans.find(loan => loan.status === 'active');
  const hasActiveLoan = Boolean(activeLoan);
  const canEditTerm =
    hasActiveLoan && Number(activeLoan?.weeksPaid || 0) === 0;
  const termPreview = useMemo(() => {
    if (!activeLoan) return null;
    const calc = calculateLoanDetails(
      Number(activeLoan.principalAmount),
      termValue
    );
    return calc.weeklyPaymentAmount;
  }, [activeLoan?.principalAmount, termValue]);
  const isSameTerm = activeLoan
    ? termValue === (activeLoan.termWeeks as 4 | 8 | 12)
    : true;

  // Load member's loans when modal opens
  useEffect(() => {
    if (open) {
      loadLoans();
    }
  }, [open, member.id]);

  useEffect(() => {
    if (activeLoan) {
      setTermValue(activeLoan.termWeeks as 4 | 8 | 12);
    }
  }, [activeLoan?.termWeeks]);

  const loadLoans = async () => {
    try {
      setLoading(true);
      setError(null);
      const memberLoans = await LoansAPI.getByMember(member.id);
      // Sort by createdAt desc so newest first
      const sorted = [...memberLoans].sort(
        (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setLoans(sorted);
    } catch (err) {
      setError("Failed to load loans");
      console.error("Error loading loans:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenTermDialog = () => {
    if (!activeLoan) return;
    setTermValue(activeLoan.termWeeks as 4 | 8 | 12);
    setTermError(null);
    setTermDialogOpen(true);
  };

  const handleCloseTermDialog = () => {
    if (termUpdating) return;
    setTermDialogOpen(false);
    setTermError(null);
  };

  const handleUpdateTerm = async () => {
    if (!activeLoan) return;
    setTermUpdating(true);
    setTermError(null);
    try {
      await LoansAPI.updateTerm(activeLoan.id, { termWeeks: termValue });
      setTermDialogOpen(false);
      setTermMessage("Term weeks updated successfully.");
      await loadLoans();
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Unable to update term weeks.";
      setTermError(
        Array.isArray(message) ? (message[0] as string) : String(message)
      );
    } finally {
      setTermUpdating(false);
    }
  };

  const handleCloseTermMessage = () => setTermMessage(null);

  const handleCreateLoan = async (formData: any) => {
    try {
      setLoading(true);
      await LoansAPI.create({
        borrowerId: member.id,
        ...formData,
      });
      await loadLoans(); // Reload loans
      setCreatingLoan(false);
      onLoanCreated?.();
    } catch (err) {
      throw err; // Let LoanForm handle the error
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setCreatingLoan(false);
      setError(null);
      onClose();
    }
  };

  const handleExportPassbook = async () => {
    if (!activeLoan) return;

    // Use loanCreatedDate if available, otherwise fall back to createdAt
    const releaseDate = (activeLoan as any).loanCreatedDate 
      ? new Date((activeLoan as any).loanCreatedDate)
      : new Date(activeLoan.createdAt);

    // Map activeLoan and member data to your PDF function's expected args
    const memberData = {
      firstName: member.firstName,
      lastName: member.lastName,
      middleName: member.middleName || '',
      contactNumber: member.contactNumber,
      centerLeader: (member as any)?.center?.leader || '',
    };

    const loanData = {
      principalAmount: activeLoan.principalAmount,
      weeklyPaymentAmount: activeLoan.weeklyPaymentAmount,
      termWeek: activeLoan.termWeeks,
      savings: Number(activeLoan.savings || 0),
      weeksPaid: activeLoan.weeksPaid,
      createdAt: releaseDate.toISOString(), // Use loan creation date for accurate passbook
    };

    console.log("Generating PDF with:", memberData, loanData);
    console.log("Using loan creation date:", releaseDate.toLocaleDateString());

    try {
      const schedule = await LoansAPI.getRepaymentSchedule(activeLoan.id);
      // Align schedule to the member center's collection day if available (fallback only)
      const collectionDay = member.center?.collectionDay; // e.g., 'Friday'
      await generateLoanPassbookPDF(
        memberData,
        loanData,
        schedule,
        false,
        collectionDay || undefined
      );
    } catch (err) {
      console.error("Failed to export passbook:", err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "primary";
      case "paid":
        return "success";
      case "defaulted":
        return "error";
      case "netoff":
        return "warning";
      case "payoff":
        return "info";
      default:
        return "default";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return "Active";
      case "paid":
        return "Paid";
      case "defaulted":
        return "Defaulted";
      case "netoff":
        return "Net Off";
      case "payoff":
        return "Pay Off";
      default:
        return status;
    }
  };

  return (
    <>
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="md"
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
          pb: 1,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <AccountBalance sx={{ color: "#3b82f6" }} />
          <Typography variant="h6" fontWeight={600}>
            {creatingLoan ? "Create Loan" : "Loan"} - {member.firstName} {member.lastName}
          </Typography>
        </Box>
        <IconButton onClick={handleClose} disabled={loading} size="small">
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        {loading && !creatingLoan ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
            <CircularProgress />
          </Box>
        ) : creatingLoan ? (
          <LoanForm
            memberId={member.id}
            memberName={`${member.firstName} ${member.lastName}`}
            onSubmit={handleCreateLoan}
            onCancel={() => setCreatingLoan(false)}
            loading={loading}
            isFirstLoan={loans.length === 0}
          />
        ) : !hasActiveLoan ? (
          // No active loan - show create loan option
          <Box>
            <Paper
              sx={{
                p: 4,
                textAlign: "center",
                background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
                border: "2px dashed #cbd5e1",
                mb: 4,
              }}
            >
              <AccountBalance sx={{ fontSize: 64, color: "#64748b", mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No Active Loan
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                This member doesn't have an active loan. Create a new loan to get started.
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setCreatingLoan(true)}
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
                Create New Loan
              </Button>
            </Paper>
          </Box>
        ) : (
          // Show active loan
          <Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: "#1e293b" }}>
                Current Loan
              </Typography>
              <Chip
                label={getStatusLabel(activeLoan!.status)}
                color={getStatusColor(activeLoan!.status) as any}
                size="small"
              />
            </Box>

            <Paper
              sx={{
                p: 3,
                background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
                border: "1px solid #e2e8f0",
                "&:hover": {
                  borderColor: "#3b82f6",
                  boxShadow: "0 4px 12px rgba(59, 130, 246, 0.1)",
                },
              }}
            >
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: "#1e293b" }}>
                  Loan #{activeLoan!.id.slice(0, 8)}...
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Loan Created: {(activeLoan as any).loanCreatedDate 
                    ? new Date((activeLoan as any).loanCreatedDate).toLocaleDateString()
                    : new Date(activeLoan!.createdAt).toLocaleDateString()}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.75rem" }}>
                  Record Created: {new Date(activeLoan!.createdAt).toLocaleDateString()}
                </Typography>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={4}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                    <TrendingUp sx={{ fontSize: 16, color: "#64748b" }} />
                    <Typography variant="body2" color="text.secondary">
                      Principal
                    </Typography>
                  </Box>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: "#1e293b" }}>
                    {formatCurrency(activeLoan!.principalAmount)}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6} md={4}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                    <AccountBalance sx={{ fontSize: 16, color: "#64748b" }} />
                    <Typography variant="body2" color="text.secondary">
                      Total Amount
                    </Typography>
                  </Box>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: "#1e293b" }}>
                    {formatCurrency(activeLoan!.totalAmount)}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6} md={4}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                    <Schedule sx={{ fontSize: 16, color: "#64748b" }} />
                    <Typography variant="body2" color="text.secondary">
                      Weekly Payment
                    </Typography>
                  </Box>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: "#1e293b" }}>
                    {formatCurrency(activeLoan!.weeklyPaymentAmount)}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6} md={4}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                    <Schedule sx={{ fontSize: 16, color: "#64748b" }} />
                    <Typography variant="body2" color="text.secondary">
                      Progress
                    </Typography>
                  </Box>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: "#1e293b" }}>
                    {activeLoan!.weeksPaid}/{activeLoan!.termWeeks} weeks
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6} md={4}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                    <Savings sx={{ fontSize: 16, color: "#64748b" }} />
                    <Typography variant="body2" color="text.secondary">
                      Savings
                    </Typography>
                  </Box>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: "#1e293b" }}>
                    {formatCurrency(Number(activeLoan!.savings || 0))}
                  </Typography>
                </Grid>

                {typeof (activeLoan as any)?.netCashReleased !== "undefined" && (
                  <Grid item xs={12} sm={6} md={4}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                      <Savings sx={{ fontSize: 16, color: "#64748b" }} />
                      <Typography variant="body2" color="text.secondary">
                        Net Cash Released
                      </Typography>
                    </Box>
                    <Typography variant="body1" sx={{ fontWeight: 700 }}>
                      {formatCurrency((activeLoan as any).netCashReleased || 0)}
                    </Typography>
                  </Grid>
                )}
              </Grid>


            </Paper>

          </Box>
        )}

        {/* Show loan history if there are any loans (active or past) */}
        {loans.length > 0 && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: "#1e293b", mb: 2 }}>
              Loan History
            </Typography>
            <Grid container spacing={2}>
              {loans.map((loan) => (
                <Grid item xs={12} key={loan.id}>
                  <Paper
                    sx={{
                      p: 2,
                      background: loan.status === 'active' 
                        ? "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)" 
                        : "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
                      border: loan.status === 'active' 
                        ? "1px solid #3b82f6" 
                        : "1px solid #cbd5e1",
                    }}
                  >
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Box>
                        <Typography variant="body1" sx={{ fontWeight: 600, color: "#1e293b" }}>
                          Loan #{loan.id.slice(0, 8)}... - {getStatusLabel(loan.status)}
                          {loan.status === 'active' && (
                            <Chip 
                              label="CURRENT" 
                              size="small" 
                              sx={{ 
                                ml: 1, 
                                backgroundColor: "#3b82f6", 
                                color: "white",
                                fontSize: "0.7rem",
                                height: 20
                              }} 
                            />
                          )}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {formatCurrency(loan.principalAmount)} • {loan.termWeeks} weeks • 
                          {(loan as any).loanCreatedDate 
                            ? new Date((loan as any).loanCreatedDate).toLocaleDateString()
                            : new Date(loan.createdAt).toLocaleDateString()}
                        </Typography>
                      </Box>
                      <Chip
                        label={getStatusLabel(loan.status)}
                        color={getStatusColor(loan.status) as any}
                        size="small"
                      />
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}
      </DialogContent>
      {!creatingLoan && hasActiveLoan && (
        <DialogActions>
          <Button onClick={handleClose} sx={{ color: "#64748b" }}>
            Close
          </Button>
          {canEditTerm && (
            <Button
              variant="outlined"
              onClick={handleOpenTermDialog}
              sx={{
                borderColor: "#3b82f6",
                color: "#3b82f6",
                "&:hover": {
                  borderColor: "#2563eb",
                  backgroundColor: "#dbeafe",
                },
              }}
            >
              Adjust Term
            </Button>
          )}
          <Button variant="contained" onClick={handleExportPassbook}>
            Download Passbook
          </Button>
        </DialogActions>
      )}
    </Dialog>
    <Dialog
      open={termDialogOpen}
      onClose={handleCloseTermDialog}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle>Adjust Term Weeks</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          This action is only available before the first repayment is recorded.
        </Typography>
        {termError && (
          <Alert
            severity="error"
            sx={{ mb: 2 }}
            onClose={() => setTermError(null)}
          >
            {termError}
          </Alert>
        )}
        <ToggleButtonGroup
          color="primary"
          value={termValue}
          exclusive
          onChange={(_, value) => value && setTermValue(value)}
          sx={{ mb: 2, display: "flex", justifyContent: "center" }}
        >
          {[4, 8, 12].map((term) => (
            <ToggleButton key={term} value={term}>
              {term} Weeks
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        {termPreview !== null && (
          <Box sx={{ textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary">
              Weekly Payment Preview
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {formatCurrency(termPreview)}
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCloseTermDialog}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleUpdateTerm}
          disabled={termUpdating || isSameTerm}
        >
          {termUpdating ? "Updating..." : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
    <Snackbar
      open={Boolean(termMessage)}
      autoHideDuration={3000}
      onClose={handleCloseTermMessage}
      anchorOrigin={{ vertical: "top", horizontal: "center" }}
    >
      <Alert
        onClose={handleCloseTermMessage}
        severity="success"
        sx={{ width: "100%" }}
      >
        {termMessage}
      </Alert>
    </Snackbar>
    </>
  );
} 
