import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Alert,
  CircularProgress,
  Skeleton,
} from "@mui/material";
import {
  CalendarToday,
  LocationOn,
  People,
  CheckCircle,
  Schedule,
  Warning,
  HourglassEmpty,
  Visibility,
  FileDownload,
} from "@mui/icons-material";
import { useCallback, useEffect, useMemo, useState } from "react";
import CollectionStatsCard from "./CollectionStatsCard";
import collectionsService from "../api";
import type {
  DailyCollectionGroup,
  MemberWithLoans,
  Collection,
} from "../types";
import {
  evaluateMemberStatus,
  hasActiveLoan,
  hasLoanAmount,
} from "../utils/memberStatus";
import { withNetReleaseForDate } from "../utils/netRelease";

interface DailyCollectionsViewProps {
  data: DailyCollectionGroup[];
  onViewDetails: (group: DailyCollectionGroup) => void;
  loading?: boolean;
}

type MemberWithLoansExtended = MemberWithLoans & {
  netCashReleasedForDate?: number;
};

const getGroupKey = (group: DailyCollectionGroup) =>
  `${group.centerId}::${group.collectionDate}`;

export default function DailyCollectionsView({
  data,
  onViewDetails,
  loading,
}: DailyCollectionsViewProps) {
  const [exportingAll, setExportingAll] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [supportingDataError, setSupportingDataError] = useState<string | null>(
    null,
  );
  const [centerMembersMap, setCenterMembersMap] = useState<
    Record<string, MemberWithLoansExtended[]>
  >({});
  const [pendingPaymentMemberIdsMap, setPendingPaymentMemberIdsMap] = useState<
    Record<string, string[]>
  >({});
  const [membersLoading, setMembersLoading] = useState(false);
  const [search, setSearch] = useState("");

  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString()}`;
  };

  // Fetch members for each center so cards use the same basis as the modal
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const fetchAll = async () => {
      if (!cancelled) {
        setMembersLoading(true);
        setCenterMembersMap({});
        setPendingPaymentMemberIdsMap({});
        setSupportingDataError(null);
      }
      try {
        const results = await Promise.all(
          data.map(async (group) => {
            try {
              const members = await collectionsService.getCenterMembers(
                group.centerId,
                group.collectionDate,
                controller.signal,
              );
              // Attach today's collection to each member for convenience
              const withCollections = members.map((m) =>
                withNetReleaseForDate(
                  {
                    ...m,
                    collection: group.collections.find(
                      (c) => c.memberId === m.id,
                    ),
                  } as MemberWithLoans,
                  group.collectionDate,
                ),
              );
              const pendingRepayments =
                await collectionsService.getPendingRepaymentsForCollection(
                  group.centerId,
                  group.collectionDate,
                  controller.signal,
                );
              return {
                centerId: group.centerId,
                groupKey: getGroupKey(group),
                members: withCollections as MemberWithLoansExtended[],
                pendingMemberIds: pendingRepayments
                  .filter((repayment) => repayment.operationType !== "reversal")
                  .map((repayment) => repayment.member?.id)
                  .filter((id): id is string => Boolean(id)),
                failed: false,
              };
            } catch {
              return {
                centerId: group.centerId,
                groupKey: getGroupKey(group),
                members: [] as MemberWithLoansExtended[],
                pendingMemberIds: [] as string[],
                failed: true,
              };
            }
          }),
        );
        if (!cancelled) {
          const map: Record<string, MemberWithLoansExtended[]> = {};
          const pendingMap: Record<string, string[]> = {};
          results.forEach((r) => (map[r.centerId] = r.members));
          results.forEach((r) => (pendingMap[r.groupKey] = r.pendingMemberIds));
          setCenterMembersMap(map);
          setPendingPaymentMemberIdsMap(pendingMap);
          if (results.some((result) => result.failed)) {
            setSupportingDataError(
              results.every((result) => result.failed)
                ? "Member and pending payment details are temporarily unavailable."
                : "Some member or pending payment details are temporarily unavailable.",
            );
          }
        }
      } catch {
        if (!cancelled) {
          setCenterMembersMap({});
          setPendingPaymentMemberIdsMap({});
          setSupportingDataError(
            "Member and pending payment details are temporarily unavailable.",
          );
        }
      } finally {
        if (!cancelled) {
          setMembersLoading(false);
        }
      }
    };
    if (data.length > 0) {
      fetchAll();
    } else {
      setCenterMembersMap({});
      setPendingPaymentMemberIdsMap({});
      setSupportingDataError(null);
      setMembersLoading(false);
    }
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [data]);

  const getMembersFor = useCallback(
    (centerId: string) => centerMembersMap[centerId] || [],
    [centerMembersMap],
  );

  const sumOverallAmount = (group: DailyCollectionGroup) => {
    const members = getMembersFor(group.centerId);
    return members.reduce((sum, m) => sum + (Number(m.overallAmount) || 0), 0);
  };

  const sumTotalReceived = (group: DailyCollectionGroup) => {
    return group.collections.reduce(
      (sum, c) => sum + (Number(c.paymentReceived) || 0),
      0,
    );
  };

  const sumRemainingBalance = (group: DailyCollectionGroup) => {
    const members = getMembersFor(group.centerId);
    const totalBalance = members.reduce(
      (sum, m) => sum + (Number(m.totalBalance) || 0),
      0,
    );
    return totalBalance - sumTotalReceived(group);
  };

  const getStatusCounts = useCallback(
    (group: DailyCollectionGroup) => {
      const members = getMembersFor(group.centerId);
      if (members.length === 0) {
        return { paid: 0, partial: 0, pending: 0, unpaid: 0 };
      }
      const pendingMemberIds = new Set(
        pendingPaymentMemberIdsMap[getGroupKey(group)] ?? [],
      );
      const collectionMap = new Map(
        group.collections.map((collection) => [
          collection.memberId,
          collection,
        ]),
      );
      return members.reduce(
        (acc, member) => {
          if (!hasActiveLoan(member)) return acc;
          if (pendingMemberIds.has(member.id)) {
            acc.pending += 1;
            return acc;
          }
          const collection = (collectionMap.get(member.id) ||
            null) as Collection | null;
          const status = evaluateMemberStatus(member, {
            collection,
            referenceDate: group.collectionDate,
          });
          if (status.label === "PAID") {
            acc.paid += 1;
          } else if (status.label === "PARTIAL") {
            acc.partial += 1;
          } else {
            acc.unpaid += 1;
          }
          return acc;
        },
        { paid: 0, partial: 0, pending: 0, unpaid: 0 },
      );
    },
    [getMembersFor, pendingPaymentMemberIdsMap],
  );

  const getPaidCount = (group: DailyCollectionGroup) =>
    getStatusCounts(group).paid;
  const getPartialCount = (group: DailyCollectionGroup) =>
    getStatusCounts(group).partial;
  const getPendingCount = (group: DailyCollectionGroup) =>
    getStatusCounts(group).pending;
  const getUnpaidCount = (group: DailyCollectionGroup) =>
    getStatusCounts(group).unpaid;

  // End-of-Day totals across all groups (for the selected date)
  const eod = (() => {
    const totalReceived = data.reduce((sum, g) => sum + sumTotalReceived(g), 0);
    const totalRemaining = data.reduce(
      (sum, g) => sum + Math.max(0, sumRemainingBalance(g)),
      0,
    );
    const totalReleased = data.reduce((sum, g) => {
      const members = getMembersFor(g.centerId);
      return (
        sum +
        members.reduce(
          (s, m) =>
            s + Number(m.netCashReleasedForDate ?? m.netCashReleased ?? 0),
          0,
        )
      );
    }, 0);
    return { totalReceived, totalRemaining, totalReleased };
  })();

  const handleExportAllCollections = async () => {
    if (data.length === 0) return;

    setExportingAll(true);
    setExportError(null);

    try {
      // Fetch member details for all centers
      const exportBundles = await Promise.all(
        data.map(async (group) => {
          try {
            const centerMembers = await collectionsService.getCenterMembers(
              group.centerId,
              group.collectionDate,
            );

            // Map the data to include collection information
            const membersWithCollections = centerMembers.map((member) =>
              withNetReleaseForDate(
                {
                  ...member,
                  collection: group.collections.find(
                    (c) => c.memberId === member.id,
                  ),
                  numberOfPayments:
                    member.numberOfPayments ||
                    member.collection?.numberOfPayments ||
                    0,
                } as MemberWithLoans,
                group.collectionDate,
              ),
            );

            const typedMembers =
              membersWithCollections as MemberWithLoansExtended[];
            const exportableMembers = typedMembers.filter(
              (member) => hasActiveLoan(member) && hasLoanAmount(member),
            );

            return {
              group,
              members: exportableMembers,
            };
          } catch (error) {
            console.error(
              `Failed to fetch members for center ${group.centerName}:`,
              error,
            );
            // Return with empty members array to avoid breaking the export
            return {
              group,
              members: [] as MemberWithLoansExtended[],
            };
          }
        }),
      );

      // Filter out bundles with no members (failed API calls)
      const validBundles = exportBundles.filter(
        (bundle) => bundle.members.length > 0,
      );

      if (validBundles.length === 0) {
        throw new Error("No data available to export. Please try again.");
      }

      // Generate the multi-sheet Excel file
      const collectionDate =
        data[0]?.collectionDate || new Date().toISOString().split("T")[0];
      const fileName = `Daily_Collections_Report_${collectionDate.replace(
        /-/g,
        "_",
      )}`;

      const { exportAllCollectionsToExcel } = await import(
        "../utils/exportUtils"
      );
      await exportAllCollectionsToExcel(validBundles, fileName);

      // Show success feedback
      console.log(
        `Successfully exported ${validBundles.length} collection reports`,
      );
    } catch (error) {
      console.error("Failed to export all collections:", error);
      setExportError(
        error instanceof Error
          ? error.message
          : "Failed to export collections. Please try again.",
      );
    } finally {
      setExportingAll(false);
    }
  };

  const displayedData = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? data.filter((g) => (g.centerName || "").toLowerCase().includes(q))
      : data;
    return [...filtered].sort((a, b) =>
      (a.centerName || "").localeCompare(b.centerName || ""),
    );
  }, [data, search]);

  if (data.length === 0) {
    return (
      <Card
        sx={{
          background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
          border: "1px solid #e2e8f0",
          textAlign: "center",
          py: 6,
        }}
      >
        <Schedule sx={{ fontSize: 64, color: "#94a3b8", mb: 2 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No Collections Scheduled Today
        </Typography>
        <Typography variant="body2" color="text.secondary">
          All collections for today have been completed or there are no
          scheduled collections.
        </Typography>
      </Card>
    );
  }

  if (membersLoading && Object.keys(centerMembersMap).length === 0) {
    return (
      <Box>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
            p: 3,
            backgroundColor: "#f8fafc",
            borderRadius: 2,
            border: "1px solid #e2e8f0",
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          <Box sx={{ flex: 1, minWidth: 280 }}>
            <Skeleton variant="text" width="40%" height={36} />
            <Skeleton variant="text" width="30%" height={24} />
            <Skeleton
              variant="rounded"
              width={320}
              height={40}
              sx={{ mt: 2 }}
            />
            <Box sx={{ display: "flex", gap: 2, mt: 2, flexWrap: "wrap" }}>
              <Skeleton variant="rounded" width={130} height={56} />
              <Skeleton variant="rounded" width={130} height={56} />
              <Skeleton variant="rounded" width={130} height={56} />
            </Box>
          </Box>
          <Skeleton variant="rounded" width={190} height={44} />
        </Box>

        {Array.from({ length: Math.min(Math.max(data.length, 1), 3) }).map(
          (_, index) => (
            <Card
              key={index}
              sx={{
                mb: 4,
                border: "1px solid #e2e8f0",
                overflow: "hidden",
              }}
            >
              <Box
                sx={{
                  p: 3,
                  backgroundColor: "#dbeafe",
                }}
              >
                <Grid container spacing={2}>
                  <Grid item xs={12} md={8}>
                    <Skeleton variant="text" width="40%" height={36} />
                    <Skeleton variant="text" width="32%" height={24} />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Box
                      sx={{ display: "flex", flexDirection: "column", gap: 1 }}
                    >
                      <Skeleton variant="text" width="70%" height={36} />
                      <Skeleton variant="text" width="55%" height={24} />
                      <Skeleton variant="text" width="55%" height={24} />
                    </Box>
                  </Grid>
                </Grid>
              </Box>
              <CardContent sx={{ p: 3 }}>
                <Grid container spacing={3} sx={{ mb: 3 }}>
                  {Array.from({ length: 4 }).map((__, statIndex) => (
                    <Grid item xs={6} md={3} key={statIndex}>
                      <Skeleton variant="rounded" height={88} />
                    </Grid>
                  ))}
                </Grid>
                <Box sx={{ textAlign: "right" }}>
                  <Skeleton
                    variant="rounded"
                    width={140}
                    height={42}
                    sx={{ ml: "auto" }}
                  />
                </Box>
              </CardContent>
            </Card>
          ),
        )}
      </Box>
    );
  }

  return (
    <Box>
      {/* Export All Collections Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
          p: 3,
          backgroundColor: "#f8fafc",
          borderRadius: 2,
          border: "1px solid #e2e8f0",
        }}
      >
        <Box>
          <Typography
            variant="h6"
            sx={{ fontWeight: 600, color: "#1e293b", mb: 0.5 }}
          >
            Daily Collections Summary
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {data.length} center{data.length !== 1 ? "s" : ""} scheduled for
            collection today
          </Typography>
          <Box sx={{ mt: 2 }}>
            <input
              placeholder="Search centers by name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                maxWidth: 420,
                padding: 10,
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                outline: "none",
              }}
            />
          </Box>
          <Box sx={{ display: "flex", gap: 2, mt: 1, flexWrap: "wrap" }}>
            <Box
              sx={{
                p: 1,
                px: 1.5,
                backgroundColor: "#ecfeff",
                border: "1px solid #bae6fd",
                borderRadius: 1,
              }}
            >
              <Typography variant="caption" color="text.secondary">
                Total Collected
              </Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {formatCurrency(eod.totalReceived)}
              </Typography>
            </Box>
            <Box
              sx={{
                p: 1,
                px: 1.5,
                backgroundColor: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: 1,
              }}
            >
              <Typography variant="caption" color="text.secondary">
                Unpaid (Remaining)
              </Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {formatCurrency(eod.totalRemaining)}
              </Typography>
            </Box>
            <Box
              sx={{
                p: 1,
                px: 1.5,
                backgroundColor: "#fefce8",
                border: "1px solid #fde68a",
                borderRadius: 1,
              }}
            >
              <Typography variant="caption" color="text.secondary">
                Released
              </Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {formatCurrency(eod.totalReleased)}
              </Typography>
            </Box>
          </Box>
        </Box>
        <Button
          variant="contained"
          startIcon={
            exportingAll ? <CircularProgress size={16} /> : <FileDownload />
          }
          onClick={handleExportAllCollections}
          disabled={exportingAll || loading || data.length === 0}
          sx={{
            background: "linear-gradient(135deg, #10b981 0%, #34d399 100%)",
            "&:hover": {
              background: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
            },
            "&:disabled": {
              background: "#d1d5db",
              color: "#9ca3af",
            },
            px: 3,
            py: 1.5,
            fontWeight: 600,
            borderRadius: 2,
            minWidth: 180,
          }}
        >
          {exportingAll ? "Exporting All..." : "Export All Collections"}
        </Button>
      </Box>

      {/* Export Error Alert */}
      {supportingDataError && (
        <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
          {supportingDataError}
        </Alert>
      )}

      {exportError && (
        <Alert
          severity="error"
          sx={{ mb: 3, borderRadius: 2 }}
          onClose={() => setExportError(null)}
        >
          {exportError}
        </Alert>
      )}

      {/* Individual Collection Cards */}
      {displayedData.map((group) => (
        <Card
          key={group.centerId}
          sx={{
            mb: 4,
            background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
            border: "1px solid #e2e8f0",
            overflow: "hidden",
            transition: "all 0.3s ease-in-out",
            "&:hover": {
              transform: "translateY(-2px)",
              boxShadow: "0 8px 25px rgba(0, 0, 0, 0.1)",
            },
          }}
        >
          {/* Center Header */}
          <Box
            sx={{
              p: 3,
              background: "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)",
              color: "white",
            }}
          >
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={8}>
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                  {group.centerName}
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    flexWrap: "wrap",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <CalendarToday sx={{ fontSize: 16 }} />
                    <Typography variant="body2">
                      {group.collectionDay}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <LocationOn sx={{ fontSize: 16 }} />
                    <Typography variant="body2">
                      {group.collectionDate}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: { xs: "left", md: "right" } }}>
                  <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                    {formatCurrency(sumOverallAmount(group))}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Received:{" "}
                    {formatCurrency(
                      sumOverallAmount(group) - sumRemainingBalance(group),
                    )}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Remaining:{" "}
                    {formatCurrency(Math.max(0, sumRemainingBalance(group)))}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>

          <CardContent sx={{ p: 3 }}>
            {/* Statistics Cards */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={6} md={2.4}>
                <CollectionStatsCard
                  title="Total Members"
                  value={group.totalMembers}
                  icon={<People />}
                  color="primary"
                />
              </Grid>
              <Grid item xs={6} md={2.4}>
                <CollectionStatsCard
                  title="Paid"
                  value={getPaidCount(group)}
                  icon={<CheckCircle />}
                  color="success"
                />
              </Grid>
              <Grid item xs={6} md={2.4}>
                <CollectionStatsCard
                  title="Partial"
                  value={getPartialCount(group)}
                  icon={<Warning />}
                  color="warning"
                />
              </Grid>
              <Grid item xs={6} md={2.4}>
                <CollectionStatsCard
                  title="Pending"
                  value={getPendingCount(group)}
                  icon={<HourglassEmpty />}
                  color="info"
                />
              </Grid>
              <Grid item xs={6} md={2.4}>
                <CollectionStatsCard
                  title="Unpaid"
                  value={getUnpaidCount(group)}
                  icon={<Warning />}
                  color="error"
                />
              </Grid>
            </Grid>

            {/* View Details Button */}
            <Box sx={{ textAlign: "right" }}>
              <Button
                variant="contained"
                startIcon={<Visibility />}
                onClick={() => onViewDetails(group)}
                sx={{
                  background:
                    "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)",
                  "&:hover": {
                    background:
                      "linear-gradient(135deg, #1e40af 0%, #2563eb 100%)",
                  },
                  px: 3,
                  py: 1.5,
                  fontWeight: 600,
                  borderRadius: 2,
                }}
              >
                View Details
              </Button>
            </Box>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}
