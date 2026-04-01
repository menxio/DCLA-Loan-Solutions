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
import type { Repayment } from "../types";

const formatCurrency = (value: number) =>
  `PHP ${Number(value || 0).toLocaleString()}`;

const formatDateTime = (value?: string | null) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const formatDate = (value?: string | null) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
};

const getMemberName = (repayment: Repayment) => {
  const member = repayment.member;
  if (!member) return "Unknown member";
  const name = [member.lastName, member.firstName].filter(Boolean).join(", ");
  return name || "Unknown member";
};

const getCenterName = (repayment: Repayment) =>
  repayment.center?.name || "Unknown center";

export default function RepaymentApprovalsPage() {
  const { pending, loading, error, actingIds, refresh, approveRepayment, rejectRepayment } =
    useRepaymentApprovals();
  const [search, setSearch] = useState("");
  const [approveTarget, setApproveTarget] = useState<Repayment | null>(null);
  const [rejectState, setRejectState] = useState<{
    open: boolean;
    target: Repayment | null;
    reason: string;
  }>({ open: false, target: null, reason: "" });
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return pending;
    return pending.filter((item) => {
      const memberName = getMemberName(item).toLowerCase();
      const centerName = getCenterName(item).toLowerCase();
      const loanId = item.loan?.id?.toLowerCase() || "";
      return (
        memberName.includes(query) ||
        centerName.includes(query) ||
        loanId.includes(query)
      );
    });
  }, [pending, search]);

  const showSnackbar = (
    message: string,
    severity: "success" | "error" = "success"
  ) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleApprove = async () => {
    if (!approveTarget) return;
    try {
      await approveRepayment(approveTarget.id);
      showSnackbar("Repayment approved.");
    } catch (err) {
      showSnackbar("Failed to approve repayment.", "error");
    } finally {
      setApproveTarget(null);
    }
  };

  const handleReject = async () => {
    if (!rejectState.target) return;
    try {
      await rejectRepayment(rejectState.target.id, rejectState.reason);
      showSnackbar("Repayment rejected.");
    } catch (err) {
      showSnackbar("Failed to reject repayment.", "error");
    } finally {
      setRejectState({ open: false, target: null, reason: "" });
    }
  };

  if (loading && pending.length === 0) {
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
                  Repayment Approvals
                </Typography>
                <Typography variant="body1" color="#64748b">
                  Review and approve cashier-posted repayments.
                </Typography>
              </Box>
            </Box>

            <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
              <Chip
                label={`${pending.length} pending`}
                color="warning"
                sx={{ fontWeight: 600 }}
              />
              <TextField
                size="small"
                placeholder="Search member or center"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                sx={{
                  minWidth: 220,
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
                    <TableCell>Created</TableCell>
                    <TableCell>Member</TableCell>
                    <TableCell>Center</TableCell>
                    <TableCell>Collection Date</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell>Savings</TableCell>
                    <TableCell>Notes</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map((item) => {
                    const isActing = actingIds.has(item.id);
                    return (
                      <TableRow key={item.id} hover>
                        <TableCell>{formatDateTime(item.createdAt)}</TableCell>
                        <TableCell>
                          <Typography sx={{ fontWeight: 600 }}>
                            {getMemberName(item)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {item.loan?.id ? `Loan ${item.loan.id}` : "No loan"}
                          </Typography>
                        </TableCell>
                        <TableCell>{getCenterName(item)}</TableCell>
                        <TableCell>{formatDate(item.collectionDate)}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>
                          {formatCurrency(item.amount)}
                        </TableCell>
                        <TableCell>{item.useSavings ? "Yes" : "No"}</TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{
                              maxWidth: 200,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {item.notes || "No notes"}
                          </Typography>
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
                      <TableCell colSpan={9} align="center">
                        <Typography variant="body2" color="text.secondary">
                          No pending repayments found.
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
        <DialogTitle>Approve repayment</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will apply the payment to the loan and update collection totals.
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
            Approve
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={rejectState.open}
        onClose={() => setRejectState({ open: false, target: null, reason: "" })}
      >
        <DialogTitle>Reject repayment</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Optionally add a reason to help the cashier understand the rejection.
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
            onClick={() =>
              setRejectState({ open: false, target: null, reason: "" })
            }
            sx={{ color: "#64748b" }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleReject}
          >
            Reject
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
