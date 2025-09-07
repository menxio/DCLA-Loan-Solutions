import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Grid,
  Card,
  CardContent,
  Avatar,
  TextField,
  Dialog as PaymentDialog,
  DialogTitle as PaymentDialogTitle,
  DialogContent as PaymentDialogContent,
  DialogActions as PaymentDialogActions,
  Alert,
  CircularProgress,
  Tooltip,
} from "@mui/material";
import {
  Close,
  CalendarToday,
  LocationOn,
  People,
  CheckCircle,
  Schedule,
  Warning,
  Payment,
  Download,
} from "@mui/icons-material";
import { useState, useEffect } from "react";
import type { DailyCollectionGroup, Collection, Member } from "../types";
import collectionsService, { loansClient } from "../api";
import { exportToExcel } from "../utils/exportUtils";

interface Loan {
  id: string;
  amount: number;
  balance: number;
  status: string;
  dueDate: string;
}

interface MemberWithLoans extends Member {
  loans: Loan[];
  totalLoanAmount: number;
  totalBalance: number;
  overallAmount: number; // Loan amount + interest
  weeklyPaymentAmount: number;
  totalTermWeeks: number;
  totalSavings: number;
  collection?: Collection;
}

interface CollectionDetailsModalProps {
  open: boolean;
  collectionGroup?: DailyCollectionGroup;
  onClose: () => void;
  onEditCollection?: (collection: Collection) => void;
}

