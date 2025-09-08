import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  Tooltip,
  Fade,
  Skeleton,
} from "@mui/material";
import {
  Close,
  CalendarToday,
  LocationOn,
  People,
  Download,
} from "@mui/icons-material";
import { useState, useEffect, useCallback, useMemo } from "react";
import type { DailyCollectionGroup, Collection, Member } from "../types";
import collectionsService from "../api";
import { exportToExcel } from "../utils/exportUtils";
import { PaymentDialog } from "./PaymentDialog";
import { ReloanDialog } from "./ReloanDialog";
import { CollectionSummaryCards } from "./CollectionSummaryCards";
import { MembersTable } from "./MembersTable";

interface Loan {
  id: string;
  amount: number;
  balance: number;
  status: string;
  dueDate: string;
  weeksPaid?: number;
  weeklyPaymentAmount?: number;
  savings?: number;
}

interface MemberWithLoans extends Member {
  loans: Loan[];
  totalLoanAmount: number;
  totalBalance: number;
  overallAmount: number;
  weeklyPaymentAmount: number;
  totalTermWeeks: number;
  totalSavings: number;
  netCashReleased?: number;
  numberOfPayments?: number;
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
  // State management
  const [members, setMembers] = useState<MemberWithLoans[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Dialog states
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [reloanDialogOpen, setReloanDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberWithLoans | null>(
    null
  );

  const computedStats = useMemo(() => {
    if (!collectionGroup || !members.length) return null;

    const paidCount = collectionGroup.collections.filter((collection) => {
      const member = members.find((m) => m.id === collection.memberId);
      return member
        ? collection.paymentReceived >= member.weeklyPaymentAmount
        : false;
    }).length;

    const partialCount = collectionGroup.collections.filter((collection) => {
      const member = members.find((m) => m.id === collection.memberId);
      return member
        ? collection.paymentReceived > 0 &&
            collection.paymentReceived < member.weeklyPaymentAmount
        : false;
    }).length;

    const unpaidCount = collectionGroup.collections.filter((collection) => {
      return collection.paymentReceived <= 0;
    }).length;

    const totalOverallAmount = members.reduce(
      (sum, member) => sum + (member.overallAmount || 0),
      0
    );
    const totalRemainingBalance = members.reduce(
      (sum, member) => sum + (member.totalBalance || 0),
      0
    );

    return {
      paidCount,
      partialCount,
      unpaidCount,
      totalOverallAmount,
      totalRemainingBalance,
    };
  }, [collectionGroup, members]);

  const fetchCenterMembers = useCallback(async () => {
    if (!collectionGroup) return;

    setLoading(true);
    setError(null);

    try {
      const centerMembers = await collectionsService.getCenterMembers(
        collectionGroup.centerId
      );

      const membersWithCollections = centerMembers.map((member: any) => ({
        ...member,
        collection: collectionGroup.collections.find(
          (c) => c.memberId === member.id
        ),
      }));

      setMembers(membersWithCollections);
    } catch (error) {
      console.error("Failed to fetch center members:", error);
      setError("Failed to load member data. Please try again.");
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [collectionGroup]);

  useEffect(() => {
    if (open && collectionGroup) {
      fetchCenterMembers();
    } else if (!open) {
      // Reset state when modal closes
      setMembers([]);
      setError(null);
      setSelectedMember(null);
    }
  }, [open, collectionGroup, fetchCenterMembers]);

  const handleOpenPaymentDialog = useCallback((member: MemberWithLoans) => {
    setSelectedMember(member);
    setPaymentDialogOpen(true);
  }, []);

  const handleOpenReloanDialog = useCallback((member: MemberWithLoans) => {
    setSelectedMember(member);
    setReloanDialogOpen(true);
  }, []);

  const handleClosePaymentDialog = useCallback(() => {
    setPaymentDialogOpen(false);
    setSelectedMember(null);
  }, []);

  const handleCloseReloanDialog = useCallback(() => {
    setReloanDialogOpen(false);
    setSelectedMember(null);
  }, []);

  const handlePaymentSuccess = useCallback(async () => {
    await fetchCenterMembers();
    handleClosePaymentDialog();
  }, [fetchCenterMembers, handleClosePaymentDialog]);

  const handleReloanSuccess = useCallback(async () => {
    await fetchCenterMembers();
    handleCloseReloanDialog();
  }, [fetchCenterMembers, handleCloseReloanDialog]);

  const handleExport = useCallback(async () => {
    if (!collectionGroup || !members.length) return;

    setExporting(true);
    setExportError(null);

    try {
      await exportToExcel(collectionGroup, members);
    } catch (error) {
      console.error("Export failed:", error);
      setExportError(
        error instanceof Error
          ? error.message
          : "Export failed. Please try again."
      );
    } finally {
      setExporting(false);
    }
  }, [collectionGroup, members]);

  const getStatusColor = useCallback(
    (member: MemberWithLoans): "default" | "success" | "warning" | "error" => {
      const received = (() => {
        const fromCollection = (member.collection as any)?.amountReceived ?? (member.collection as any)?.paymentReceived;
        if (fromCollection !== undefined) return Number(fromCollection) || 0;
        const activeLoan = member.loans?.find((l) => l.status === "active");
        const amountPaidRaw = (activeLoan as any)?.amountPaid;
        if (amountPaidRaw !== undefined) return Number(amountPaidRaw) || 0;
        const weeksPaid = (activeLoan as any)?.weeksPaid ?? 0;
        const weekly = member.weeklyPaymentAmount || (activeLoan as any)?.weeklyPaymentAmount || 0;
        return Number(weeksPaid) * Number(weekly);
      })();
      if (received >= member.weeklyPaymentAmount)
        return "success";
      if (received > 0) return "warning";
      return "error";
    },
    []
  );

  const getStatusLabel = useCallback((member: MemberWithLoans): string => {
    const received = (() => {
      const fromCollection = (member.collection as any)?.amountReceived ?? (member.collection as any)?.paymentReceived;
      if (fromCollection !== undefined) return Number(fromCollection) || 0;
      const activeLoan = member.loans?.find((l) => l.status === "active");
      const amountPaidRaw = (activeLoan as any)?.amountPaid;
      if (amountPaidRaw !== undefined) return Number(amountPaidRaw) || 0;
      const weeksPaid = (activeLoan as any)?.weeksPaid ?? 0;
      const weekly = member.weeklyPaymentAmount || (activeLoan as any)?.weeklyPaymentAmount || 0;
      return Number(weeksPaid) * Number(weekly);
    })();
    if (received >= member.weeklyPaymentAmount)
      return "PAID";
    if (received > 0) return "PARTIAL";
    return "UNPAID";
  }, []);

  const formatCurrency = useCallback((amount: number): string => {
    return `₱${amount.toLocaleString()}`;
  }, []);

  if (!collectionGroup) return null;

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
            maxHeight: "95vh",
            overflow: "hidden",
          },
        }}
        TransitionComponent={Fade}
        transitionDuration={300}
      >
        <DialogTitle
          sx={{
            fontWeight: 600,
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
            pb: 2,
            background: "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
          }}
        >
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
              {collectionGroup.centerName}
            </Typography>
            <Typography variant="subtitle1" sx={{ opacity: 0.9, mb: 1 }}>
              Collection Details & Management
            </Typography>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 3,
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
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <People sx={{ fontSize: 16 }} />
                <Typography variant="body2">
                  {collectionGroup.totalMembers} Members
                </Typography>
              </Box>
            </Box>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Tooltip title="Export to Excel">
              <IconButton
                onClick={handleExport}
                disabled={exporting || loading}
                size="small"
                sx={{
                  color: "white",
                  "&:hover": { backgroundColor: "rgba(255,255,255,0.1)" },
                }}
              >
                {exporting ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <Download />
                )}
              </IconButton>
            </Tooltip>
            <IconButton
              onClick={onClose}
              size="small"
              sx={{
                color: "white",
                "&:hover": { backgroundColor: "rgba(255,255,255,0.1)" },
              }}
            >
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 0, overflow: "auto" }}>
          {error && (
            <Alert
              severity="error"
              sx={{ m: 2, borderRadius: 2 }}
              action={
                <Button
                  color="inherit"
                  size="small"
                  onClick={fetchCenterMembers}
                >
                  Retry
                </Button>
              }
            >
              {error}
            </Alert>
          )}

          {exportError && (
            <Alert
              severity="error"
              sx={{ m: 2, borderRadius: 2 }}
              onClose={() => setExportError(null)}
            >
              {exportError}
            </Alert>
          )}

          {loading ? (
            <Box sx={{ p: 3 }}>
              <Grid container spacing={3} sx={{ mb: 3 }}>
                {[...Array(4)].map((_, i) => (
                  <Grid item xs={6} md={3} key={i}>
                    <Card>
                      <CardContent sx={{ textAlign: "center" }}>
                        <Skeleton
                          variant="circular"
                          width={40}
                          height={40}
                          sx={{ mx: "auto", mb: 1 }}
                        />
                        <Skeleton
                          variant="text"
                          width="60%"
                          sx={{ mx: "auto" }}
                        />
                        <Skeleton
                          variant="text"
                          width="80%"
                          sx={{ mx: "auto" }}
                        />
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
              <Skeleton
                variant="rectangular"
                height={400}
                sx={{ borderRadius: 2 }}
              />
            </Box>
          ) : (
            <>
              <CollectionSummaryCards
                collectionGroup={collectionGroup}
                members={members}
                computedStats={computedStats}
                formatCurrency={formatCurrency}
              />

              <MembersTable
                members={members}
                getStatusColor={(m: any) => getStatusColor(m as any)}
                getStatusLabel={(m: any) => getStatusLabel(m as any)}
                formatCurrency={formatCurrency}
                onOpenPaymentDialog={(m: any) => handleOpenPaymentDialog(m as any)}
                onOpenReloanDialog={(m: any) => handleOpenReloanDialog(m as any)}
              />
            </>
          )}
        </DialogContent>

        <DialogActions
          sx={{
            p: 3,
            backgroundColor: "#f8fafc",
            borderTop: "1px solid #e2e8f0",
          }}
        >
          <Button
            onClick={onClose}
            variant="contained"
            size="large"
            sx={{
              background: "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)",
              "&:hover": {
                background: "linear-gradient(135deg, #1e40af 0%, #2563eb 100%)",
              },
              borderRadius: 2,
              px: 4,
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <PaymentDialog
        open={paymentDialogOpen}
        member={selectedMember}
        onClose={handleClosePaymentDialog}
        onSuccess={handlePaymentSuccess}
        formatCurrency={formatCurrency}
      />

      <ReloanDialog
        open={reloanDialogOpen}
        member={selectedMember}
        onClose={handleCloseReloanDialog}
        onSuccess={handleReloanSuccess}
        formatCurrency={formatCurrency}
      />
    </>
  );
}
