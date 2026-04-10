import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Paper,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { CheckCircle, FactCheck, Refresh } from "@mui/icons-material";
import DashboardLayout from "@components/layout/PrivateLayout";
import PageLoadingSkeleton from "@components/common/PageLoadingSkeleton";
import { useRepaymentApprovals } from "../hooks/useRepaymentApprovals";
import type { PendingRepaymentCollectionGroup } from "../types";

const formatCurrency = (value: number) =>
  `PHP ${Number(value || 0).toLocaleString()}`;

const formatDate = (value?: string | null) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
};

export default function RepaymentApprovalsPage() {
  const {
    pendingCollections,
    loading,
    error,
    actingIds,
    getActionKey,
    refresh,
    approveCollection,
    rejectCollection,
  } = useRepaymentApprovals();

  const [search, setSearch] = useState("");
  const [approveTarget, setApproveTarget] =
    useState<PendingRepaymentCollectionGroup | null>(null);
  const [rejectState, setRejectState] = useState<{
    open: boolean;
    target: PendingRepaymentCollectionGroup | null;
    reason: string;
  }>({ open: false, target: null, reason: "" });
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return pendingCollections;

    return pendingCollections.filter((item) => {
      const centerName = (item.centerName || "").toLowerCase();
      const collectionDate = item.collectionDate || "";
      return centerName.includes(query) || collectionDate.includes(query);
    });
  }, [pendingCollections, search]);

  const totalPendingEntries = useMemo(
    () => pendingCollections.reduce((sum, item) => sum + Number(item.pendingCount || 0), 0),
    [pendingCollections]
  );

  const showSnackbar = (
    message: string,
    severity: "success" | "error" = "success"
  ) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleApprove = async () => {
    if (!approveTarget) return;

    try {
      await approveCollection(
        approveTarget.centerId,
        approveTarget.collectionDate,
        approveTarget.batchId
      );
      showSnackbar("Collection approved successfully.");
    } catch (err) {
      showSnackbar("Failed to approve collection.", "error");
    } finally {
      setApproveTarget(null);
    }
  };

  const handleReject = async () => {
    if (!rejectState.target) return;

    try {
      await rejectCollection(
        rejectState.target.centerId,
        rejectState.target.collectionDate,
        rejectState.reason,
        rejectState.target.batchId
      );
      showSnackbar("Collection rejected.");
    } catch (err) {
      showSnackbar("Failed to reject collection.", "error");
    } finally {
      setRejectState({ open: false, target: null, reason: "" });
    }
  };

  if (loading && pendingCollections.length === 0) {
    return (
      <DashboardLayout>
        <PageLoadingSkeleton showStats={false} filterCount={2} rowCount={8} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Box sx={{ backgroundColor: "#f8fafc", minHeight: "100vh" }}>
        <Paper
          sx={{
            background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
            border: "1px solid #e2e8f0",
            borderRadius: 3,
            p: 4,
            mb: 3,
            boxShadow:
              "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
          }}
        >
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            gap={2}
            flexWrap="wrap"
          >
            <Box display="flex" alignItems="center" gap={3}>
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: 2,
                  background:
                    "linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 14px 0 rgba(59, 130, 246, 0.3)",
                }}
              >
                <FactCheck sx={{ fontSize: 28, color: "white" }} />
              </Box>
              <Box>
                <Typography variant="h4" fontWeight="bold" color="#1e293b">
                  Collection Approvals
                </Typography>
                <Typography variant="body1" color="#64748b">
                  Approve or reject pending collections by center and business date.
                </Typography>
              </Box>
            </Box>

            <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
              <Chip
                label={`${filtered.length} pending collections / ${totalPendingEntries} entries`}
                color="warning"
                sx={{ fontWeight: 600 }}
              />
              <TextField
                size="small"
                placeholder="Search center or date"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                sx={{
                  minWidth: 240,
                  "& .MuiOutlinedInput-root": {
                    backgroundColor: "white",
                    borderRadius: 2,
                  },
                }}
              />
              <Button
                variant="contained"
                startIcon={<Refresh />}
                onClick={refresh}
                sx={{
                  background:
                    "linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)",
                  borderRadius: 2,
                  px: 3,
                  py: 1.5,
                  textTransform: "none",
                  fontWeight: 600,
                  boxShadow: "0 4px 14px 0 rgba(59, 130, 246, 0.3)",
                  "&:hover": {
                    background:
                      "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                    boxShadow: "0 6px 20px 0 rgba(59, 130, 246, 0.4)",
                  },
                }}
              >
                Refresh
              </Button>
            </Box>
          </Box>
        </Paper>

        {error && (
          <Box px={3}>
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
              {error}
            </Alert>
          </Box>
        )}

        <Box px={3}>
          <Paper
            sx={{
              borderRadius: 3,
              border: "1px solid #e2e8f0",
              boxShadow:
                "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
              overflow: "hidden",
            }}
          >
            <TableContainer>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Collection Date</TableCell>
                    <TableCell>Center</TableCell>
                    <TableCell align="right">Entries</TableCell>
                    <TableCell align="right">Payments</TableCell>
                    <TableCell align="right">Reversals</TableCell>
                    <TableCell align="right">Payment Total</TableCell>
                    <TableCell align="right">Reversal Total</TableCell>
                    <TableCell align="right">Net Total</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map((item) => {
                    const isActing = actingIds.has(
                      getActionKey(item.centerId, item.collectionDate, item.batchId)
                    );

                    return (
                      <TableRow
                        key={`${item.batchId ?? "legacy"}-${item.centerId}-${item.collectionDate}`}
                        hover
                      >
                        <TableCell>{formatDate(item.collectionDate)}</TableCell>
                        <TableCell>
                          <Typography sx={{ fontWeight: 600 }}>
                            {item.centerName || "Unknown center"}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">{item.pendingCount}</TableCell>
                        <TableCell align="right">{item.paymentCount}</TableCell>
                        <TableCell align="right">{item.reversalCount}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>
                          {formatCurrency(item.paymentAmount)}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>
                          {formatCurrency(item.reversalAmount)}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            fontWeight: 700,
                            color: item.netAmount < 0 ? "error.main" : "text.primary",
                          }}
                        >
                          {formatCurrency(item.netAmount)}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label="Pending"
                            color="warning"
                            size="small"
                            sx={{ fontWeight: 600 }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Box display="flex" gap={1} justifyContent="flex-end">
                            <Button
                              size="small"
                              variant="contained"
                              startIcon={<CheckCircle />}
                              disabled={isActing}
                              onClick={() => setApproveTarget(item)}
                              sx={{
                                background:
                                  "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                                textTransform: "none",
                                fontWeight: 600,
                                "&:hover": {
                                  background:
                                    "linear-gradient(135deg, #059669 0%, #047857 100%)",
                                },
                              }}
                            >
                              Approve
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              disabled={isActing}
                              onClick={() =>
                                setRejectState({
                                  open: true,
                                  target: item,
                                  reason: "",
                                })
                              }
                              sx={{ textTransform: "none", fontWeight: 600 }}
                            >
                              Reject
                            </Button>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  {!loading && filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} align="center">
                        <Typography variant="body2" color="text.secondary">
                          No pending collections found.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      </Box>

      <Dialog open={Boolean(approveTarget)} onClose={() => setApproveTarget(null)}>
        <DialogTitle>Approve collection</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will approve all pending repayments for
            {" "}
            <strong>{approveTarget?.centerName || "Unknown center"}</strong>
            {" "}
            on
            {" "}
            <strong>{formatDate(approveTarget?.collectionDate)}</strong>
            .
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 1 }}>
          <Button onClick={() => setApproveTarget(null)} sx={{ color: "#64748b" }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleApprove}
            sx={{
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              "&:hover": {
                background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
              },
            }}
          >
            Approve Collection
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={rejectState.open}
        onClose={() => setRejectState({ open: false, target: null, reason: "" })}
      >
        <DialogTitle>Reject collection</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            This will reject all pending repayments in the selected collection.
            Add a reason to help cashier correction.
          </DialogContentText>
          <TextField
            fullWidth
            label="Rejection reason (optional)"
            value={rejectState.reason}
            onChange={(event) =>
              setRejectState((prev) => ({ ...prev, reason: event.target.value }))
            }
            multiline
            minRows={2}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 1 }}>
          <Button
            onClick={() => setRejectState({ open: false, target: null, reason: "" })}
            sx={{ color: "#64748b" }}
          >
            Cancel
          </Button>
          <Button variant="contained" color="error" onClick={handleReject}>
            Reject Collection
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          icon={<CheckCircle fontSize="small" />}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </DashboardLayout>
  );
}