export default function CollectionDetailsModal({
  open,
  collectionGroup,
  onClose,
}: CollectionDetailsModalProps) {
  const [members, setMembers] = useState<MemberWithLoans[]>([]);
  const [loading, setLoading] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberWithLoans | null>(
    null
  );
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [processingPayment, setProcessingPayment] = useState(false);
  const [useSavings, setUseSavings] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  // Reloan dialog state
  const [reloanOpen, setReloanOpen] = useState(false);
  const [reloanMember, setReloanMember] = useState<MemberWithLoans | null>(
    null
  );
  const [reloanPrincipal, setReloanPrincipal] = useState<string>("");
  const [reloanTerm, setReloanTerm] = useState<8 | 12>(12);
  const [reloanMode, setReloanMode] = useState<"payoff" | "netoff">("netoff");
  const [serviceCharge, setServiceCharge] = useState<string>("500");
  const [processingReloan, setProcessingReloan] = useState(false);

  // Fetch all members for this center when modal opens
  useEffect(() => {
    if (open && collectionGroup) {
      fetchCenterMembers();
    }
  }, [open, collectionGroup]);

  const fetchCenterMembers = async () => {
    if (!collectionGroup) return;

    setLoading(true);
    try {
      // Fetch center members with loan information
      const centerMembers = await collectionsService.getCenterMembers(
        collectionGroup.centerId
      );

      // Map the data to include collection information
      const membersWithCollections = centerMembers.map((member: any) => ({
        ...member,
        collection: collectionGroup.collections.find(
          (c) => c.memberId === member.id
        ),
      }));

      setMembers(membersWithCollections);
    } catch (error) {
      console.error("Failed to fetch center members:", error);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  const openPaymentDialog = (member: MemberWithLoans) => {
    setSelectedMember(member);
    setPaymentAmount("");
    setPaymentNotes("");
    setUseSavings(false);
    setPaymentDialogOpen(true);
  };

  const openReloanDialog = (member: MemberWithLoans) => {
    setReloanMember(member);
    setReloanPrincipal(
      String(Math.max(0, Number(member.totalLoanAmount) || 0))
    );
    setReloanTerm(12);
    setReloanMode("netoff");
    setServiceCharge("500");
    setReloanOpen(true);
  };

  const processPayment = async () => {
    if (!selectedMember || !paymentAmount) return;

    setProcessingPayment(true);
    try {
      const amount = parseFloat(paymentAmount);

      // Post repayment to backend; let loans service handle balances and weeks paid
      const activeLoan = selectedMember.loans.find(
        (l) => l.status === "active"
      );
      if (!activeLoan) {
        throw new Error("No active loan found for member");
      }

      await collectionsService.createRepayment({
        loanId: activeLoan.id,
        memberId: selectedMember.id,
        centerId: collectionGroup!.centerId,
        amount,
        notes: paymentNotes,
        useSavings,
      });

      // Refresh data
      await fetchCenterMembers();
      setPaymentDialogOpen(false);
      setSelectedMember(null);
      setUseSavings(false);
    } catch (error) {
      console.error("Failed to process payment:", error);
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleExport = async () => {
    if (!collectionGroup || !members) return;

    setExporting(true);
    setExportError(null);

    try {
      await exportToExcel(collectionGroup, members);
    } catch (error) {
      console.error("Export failed:", error);
      setExportError(error instanceof Error ? error.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const getStatusColor = (member: MemberWithLoans) => {
    if (!member.collection) return "default";
    if (member.collection.paymentReceived >= member.weeklyPaymentAmount)
      return "success";
    if (member.collection.paymentReceived > 0) return "warning";
    return "error";
  };

  const getStatusLabel = (member: MemberWithLoans) => {
    if (!member.collection) return "NO COLLECTION";
    if (member.collection.paymentReceived >= member.weeklyPaymentAmount)
      return "PAID";
    if (member.collection.paymentReceived > 0) return "PARTIAL";
    return "UNPAID";
  };

  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString()}`;
  };

  // Don't render if no collection group
  if (!collectionGroup) {
    return null;
  }

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="xl"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
            maxHeight: "90vh",
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
            pb: 2,
            background: "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)",
          }}
        >
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
              {collectionGroup.centerName} - Collection Details
            </Typography>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                opacity: 0.9,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <CalendarToday sx={{ fontSize: 16 }} />
                <Typography variant="body2">
                  {collectionGroup.collectionDay}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <LocationOn sx={{ fontSize: 16 }} />
                <Typography variant="body2">
                  {collectionGroup.collectionDate}
                </Typography>
              </Box>
            </Box>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Tooltip title="Export to Excel">
              <IconButton
                onClick={handleExport}
                disabled={exporting}
                size="small"
                sx={{ color: "white" }}
              >
                {exporting ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <Download />
                )}
              </IconButton>
            </Tooltip>
            <IconButton onClick={onClose} size="small" sx={{ color: "white" }}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 0 }}>
          {/* Export Error Alert */}
          {exportError && (
            <Alert
              severity="error"
              sx={{ m: 2, borderRadius: 2 }}
              onClose={() => setExportError(null)}
            >
              {exportError}
            </Alert>
          )}

          {/* Summary Cards */}
          <Box sx={{ p: 3, backgroundColor: "#f8fafc" }}>
            <Grid container spacing={3}>
              <Grid item xs={6} md={3}>
                <Card sx={{ textAlign: "center", border: "1px solid #e2e8f0" }}>
                  <CardContent sx={{ p: 2 }}>
                    <Avatar
                      sx={{
                        bgcolor: "#1e3a8a",
                        mx: "auto",
                        mb: 1,
                        width: 40,
                        height: 40,
                      }}
                    >
                      <People />
                    </Avatar>
                    <Typography
                      variant="h6"
                      sx={{ fontWeight: 700, color: "#1e293b" }}
                    >
                      {collectionGroup.totalMembers}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Members
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} md={3}>
                <Card sx={{ textAlign: "center", border: "1px solid #e2e8f0" }}>
                  <CardContent sx={{ p: 2 }}>
                    <Avatar
                      sx={{
                        bgcolor: "#10b981",
                        mx: "auto",
                        mb: 1,
                        width: 40,
                        height: 40,
                      }}
                    >
                      <CheckCircle />
                    </Avatar>
                    <Typography
                      variant="h6"
                      sx={{ fontWeight: 700, color: "#1e293b" }}
                    >
                      {
                        collectionGroup.collections.filter((collection) => {
                          const member = members.find(
                            (m) => m.id === collection.memberId
                          );
                          // If a member is found, compare paymentReceived to the member's weeklyPaymentAmount
                          return member
                            ? collection.paymentReceived >=
                                member.weeklyPaymentAmount
                            : false;
                        }).length
                      }
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Paid
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} md={3}>
                <Card sx={{ textAlign: "center", border: "1px solid #e2e8f0" }}>
                  <CardContent sx={{ p: 2 }}>
                    <Avatar
                      sx={{
                        bgcolor: "#f59e0b",
                        mx: "auto",
                        mb: 1,
                        width: 40,
                        height: 40,
                      }}
                    >
                      <Schedule />
                    </Avatar>
                    <Typography
                      variant="h6"
                      sx={{ fontWeight: 700, color: "#1e293b" }}
                    >
                      {collectionGroup.pendingCollections}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Pending
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} md={3}>
                <Card sx={{ textAlign: "center", border: "1px solid #e2e8f0" }}>
                  <CardContent sx={{ p: 2 }}>
                    <Avatar
                      sx={{
                        bgcolor: "#ef4444",
                        mx: "auto",
                        mb: 1,
                        width: 40,
                        height: 40,
                      }}
                    >
                      <Warning />
                    </Avatar>
                    <Typography
                      variant="h6"
                      sx={{ fontWeight: 700, color: "#1e293b" }}
                    >
                      {
                        collectionGroup.collections.filter((collection) => {
                          const member = members.find(
                            (m) => m.id === collection.memberId
                          );
                          // If a member is found, compare paymentReceived to the member's weeklyPaymentAmount
                          return member
                            ? collection.paymentReceived <= 0
                            : false;
                        }).length
                      }
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Partial
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Total Amount Summary */}
            <Box
              sx={{
                mt: 3,
                p: 3,
                background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
                borderRadius: 2,
                border: "1px solid #e2e8f0",
              }}
            >
              <Typography
                variant="h6"
                sx={{ fontWeight: 600, color: "#1e293b", mb: 2 }}
              >
                Financial Summary
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <Card
                    sx={{ textAlign: "center", border: "1px solid #e2e8f0" }}
                  >
                    <CardContent sx={{ p: 2 }}>
                      <Typography
                        variant="h5"
                        sx={{ fontWeight: 700, color: "#1e3a8a", mb: 0.5 }}
                      >
                        {formatCurrency(
                          members.reduce(
                            (sum, member) => sum + (member.overallAmount || 0),
                            0
                          )
                        )}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Overall Amount
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Card
                    sx={{ textAlign: "center", border: "1px solid #e2e8f0" }}
                  >
                    <CardContent sx={{ p: 2 }}>
                      <Typography
                        variant="h5"
                        sx={{ fontWeight: 700, color: "#10b981", mb: 0.5 }}
                      >
                        {formatCurrency(collectionGroup.totalReceived)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Payment Received
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Card
                    sx={{ textAlign: "center", border: "1px solid #e2e8f0" }}
                  >
                    <CardContent sx={{ p: 2 }}>
                      <Typography
                        variant="h5"
                        sx={{ fontWeight: 700, color: "#ef4444", mb: 0.5 }}
                      >
                        {formatCurrency(
                          members.reduce(
                            (sum, member) => sum + (member.totalBalance || 0),
                            0
                          ) - collectionGroup.totalReceived
                        )}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Remaining Balance
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          </Box>

          {/* All Center Members Table */}
          <Box sx={{ p: 3 }}>
            <Typography
              variant="h6"
              sx={{ fontWeight: 600, color: "#1e293b", mb: 2 }}
            >
              All Center Members & Collection Status
            </Typography>

            {loading ? (
              <Box display="flex" justifyContent="center" p={3}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer
                component={Paper}
                sx={{
                  borderRadius: 2,
                  border: "1px solid #e2e8f0",
                  maxHeight: 500,
                  overflow: "auto",
                }}
              >
                <Table stickyHeader>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: "#f8fafc" }}>
                      <TableCell
                        sx={{
                          fontWeight: 600,
                          color: "#1e293b",
                          minWidth: 150,
                        }}
                      >
                        Client Name
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: 600,
                          color: "#1e293b",
                          minWidth: 120,
                        }}
                      >
                        Loan Amount (Total Loans)
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: 600,
                          color: "#1e293b",
                          minWidth: 120,
                        }}
                      >
                        Overall Amount (Principal + Interest)
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: 600,
                          color: "#1e293b",
                          minWidth: 120,
                        }}
                      >
                        Term Weeks
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: 600,
                          color: "#1e293b",
                          minWidth: 150,
                        }}
                      >
                        Amount Due/Collection Amount
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: 600,
                          color: "#1e293b",
                          minWidth: 130,
                        }}
                      >
                        Payment Received
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: 600,
                          color: "#1e293b",
                          minWidth: 130,
                        }}
                      >
                        Net Cash Released
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: 600,
                          color: "#1e293b",
                          minWidth: 120,
                        }}
                      >
                        No. of Payments
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: 600,
                          color: "#1e293b",
                          minWidth: 100,
                        }}
                      >
                        Savings
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: 600,
                          color: "#1e293b",
                          minWidth: 120,
                        }}
                      >
                        Remaining Balance
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: 600,
                          color: "#1e293b",
                          minWidth: 100,
                        }}
                      >
                        Remarks/Status
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: 600,
                          color: "#1e293b",
                          minWidth: 120,
                        }}
                      >
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {members.map((member, index) => (
                      <TableRow
                        key={member.id}
                        sx={{
                          "&:hover": { backgroundColor: "#f8fafc" },
                          backgroundColor:
                            index % 2 === 0 ? "#ffffff" : "#fafbfc",
                        }}
                      >
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {member.firstName} {member.lastName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {member.contactNumber}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {formatCurrency(member.totalLoanAmount)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 600, color: "#8b5cf6" }}
                          >
                            {formatCurrency(member.overallAmount || 0)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 600, color: "#06b6d4" }}
                          >
                            {member.totalTermWeeks || 0} weeks
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 600, color: "#1e3a8a" }}
                          >
                            {formatCurrency(member.weeklyPaymentAmount || 0)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Weekly Payment
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 600, color: "#10b981" }}
                          >
                            {member.collection
                              ? formatCurrency(
                                  member.collection.paymentReceived
                                )
                              : "₱0"}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 600, color: "#3b82f6" }}
                          >
                            {formatCurrency(member.collection?.netRelease || 0)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 600, color: "#8b5cf6" }}
                          >
                            {(() => {
                              const activeLoan = member.loans?.find(
                                (l) => l.status === "active"
                              );
                              // Prefer backend-tracked weeksPaid if available on active loan; fallback to collection.numberOfPayments
                              const weeksPaid: any = (activeLoan as any)
                                ?.weeksPaid;
                              return (
                                weeksPaid ??
                                member.collection?.numberOfPayments ??
                                0
                              );
                            })()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 600, color: "#f59e0b" }}
                          >
                            {formatCurrency(member.totalSavings || 0)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 600,
                              color:
                                member.collection &&
                                member.collection.paymentReceived >=
                                  member.collection.amount
                                  ? "#10b981"
                                  : "#ef4444",
                            }}
                          >
                            {member.collection
                              ? formatCurrency(
                                  member.collection.amount -
                                    member.collection.paymentReceived
                                )
                              : formatCurrency(member.totalBalance)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={getStatusLabel(member)}
                            color={getStatusColor(member) as any}
                            size="small"
                            sx={{ fontWeight: 600, minWidth: 70 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Tooltip title="Process Payment">
                            <Button
                              variant="outlined"
                              size="small"
                              startIcon={<Payment />}
                              onClick={() => openPaymentDialog(member)}
                              sx={{ minWidth: 100 }}
                            >
                              Payment
                            </Button>
                          </Tooltip>
                          <Tooltip title="Process Reloan">
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() => openReloanDialog(member)}
                              sx={{ ml: 1, minWidth: 100 }}
                            >
                              Reloan
                            </Button>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 3, backgroundColor: "#f8fafc" }}>
          <Button
            onClick={onClose}
            variant="contained"
            sx={{
              background: "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)",
              "&:hover": {
                background: "linear-gradient(135deg, #1e40af 0%, #2563eb 100%)",
              },
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Payment Processing Dialog */}
      <PaymentDialog
        open={paymentDialogOpen}
        onClose={() => setPaymentDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <PaymentDialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Payment />
            Process Payment
          </Box>
        </PaymentDialogTitle>
        <PaymentDialogContent>
          {selectedMember && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                {selectedMember.firstName} {selectedMember.lastName}
              </Typography>

              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Outstanding Balance:
                  </Typography>
                  <Typography variant="h6" color="error.main">
                    {formatCurrency(selectedMember.totalBalance)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Collection Amount:
                  </Typography>
                  <Typography variant="h6" color="primary.main">
                    {formatCurrency(
                      selectedMember.collection?.amount ||
                        selectedMember.totalBalance
                    )}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Weekly Payment:
                  </Typography>
                  <Typography variant="h6" color="info.main">
                    {formatCurrency(selectedMember.loans.find(l => l.status === 'active')?.weeklyPaymentAmount || 0)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Available Savings:
                  </Typography>
                  <Typography variant="h6" color="success.main">
                    {formatCurrency(selectedMember.loans.find(l => l.status === 'active')?.savings || 0)}
                  </Typography>
                </Grid>
              </Grid>

              <TextField
                fullWidth
                label="Payment Amount"
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                sx={{ mb: 2 }}
                InputProps={{
                  startAdornment: <Typography sx={{ mr: 1 }}>₱</Typography>,
                }}
              />

              {/* Savings Usage Option */}
              {(() => {
                const activeLoan = selectedMember.loans.find(l => l.status === 'active');
                const weeklyPayment = activeLoan?.weeklyPaymentAmount || 0;
                const availableSavings = activeLoan?.savings || 0;
                const paymentAmountNum = parseFloat(paymentAmount) || 0;
                const canUseSavings = paymentAmountNum < weeklyPayment && availableSavings > 0;
                
                return canUseSavings ? (
                  <Box sx={{ mb: 2, p: 2, backgroundColor: '#f0f9ff', borderRadius: 2, border: '1px solid #0ea5e9' }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Payment is short by {formatCurrency(weeklyPayment - paymentAmountNum)}. 
                      You can use savings to cover the difference.
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <input
                        type="checkbox"
                        id="useSavings"
                        checked={useSavings}
                        onChange={(e) => setUseSavings(e.target.checked)}
                      />
                      <label htmlFor="useSavings">
                        <Typography variant="body2">
                          Use {formatCurrency(Math.min(weeklyPayment - paymentAmountNum, availableSavings))} from savings
                        </Typography>
                      </label>
                    </Box>
                  </Box>
                ) : null;
              })()}

              <TextField
                fullWidth
                label="Notes (Optional)"
                multiline
                rows={3}
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="Enter payment notes..."
              />
            </Box>
          )}
        </PaymentDialogContent>
        <PaymentDialogActions>
          <Button onClick={() => setPaymentDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={processPayment}
            variant="contained"
            disabled={!paymentAmount || processingPayment}
            startIcon={
              processingPayment ? <CircularProgress size={16} /> : <Payment />
            }
          >
            {processingPayment ? "Processing..." : "Process Payment"}
          </Button>
        </PaymentDialogActions>
      </PaymentDialog>
      {/* Reloan Dialog */}
      <PaymentDialog
        open={reloanOpen}
        onClose={() => setReloanOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <PaymentDialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            Reloan
          </Box>
        </PaymentDialogTitle>
        <PaymentDialogContent>
          {reloanMember && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                {reloanMember.firstName} {reloanMember.lastName}
              </Typography>

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Old Remaining Balance
                  </Typography>
                  <Typography variant="h6" color="error.main">
                    {formatCurrency(reloanMember.totalBalance)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Weeks Paid
                  </Typography>
                  <Typography variant="h6">
                    {(() => {
                      const active = reloanMember.loans?.find(
                        (l) => l.status === "active"
                      );
                      return (active as any)?.weeksPaid ?? 0;
                    })()}
                  </Typography>
                </Grid>
              </Grid>

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="New Principal"
                    type="number"
                    value={reloanPrincipal}
                    onChange={(e) => setReloanPrincipal(e.target.value)}
                    InputProps={{
                      startAdornment: <Typography sx={{ mr: 1 }}>₱</Typography>,
                    }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Term Weeks"
                    type="number"
                    value={reloanTerm}
                    onChange={(e) =>
                      setReloanTerm(
                        (Number(e.target.value) === 8 ? 8 : 12) as 8 | 12
                      )
                    }
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Mode (payoff | netoff)"
                    value={reloanMode}
                    onChange={(e) =>
                      setReloanMode(
                        e.target.value === "payoff" ? "payoff" : "netoff"
                      )
                    }
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Service Charge"
                    type="number"
                    value={serviceCharge}
                    onChange={(e) => setServiceCharge(e.target.value)}
                    InputProps={{
                      startAdornment: <Typography sx={{ mr: 1 }}>₱</Typography>,
                    }}
                  />
                </Grid>
              </Grid>

              <Box sx={{ p: 2, border: "1px dashed #cbd5e1", borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Net Cash Released (preview)
                </Typography>
                <Typography variant="h6" color="primary.main">
                  {(() => {
                    const principal = Number(reloanPrincipal) || 0;
                    const fee = Number(serviceCharge) || 0;
                    const oldBal = Number(reloanMember.totalBalance) || 0;
                    const net =
                      reloanMode === "payoff"
                        ? principal - fee
                        : Math.max(0, principal - oldBal - fee);
                    return formatCurrency(net);
                  })()}
                </Typography>
              </Box>
            </Box>
          )}
        </PaymentDialogContent>
        <PaymentDialogActions>
          <Button onClick={() => setReloanOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={processingReloan || !reloanMember}
            onClick={async () => {
              if (!reloanMember) return;
              setProcessingReloan(true);
              try {
                const active = reloanMember.loans?.find(
                  (l) => l.status === "active"
                );
                if (!active) throw new Error("No active loan found");
                await loansClient.reloan(active.id, {
                  newPrincipalAmount: Number(reloanPrincipal) || 0,
                  newTermWeeks: reloanTerm,
                  mode: reloanMode,
                  serviceCharge: Number(serviceCharge) || 0,
                });
                await fetchCenterMembers();
                setReloanOpen(false);
                setReloanMember(null);
              } catch (e) {
                console.error("Failed to reloan", e);
              } finally {
                setProcessingReloan(false);
              }
            }}
          >
            {processingReloan ? "Processing..." : "Confirm Reloan"}
          </Button>
        </PaymentDialogActions>
      </PaymentDialog>
    </>
  );
}
