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
  TextField,
  InputAdornment,
} from "@mui/material";
import {
  Close,
  CalendarToday,
  LocationOn,
  People,
  Download,
} from "@mui/icons-material";
import { Search } from "@mui/icons-material";
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
  amountPaid?: number;
  termWeeks?: number;
  loanCreatedDate?: string;
  createdAt?: string;
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
  onDataChanged?: () => void;
}

export default function CollectionDetailsModal({
  open,
  collectionGroup,
  onClose,
  onDataChanged,
}: CollectionDetailsModalProps) {
  // State management
  const [members, setMembers] = useState<MemberWithLoans[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [memberSearch, setMemberSearch] = useState("");
  const [latestCollections, setLatestCollections] = useState<Collection[]>(
    collectionGroup?.collections ?? []
  );
  const [totalCenterMembers, setTotalCenterMembers] = useState(
    collectionGroup?.totalMembers ?? 0
  );

  // Dialog states
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [reloanDialogOpen, setReloanDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberWithLoans | null>(
    null
  );

  const collectionByMemberId = useMemo(() => {
    const map = new Map<string, Collection>();
    const source =
      latestCollections && latestCollections.length > 0
        ? latestCollections
        : collectionGroup?.collections ?? [];
    if (source.length) {
      source.forEach((collection) => {
        map.set(collection.memberId, collection);
      });
    }
    return map;
  }, [collectionGroup, latestCollections]);

  const computedStats = useMemo(() => {
    if (!collectionGroup || !members.length) return null;

    const hasActiveLoan = (m: MemberWithLoans) =>
      Array.isArray(m.loans) && m.loans.some((l) => l.status === "active");

    const eligibleMembers = members.filter(hasActiveLoan);

    const getReceived = (m: any): number => {
      const collection =
        collectionByMemberId.get(m.id) || (m?.collection as any);
      const value =
        collection?.amountReceived ?? collection?.paymentReceived ?? 0;
      return Number(value) || 0;
    };

    const getDue = (m: any): number => {
      const collection =
        collectionByMemberId.get(m.id) || (m?.collection as any);
      const activeLoan = Array.isArray(m.loans)
        ? m.loans.find((loan: any) => loan.status === "active")
        : undefined;
      const value =
        collection?.amount ??
        m.weeklyPaymentAmount ??
        (activeLoan as any)?.weeklyPaymentAmount ??
        0;
      return Number(value) || 0;
    };

    const paidCount = eligibleMembers.filter((m) => {
      const due = getDue(m);
      return due > 0 && getReceived(m) >= due;
    }).length;
    const partialCount = eligibleMembers.filter((m) => {
      const r = getReceived(m);
      const due = getDue(m);
      return due > 0 && r > 0 && r < due;
    }).length;
    const unpaidCount = eligibleMembers.filter(
      (m) => getReceived(m) <= 0
    ).length;

    const totalOverallAmount = eligibleMembers.reduce(
      (sum, member) => sum + (member.overallAmount || 0),
      0
    );
    const totalRemainingBalance = eligibleMembers.reduce(
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
  }, [collectionGroup, collectionByMemberId, members]);

  const fetchCenterMembers = useCallback(async () => {
    if (!collectionGroup) return;

    setLoading(true);
    setError(null);

    try {
      const centerMembers = await collectionsService.getCenterMembers(
        collectionGroup.centerId
      );
      setTotalCenterMembers(centerMembers.length);
      let refreshedCollections: Collection[] = collectionGroup.collections ?? [];
      try {
        refreshedCollections =
          (await collectionsService.getCenterCollectionsByDate(
            collectionGroup.centerId,
            collectionGroup.collectionDate
          )) ?? refreshedCollections;
      } catch (innerErr) {
        console.warn(
          "Failed to refresh center collections, using existing data:",
          innerErr
        );
      }
      const normalisedCollections = refreshedCollections.map((col) => ({
        ...col,
        amount: Number(col.amount ?? 0),
        paymentReceived: Number(col.paymentReceived ?? 0),
        netRelease: Number(col.netRelease ?? 0),
        numberOfPayments: Number(col.numberOfPayments ?? 0),
        advancePaymentAmount: Number(col.advancePaymentAmount ?? 0),
      }));
      setLatestCollections(normalisedCollections);
      const collectionsMap = new Map(
        normalisedCollections.map((col) => [col.memberId, col])
      );

      const membersWithCollections = centerMembers.map((member: any) => ({
        ...member,
        collection:
          collectionsMap.get(member.id) ??
          collectionGroup.collections?.find(
            (c) => c.memberId === member.id
          ),
      }));

      // Alphabetical sort: Last Name, First Name
      membersWithCollections.sort((a: any, b: any) => {
        const al = `${(a.lastName || "").toLowerCase()} ${(
          a.firstName || ""
        ).toLowerCase()}`.trim();
        const bl = `${(b.lastName || "").toLowerCase()} ${(
          b.firstName || ""
        ).toLowerCase()}`.trim();
        if (al < bl) return -1;
        if (al > bl) return 1;
        return 0;
      });

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
    if (collectionGroup?.collections) {
      setLatestCollections(
        collectionGroup.collections.map((col) => ({
          ...col,
          amount: Number(col.amount ?? 0),
          paymentReceived: Number(col.paymentReceived ?? 0),
          netRelease: Number(col.netRelease ?? 0),
          numberOfPayments: Number(col.numberOfPayments ?? 0),
          advancePaymentAmount: Number(col.advancePaymentAmount ?? 0),
        }))
      );
      setTotalCenterMembers(collectionGroup.totalMembers ?? 0);
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
    onDataChanged?.();
    handleClosePaymentDialog();
  }, [fetchCenterMembers, handleClosePaymentDialog, onDataChanged]);

  const handleReloanSuccess = useCallback(async () => {
    await fetchCenterMembers();
    onDataChanged?.();
    handleCloseReloanDialog();
  }, [fetchCenterMembers, handleCloseReloanDialog, onDataChanged]);

  const handleExport = useCallback(async () => {
    if (!collectionGroup || !members.length) return;

    setExporting(true);
    setExportError(null);

    try {
      // Sort alphabetically for export
      const sorted = [...members].sort((a, b) => {
        const al = `${(a.lastName || "").toLowerCase()} ${(
          a.firstName || ""
        ).toLowerCase()}`.trim();
        const bl = `${(b.lastName || "").toLowerCase()} ${(
          b.firstName || ""
        ).toLowerCase()}`.trim();
        return al.localeCompare(bl);
      });

      const eligibleMembers = sorted.filter(
        (m) =>
          Array.isArray(m.loans) && m.loans.some((l) => l.status === "active")
      );
      await exportToExcel(collectionGroup, eligibleMembers);
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

  const referenceDate = useMemo(() => {
    if (!collectionGroup?.collectionDate) return null;
    return new Date(`${collectionGroup.collectionDate}T00:00:00Z`);
  }, [collectionGroup?.collectionDate]);

  const computeMemberPaymentInfo = useCallback(
    (member: MemberWithLoans) => {
      const loans = Array.isArray(member.loans) ? member.loans : [];
      const fallbackWeekly = loans.reduce(
        (sum, loan) => sum + Number(loan.weeklyPaymentAmount || 0),
        0
      );
      let expectedTotal = 0;
      let totalPaid = 0;

      const ref = referenceDate ?? new Date();
      loans.forEach((loan) => {
        const weekly = Number(loan.weeklyPaymentAmount || 0);
        if (weekly <= 0) return;
        const amountPaid = Number(loan.amountPaid || 0);
        totalPaid += amountPaid;

        const termWeeks = Number(loan.termWeeks || 0);
        const startRaw =
          (loan as any)?.loanCreatedDate ?? (loan as any)?.createdAt;
        if (!startRaw) return;
        const startDate = new Date(startRaw);
        const diffMs = ref.getTime() - startDate.getTime();
        if (diffMs < 0) return;
        const weeksElapsed = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1;
        const cappedWeeks =
          termWeeks > 0 ? Math.min(weeksElapsed, termWeeks) : weeksElapsed;
        if (cappedWeeks > 0) {
          expectedTotal += cappedWeeks * weekly;
        }
      });

      const weeklyDue =
        Number(member.weeklyPaymentAmount || 0) || fallbackWeekly || 0;
      const shortfall = Math.max(
        0,
        Number((expectedTotal - totalPaid).toFixed(2))
      );

      return {
        weeklyDue,
        shortfall,
      };
    },
    [referenceDate]
  );

  const getCollectionMetrics = useCallback(
    (member: MemberWithLoans) => {
      const perDayCollection =
        collectionByMemberId.get(member.id) || (member.collection as any);
      const receivedRaw =
        perDayCollection?.amountReceived ??
        perDayCollection?.paymentReceived ??
        0;
      const received = Number(receivedRaw) || 0;

      const paymentInfo = computeMemberPaymentInfo(member);
      const collectionAmount = Number(perDayCollection?.amount ?? 0);
      const due =
        collectionAmount > 0 ? collectionAmount : paymentInfo.weeklyDue;

      return { received, due, weeklyDue: paymentInfo.weeklyDue };
    },
    [collectionByMemberId, computeMemberPaymentInfo]
  );

  const getMemberStatus = useCallback(
    (
      member: MemberWithLoans
    ): { label: "PAID" | "PARTIAL" | "UNPAID"; color: "success" | "warning" | "error" } => {
      const epsilon = 0.01;
      const { received, due, weeklyDue } = getCollectionMetrics(member);
      const { shortfall } = computeMemberPaymentInfo(member);

      if (weeklyDue <= epsilon) {
        if (due > epsilon) {
          if (received >= due - epsilon) {
            return { label: "PAID", color: "success" };
          }
          if (received > epsilon) {
            return { label: "PARTIAL", color: "warning" };
          }
          return { label: "UNPAID", color: "error" };
        }
        return { label: "PAID", color: "success" };
      }

      if (shortfall <= epsilon) {
        if (due > epsilon && received > epsilon && received < due - epsilon) {
          return { label: "PARTIAL", color: "warning" };
        }
        return { label: "PAID", color: "success" };
      }

      if (shortfall < weeklyDue - epsilon) {
        return { label: "PARTIAL", color: "warning" };
      }

      return { label: "UNPAID", color: "error" };
    },
    [computeMemberPaymentInfo, getCollectionMetrics]
  );

  const getStatusColor = useCallback(
    (member: MemberWithLoans): "default" | "success" | "warning" | "error" => {
      return getMemberStatus(member).color;
    },
    [getMemberStatus]
  );

  const getStatusLabel = useCallback(
    (member: MemberWithLoans): string => {
      return getMemberStatus(member).label;
    },
    [getMemberStatus]
  );

  const formatCurrency = useCallback((amount: number): string => {
    return `₱${amount.toLocaleString()}`;
  }, []);

  const totalsOverride = useMemo(() => {
    const totalAmount = latestCollections.reduce(
      (sum, collection) => sum + Number(collection.amount ?? 0),
      0
    );
    const totalReceived = latestCollections.reduce(
      (sum, collection) => sum + Number(collection.paymentReceived ?? 0),
      0
    );
    const pendingCollections = Math.max(
      totalCenterMembers - latestCollections.length,
      0
    );

    return {
      totalMembers: totalCenterMembers,
      totalAmount,
      totalReceived,
      pendingCollections,
    };
  }, [latestCollections, totalCenterMembers]);

  // Filtered + sorted members for table rendering
  const displayedMembers = useMemo(() => {
    const query = memberSearch.trim().toLowerCase();
    const base = members.filter(
      (m) =>
        Array.isArray(m.loans) && m.loans.some((l) => l.status === "active")
    );
    const filtered = query
      ? base.filter((m) => {
          const name = `${m.firstName || ""} ${m.middleName || ""} ${
            m.lastName || ""
          }`.toLowerCase();
          const contact = (m.contactNumber || "").toLowerCase();
          return name.includes(query) || contact.includes(query);
        })
      : base;
    return filtered.sort((a, b) => {
      const al = `${(a.lastName || "").toLowerCase()} ${(
        a.firstName || ""
      ).toLowerCase()}`.trim();
      const bl = `${(b.lastName || "").toLowerCase()} ${(
        b.firstName || ""
      ).toLowerCase()}`.trim();
      return al.localeCompare(bl);
    });
  }, [members, memberSearch]);

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
                totalsOverride={totalsOverride}
              />

              <Box sx={{ px: 3, pb: 1 }}>
                <TextField
                  fullWidth
                  placeholder="Search member by name or contact"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search sx={{ color: "text.secondary" }} />
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>

              <MembersTable
                members={displayedMembers}
                getStatusColor={(m: any) => getStatusColor(m as any)}
                getStatusLabel={(m: any) => getStatusLabel(m as any)}
                getCollectionMetrics={(m: any) =>
                  getCollectionMetrics(m as any)
                }
                formatCurrency={formatCurrency}
                onOpenPaymentDialog={(m: any) =>
                  handleOpenPaymentDialog(m as any)
                }
                onOpenReloanDialog={(m: any) =>
                  handleOpenReloanDialog(m as any)
                }
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
        centerId={collectionGroup.centerId}
        collectionDate={collectionGroup.collectionDate}
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
