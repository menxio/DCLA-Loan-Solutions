import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Avatar,
  Alert,
  CircularProgress,
} from "@mui/material";
import {
  CalendarToday,
  LocationOn,
  People,
  CheckCircle,
  Schedule,
  Warning,
  Visibility,
  FileDownload,
} from "@mui/icons-material";
import { useEffect, useState } from "react";
import CollectionStatsCard from "./CollectionStatsCard";
import { exportAllCollectionsToExcel } from "../utils/exportUtils";
import collectionsService from "../api";
import type { DailyCollectionGroup, MemberWithLoans } from "../types";

interface DailyCollectionsViewProps {
  data: DailyCollectionGroup[];
  onViewDetails: (group: DailyCollectionGroup) => void;
  loading?: boolean;
}

export default function DailyCollectionsView({
  data,
  onViewDetails,
  loading,
}: DailyCollectionsViewProps) {
  const [exportingAll, setExportingAll] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [centerMembersMap, setCenterMembersMap] = useState<
    Record<string, MemberWithLoans[]>
  >({});

  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString()}`;
  };

  // Fetch members for each center so cards use the same basis as the modal
  useEffect(() => {
    let cancelled = false;
    const fetchAll = async () => {
      try {
        const results = await Promise.all(
          data.map(async (group) => {
            try {
              const members = await collectionsService.getCenterMembers(
                group.centerId
              );
              // Attach today's collection to each member for convenience
              const withCollections = members.map((m: any) => ({
                ...m,
                collection: group.collections.find((c) => c.memberId === m.id),
              }));
              return {
                centerId: group.centerId,
                members: withCollections as MemberWithLoans[],
              };
            } catch {
              return {
                centerId: group.centerId,
                members: [] as MemberWithLoans[],
              };
            }
          })
        );
        if (!cancelled) {
          const map: Record<string, MemberWithLoans[]> = {};
          results.forEach((r) => (map[r.centerId] = r.members));
          setCenterMembersMap(map);
        }
      } catch {
        if (!cancelled) setCenterMembersMap({});
      }
    };
    if (data.length > 0) fetchAll();
    return () => {
      cancelled = true;
    };
  }, [data]);

  const getMembersFor = (centerId: string) => centerMembersMap[centerId] || [];

  const sumOverallAmount = (group: DailyCollectionGroup) => {
    const members = getMembersFor(group.centerId);
    return members.reduce((sum, m) => sum + (Number(m.overallAmount) || 0), 0);
  };

  const sumTotalReceived = (group: DailyCollectionGroup) => {
    return group.collections.reduce(
      (sum, c) => sum + (Number(c.paymentReceived) || 0),
      0
    );
  };

  const sumRemainingBalance = (group: DailyCollectionGroup) => {
    const members = getMembersFor(group.centerId);
    const totalBalance = members.reduce(
      (sum, m) => sum + (Number(m.totalBalance) || 0),
      0
    );
    return totalBalance - sumTotalReceived(group);
  };

  const getPaidCount = (group: DailyCollectionGroup) => {
    const members = getMembersFor(group.centerId);
    if (members.length === 0) return 0;
    return group.collections.filter((c) => {
      const member = members.find((m) => m.id === c.memberId);
      return member
        ? c.paymentReceived >= (member.weeklyPaymentAmount || 0)
        : false;
    }).length;
  };

  const getPartialCount = (group: DailyCollectionGroup) => {
    const members = getMembersFor(group.centerId);
    if (members.length === 0) return 0;
    return group.collections.filter((c) => {
      const member = members.find((m) => m.id === c.memberId);
      return member
        ? c.paymentReceived > 0 &&
            c.paymentReceived < (member.weeklyPaymentAmount || 0)
        : false;
    }).length;
  };

  const getUnpaidCount = (group: DailyCollectionGroup) => {
    const members = getMembersFor(group.centerId);
    if (members.length === 0) return 0;
    return group.collections.filter((c) => {
      const member = members.find((m) => m.id === c.memberId);
      return member ? (c.paymentReceived || 0) <= 0 : false;
    }).length;
  };

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
              group.centerId
            );

            // Map the data to include collection information
            const membersWithCollections = centerMembers.map((member: any) => ({
              ...member,
              collection: group.collections.find(
                (c) => c.memberId === member.id
              ),
              // Ensure required fields for export
              netCashReleased:
                member.netCashReleased || member.collection?.netRelease || 0,
              numberOfPayments:
                member.numberOfPayments ||
                member.collection?.numberOfPayments ||
                0,
            }));

            return {
              group,
              members: membersWithCollections as MemberWithLoans[],
            };
          } catch (error) {
            console.error(
              `Failed to fetch members for center ${group.centerName}:`,
              error
            );
            // Return with empty members array to avoid breaking the export
            return {
              group,
              members: [] as MemberWithLoans[],
            };
          }
        })
      );

      // Filter out bundles with no members (failed API calls)
      const validBundles = exportBundles.filter(
        (bundle) => bundle.members.length > 0
      );

      if (validBundles.length === 0) {
        throw new Error("No data available to export. Please try again.");
      }

      // Generate the multi-sheet Excel file
      const collectionDate =
        data[0]?.collectionDate || new Date().toISOString().split("T")[0];
      const fileName = `Daily_Collections_Report_${collectionDate.replace(
        /-/g,
        "_"
      )}`;

      await exportAllCollectionsToExcel(validBundles, fileName);

      // Show success feedback
      console.log(
        `Successfully exported ${validBundles.length} collection reports`
      );
    } catch (error) {
      console.error("Failed to export all collections:", error);
      setExportError(
        error instanceof Error
          ? error.message
          : "Failed to export collections. Please try again."
      );
    } finally {
      setExportingAll(false);
    }
  };

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
      {data.map((group) => (
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
                    Received: {formatCurrency(sumTotalReceived(group))}
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
              <Grid item xs={6} md={3}>
                <CollectionStatsCard
                  title="Total Members"
                  value={group.totalMembers}
                  icon={<People />}
                  color="primary"
                />
              </Grid>
              <Grid item xs={6} md={3}>
                <CollectionStatsCard
                  title="Paid"
                  value={getPaidCount(group)}
                  icon={<CheckCircle />}
                  color="success"
                />
              </Grid>
              <Grid item xs={6} md={3}>
                <CollectionStatsCard
                  title="Unpaid"
                  value={getUnpaidCount(group)}
                  icon={<Schedule />}
                  color="warning"
                />
              </Grid>
              <Grid item xs={6} md={3}>
                <CollectionStatsCard
                  title="Partial"
                  value={getPartialCount(group)}
                  icon={<Warning />}
                  color="error"
                />
              </Grid>
            </Grid>

            {/* Collection Progress */}
            <Box
              sx={{
                p: 3,
                backgroundColor: "#f8fafc",
                borderRadius: 2,
                border: "1px solid #e2e8f0",
                mb: 3,
              }}
            >
              <Grid container spacing={3} alignItems="center">
                <Grid item xs={12} md={8}>
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: 600, color: "#1e293b", mb: 1 }}
                  >
                    Collection Progress
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {
                      group.collections.filter(
                        (c) => c.paymentReceived >= c.amount
                      ).length
                    }{" "}
                    of {group.totalMembers} members have completed their
                    payments
                  </Typography>

                  {/* Progress Bar */}
                  <Box sx={{ mt: 2, mb: 1 }}>
                    <Box
                      sx={{
                        width: "100%",
                        height: 8,
                        backgroundColor: "#e2e8f0",
                        borderRadius: 4,
                        overflow: "hidden",
                      }}
                    >
                      <Box
                        sx={{
                          width: `${(() => {
                            const total = sumOverallAmount(group);
                            const received = sumTotalReceived(group);
                            return total > 0 ? (received / total) * 100 : 0;
                          })()}%`,
                          height: "100%",
                          background:
                            "linear-gradient(135deg, #10b981 0%, #34d399 100%)",
                          transition: "width 0.3s ease-in-out",
                        }}
                      />
                    </Box>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {(() => {
                      const total = sumOverallAmount(group);
                      const received = sumTotalReceived(group);
                      return (total > 0 ? (received / total) * 100 : 0).toFixed(
                        1
                      );
                    })()}
                    % collected
                  </Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Box sx={{ textAlign: { xs: "left", md: "right" } }}>
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
                </Grid>
              </Grid>
            </Box>

            {/* Quick Summary */}
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    p: 2,
                    backgroundColor: "#f0f9ff",
                    borderRadius: 2,
                  }}
                >
                  <Avatar sx={{ bgcolor: "#3b82f6", width: 40, height: 40 }}>
                    <People />
                  </Avatar>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Members with Outstanding Balance
                    </Typography>
                    <Typography
                      variant="h6"
                      sx={{ fontWeight: 600, color: "#1e293b" }}
                    >
                      {
                        group.collections.filter(
                          (c) => c.paymentReceived < c.amount
                        ).length
                      }
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    p: 2,
                    backgroundColor: "#f0fdf4",
                    borderRadius: 2,
                  }}
                >
                  <Avatar sx={{ bgcolor: "#10b981", width: 40, height: 40 }}>
                    <CheckCircle />
                  </Avatar>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Collection Efficiency
                    </Typography>
                    <Typography
                      variant="h6"
                      sx={{ fontWeight: 600, color: "#1e293b" }}
                    >
                      {(
                        (group.collections.filter(
                          (c) => c.paymentReceived >= c.amount
                        ).length /
                          group.totalMembers) *
                        100
                      ).toFixed(1)}
                      %
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}
