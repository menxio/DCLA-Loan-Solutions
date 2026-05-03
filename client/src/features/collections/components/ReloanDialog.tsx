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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Divider,
} from "@mui/material"
import { AccountBalance, Calculate, TrendingUp } from "@mui/icons-material"
import { useState, useEffect, useMemo } from "react"
import { loansClient } from "../api"

interface Loan {
  id: string
  status: string
  weeksPaid?: number
}

interface MemberWithLoans {
  id: string
  firstName: string
  lastName: string
  totalBalance: number
  loans: Loan[]
}

interface ReloanDialogProps {
  open: boolean
  member: MemberWithLoans | null
  onClose: () => void
  onSuccess: () => void
  formatCurrency: (amount: number) => string
}

export function ReloanDialog({ open, member, onClose, onSuccess, formatCurrency }: ReloanDialogProps) {
  const [reloanPrincipal, setReloanPrincipal] = useState("")
  const [reloanTerm, setReloanTerm] = useState<4 | 8 | 12>(12)
  const [reloanMode, setReloanMode] = useState<"payoff" | "netoff">("netoff")
  const [serviceCharge, setServiceCharge] = useState("")
  const [notarialFee, setNotarialFee] = useState("")
  const [savings, setSavings] = useState("")
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [eligibility, setEligibility] = useState<any>(null)
  const [loadingEligibility, setLoadingEligibility] = useState(false)

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open && member) {
      const activeLoan = member.loans?.find((l) => l.status === "active")
      setReloanPrincipal("")
      setReloanTerm(12)
      setReloanMode("netoff")
      setServiceCharge("")
      setNotarialFee("")
      setSavings("")
      setError(null)
      setEligibility(null)

      // Check eligibility
      if (activeLoan) {
        checkEligibility(activeLoan.id)
      }
    }
  }, [open, member])

  const checkEligibility = async (loanId: string) => {
    setLoadingEligibility(true)
    try {
      const result = await loansClient.checkEligibilityByLoan(loanId)
      setEligibility(result)
    } catch (error) {
      console.error("Failed to check eligibility:", error)
      setError("Failed to check reloan eligibility")
    } finally {
      setLoadingEligibility(false)
    }
  }

  // Calculate net cash released
  const netCashReleased = useMemo(() => {
    if (!member) return 0

    const principal = Number(reloanPrincipal) || 0
    const fee = Number(serviceCharge) || 0
    const legalFee = Number(notarialFee) || 0
    const savingsAmt = Number(savings) || 0
    const oldBalance = Number(member.totalBalance) || 0

    if (reloanMode === "payoff") {
      return Math.max(0, principal - fee - legalFee - savingsAmt)
    } else {
      return Math.max(0, principal - oldBalance - fee - legalFee - savingsAmt)
    }
  }, [reloanPrincipal, serviceCharge, notarialFee, savings, member, reloanMode])

  const handleSubmit = async () => {
    if (!member) return

    setProcessing(true)
    setError(null)

    try {
      const principal = Number(reloanPrincipal)
      if (principal <= 0) {
        throw new Error("Principal amount must be greater than 0")
      }

      const activeLoan = member.loans?.find((l) => l.status === "active")
      if (!activeLoan) {
        throw new Error("No active loan found for member")
      }

      await loansClient.reloan(activeLoan.id, {
        newPrincipalAmount: principal,
        newTermWeeks: reloanTerm,
        mode: reloanMode,
        serviceCharge: Number(serviceCharge) || 0,
        notarialFee: Number(notarialFee) || 0,
        ...(savings !== "" ? { savings: Number(savings) || 0 } : {}),
      })

      onSuccess()
    } catch (error) {
      console.error("Failed to process reloan:", error)
      setError(error instanceof Error ? error.message : "Failed to process reloan")
    } finally {
      setProcessing(false)
    }
  }

  if (!member) return null

  const activeLoan = member.loans?.find((l) => l.status === "active")
  const weeksPaid = (activeLoan as any)?.weeksPaid ?? 0
  const existingSavings = Number((activeLoan as any)?.savings ?? 0)

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
          background: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
          color: "white",
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <AccountBalance />
        <Box>
          <Typography variant="h6">Process Reloan</Typography>
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

        {/* Eligibility Check */}
        {loadingEligibility ? (
          <Card sx={{ mb: 3, border: "1px solid #e2e8f0" }}>
            <CardContent sx={{ textAlign: "center" }}>
              <CircularProgress size={24} sx={{ mb: 1 }} />
              <Typography variant="body2">Checking reloan eligibility...</Typography>
            </CardContent>
          </Card>
        ) : eligibility ? (
          <Card
            sx={{
              mb: 3,
              border: `1px solid ${eligibility.eligible ? "#10b981" : "#ef4444"}`,
              backgroundColor: eligibility.eligible ? "#f0fdf4" : "#fef2f2",
            }}
          >
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                <Chip
                  label={eligibility.eligible ? "ELIGIBLE" : "NOT ELIGIBLE"}
                  color={eligibility.eligible ? "success" : "error"}
                  sx={{ fontWeight: 600 }}
                />
              </Box>
              <Typography variant="body2" color="text.secondary">
                {eligibility.message ||
                  (eligibility.eligible ? "Member is eligible for reloan" : "Member is not eligible for reloan")}
              </Typography>
            </CardContent>
          </Card>
        ) : null}

        {/* Current Loan Information */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <Card sx={{ height: "100%", border: "1px solid #e2e8f0" }}>
              <CardContent>
                <Typography
                  variant="h6"
                  sx={{ mb: 2, color: "#1e293b", display: "flex", alignItems: "center", gap: 1 }}
                >
                  <TrendingUp sx={{ color: "#ef4444" }} />
                  Current Balance
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: "#ef4444" }}>
                  {formatCurrency(member.totalBalance)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{ height: "100%", border: "1px solid #e2e8f0" }}>
              <CardContent>
                <Typography
                  variant="h6"
                  sx={{ mb: 2, color: "#1e293b" }}
                >
                  Payments Made
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: "#3b82f6" }}>
                  {weeksPaid} weeks
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{ height: "100%", border: "1px solid #e2e8f0" }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, color: "#1e293b" }}>
                  Existing Savings
                </Typography>
                <Typography
                  variant="h4"
                  sx={{ fontWeight: 700, color: existingSavings > 0 ? "#0f766e" : "#6b7280" }}
                >
                  {formatCurrency(existingSavings)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  These savings stay with the member and are carried into the new loan automatically.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* Reloan Configuration */}
        <Typography variant="h6" sx={{ mb: 3, color: "#1e293b", display: "flex", alignItems: "center", gap: 1 }}>
          <Calculate />
          Reloan Configuration
        </Typography>

        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="New Principal Amount"
              type="number"
              value={reloanPrincipal}
              onChange={(e) => setReloanPrincipal(e.target.value)}
              
              inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
              InputProps={{
                startAdornment: <Typography sx={{ mr: 1, color: "#6b7280" }}>₱</Typography>,
              }}
              helperText="Enter the new loan principal amount"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Term (Weeks)</InputLabel>
              <Select value={reloanTerm} label="Term (Weeks)" onChange={(e) => setReloanTerm(e.target.value as 4 | 8 | 12)}>
                <MenuItem value={4}>4 weeks</MenuItem>
                <MenuItem value={8}>8 weeks</MenuItem>
                <MenuItem value={12}>12 weeks</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Reloan Mode</InputLabel>
              <Select
                value={reloanMode}
                label="Reloan Mode"
                onChange={(e) => setReloanMode(e.target.value as "payoff" | "netoff")}
              >
                <MenuItem value="netoff">Net Off (Deduct old balance)</MenuItem>
                <MenuItem value="payoff">Pay Off (Full principal release)</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Service Charge"
              type="number"
              value={serviceCharge}
              onChange={(e) => setServiceCharge(e.target.value)}
              
              inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
              InputProps={{
                startAdornment: <Typography sx={{ mr: 1, color: "#6b7280" }}>₱</Typography>,
              }}
              helperText="Processing fee for the reloan"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Notarial Fee"
              type="number"
              value={notarialFee}
              onChange={(e) => setNotarialFee(e.target.value)}
              
              inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
              InputProps={{
                startAdornment: <Typography sx={{ mr: 1, color: "#6b7280" }}>₱</Typography>,
              }}
              helperText="Legal/notarial fee for the reloan"
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Savings (optional)"
              type="number"
              value={savings}
              onChange={(e) => setSavings(e.target.value)}
              
              inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
              InputProps={{
                startAdornment: <Typography sx={{ mr: 1, color: "#6b7280" }}>₱</Typography>,
              }}
              helperText="Set or adjust savings to carry on the new loan"
            />
          </Grid>
        </Grid>

        {/* Net Cash Released Preview */}
        <Card
          sx={{
            backgroundColor: "#f0f9ff",
            border: "2px solid #3b82f6",
            borderRadius: 3,
          }}
        >
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, color: "#1e293b", display: "flex", alignItems: "center", gap: 1 }}>
              <Calculate sx={{ color: "#3b82f6" }} />
              Net Cash Released (Preview)
            </Typography>

            <Grid container spacing={2} sx={{ mb: 2,  }}>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">
                  New Principal:
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {formatCurrency(Number(reloanPrincipal) || 0)}
                </Typography>
              </Grid>

              {reloanMode === "netoff" && (
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">
                    Less: Old Balance:
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: "#ef4444" }}>
                    -{formatCurrency(member.totalBalance)}
                  </Typography>
                </Grid>
              )}

              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">
                  Less: Service Charge:
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600, color: "#f59e0b" }}>
                  -{formatCurrency(Number(serviceCharge) || 0)}
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">
                  Less: Notarial Fee:
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600, color: "#f59e0b" }}>
                  -{formatCurrency(Number(notarialFee) || 0)}
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">
                  Less: Savings:
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600, color: "#f59e0b" }}>
                  -{formatCurrency(Number(savings) || 0)}
                </Typography>
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Net Cash to be Released:
              </Typography>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  color: netCashReleased > 0 ? "#10b981" : "#ef4444",
                }}
              >
                {formatCurrency(netCashReleased)}
              </Typography>
              {netCashReleased <= 0 && (
                <Typography variant="caption" color="error.main">
                  No cash will be released with current configuration
                </Typography>
              )}
            </Box>
          </CardContent>
        </Card>
      </DialogContent>

      <DialogActions sx={{ p: 3, backgroundColor: "#f8fafc" }}>
        <Button onClick={onClose} size="large">
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={processing || !member || netCashReleased < 0 || !eligibility?.eligible}
          startIcon={processing ? <CircularProgress size={16} /> : <AccountBalance />}
          size="large"
          sx={{
            background: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
            "&:hover": {
              background: "linear-gradient(135deg, #047857 0%, #059669 100%)",
            },
          }}
        >
          {processing ? "Processing..." : "Confirm Reloan"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
