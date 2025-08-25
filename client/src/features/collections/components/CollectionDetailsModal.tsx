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
  AccountBalance,
  CreditCard,
} from "@mui/icons-material";
import { useState, useEffect } from "react";
import type { DailyCollectionGroup, Collection, Member } from "../types";
import collectionsService from "../api";

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
  onEditCollection,
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
      // Fallback to mock data if API fails
      const mockMembers: MemberWithLoans[] = [
        {
          id: "1",
          firstName: "Juan",
          lastName: "Dela Cruz",
          middleName: "Santos",
          contactNumber: "09123456789",
          address: "123 Main St, City",
          birthDate: "1990-01-01",
          center: {
            id: collectionGroup.centerId,
            name: collectionGroup.centerName,
            collectionDay: collectionGroup.collectionDay,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          } as any,
          loans: [
            {
              id: "loan1",
              amount: 50000,
              balance: 25000,
              status: "active",
              dueDate: "2024-12-31",
            },
          ],
          totalLoanAmount: 50000,
          totalBalance: 25000,
          overallAmount: 55000,
          weeklyPaymentAmount: 2500,
          totalTermWeeks: 22,
          totalSavings: 5000,
          collection: collectionGroup.collections.find(
            (c) => c.memberId === "1"
          ),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "2",
          firstName: "Maria",
          lastName: "Santos",
          middleName: "Garcia",
          contactNumber: "09187654321",
          address: "456 Oak Ave, Town",
          birthDate: "1985-05-15",
          center: {
            id: collectionGroup.centerId,
            name: collectionGroup.centerName,
            collectionDay: collectionGroup.collectionDay,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          } as any,
          loans: [
            {
              id: "loan2",
              amount: 30000,
              balance: 15000,
              status: "active",
              dueDate: "2024-11-30",
            },
          ],
          totalLoanAmount: 30000,
          totalBalance: 15000,
          overallAmount: 33000,
          weeklyPaymentAmount: 1500,
          totalTermWeeks: 20,
          totalSavings: 3000,
          collection: collectionGroup.collections.find(
            (c) => c.memberId === "2"
          ),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      setMembers(mockMembers);
    } finally {
      setLoading(false);
    }
  };

  const openPaymentDialog = (member: MemberWithLoans) => {
    setSelectedMember(member);
    setPaymentAmount("");
    setPaymentNotes("");
    setPaymentDialogOpen(true);
  };

  const processPayment = async () => {
    if (!selectedMember || !paymentAmount) return;

    setProcessingPayment(true);
    try {
      const amount = parseFloat(paymentAmount);

      if (selectedMember.collection) {
        // Update existing collection
        await collectionsService.updatePayment(selectedMember.collection.id, {
          paymentAmount: amount,
          notes: paymentNotes,
        });
      } else {
        // Create new collection record
        await collectionsService.createCollection({
          collectionDate: collectionGroup!.collectionDate,
          amount: selectedMember.totalBalance,
          paymentReceived: amount,
          centerId: collectionGroup!.centerId,
          memberId: selectedMember.id,
          notes: paymentNotes,
          isAutoGenerated: false,
        });
      }

      // Refresh data
      await fetchCenterMembers();
      setPaymentDialogOpen(false);
      setSelectedMember(null);
    } catch (error) {
      console.error("Failed to process payment:", error);
    } finally {
      setProcessingPayment(false);
    }
  };

  const getStatusColor = (member: MemberWithLoans) => {
    if (!member.collection) return "default";
    if (member.collection.paymentReceived >= member.collection.amount)
      return "success";
    if (member.collection.paymentReceived > 0) return "warning";
    return "error";
  };

  const getStatusLabel = (member: MemberWithLoans) => {
    if (!member.collection) return "NO COLLECTION";
    if (member.collection.paymentReceived >= member.collection.amount)
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
          <IconButton onClick={onClose} size="small" sx={{ color: "white" }}>
            <Close />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 0 }}>
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
                        collectionGroup.collections.filter(
                          (c) => c.paymentReceived >= c.amount
                        ).length
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
                        collectionGroup.collections.filter(
                          (c) =>
                            c.paymentReceived < c.amount &&
                            c.paymentReceived > 0
                        ).length
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
                          )
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
                            {member.collection?.numberOfPayments || 0}
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
            <Payment sx={{ color: "#1e3a8a" }} />
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
    </>
  );
}
