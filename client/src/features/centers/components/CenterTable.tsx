import { useState } from "react";
import {
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Box,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  CircularProgress,
} from "@mui/material";
import { Edit, Delete, LocationOn, CalendarToday } from "@mui/icons-material";
import type { CenterTableProps, Center } from "../types";

export default function CenterTable({
  centers,
  onEdit,
  onDelete,
  loading = false,
}: CenterTableProps) {
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    center: Center | null;
  }>({
    open: false,
    center: null,
  });
  const [deleting, setDeleting] = useState(false);

  const handleDeleteClick = (center: Center) => {
    setDeleteDialog({
      open: true,
      center,
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.center) return;

    try {
      setDeleting(true);
      await onDelete(deleteDialog.center.id);
      setDeleteDialog({ open: false, center: null });
    } catch (err) {
      console.error("Error deleting center:", err);
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({ open: false, center: null });
  };

  const getDayColor = (day: string) => {
    const colors: Record<string, string> = {
      Monday: "#ef4444",
      Tuesday: "#f97316",
      Wednesday: "#eab308",
      Thursday: "#22c55e",
      Friday: "#3b82f6",
      Saturday: "#8b5cf6",
      Sunday: "#ec4899",
    };
    return colors[day] || "#64748b";
  };

  if (loading && centers.length === 0) {
    return (
      <Paper
        sx={{
          p: 4,
          background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
          border: "1px solid #e2e8f0",
          textAlign: "center",
        }}
      >
        <CircularProgress size={40} />
        <Typography variant="body1" sx={{ mt: 2, color: "text.secondary" }}>
          Loading centers...
        </Typography>
      </Paper>
    );
  }

  if (centers.length === 0) {
    return (
      <Paper
        sx={{
          p: 4,
          background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
          border: "1px solid #e2e8f0",
          textAlign: "center",
        }}
      >
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No Centers Found
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Create your first center using the form above.
        </Typography>
      </Paper>
    );
  }

  return (
    <>
      <Paper
        sx={{
          background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
          border: "1px solid #e2e8f0",
          overflow: "hidden",
        }}
      >
        <Box sx={{ p: 3, borderBottom: "1px solid #e2e8f0" }}>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 600,
              color: "#1e293b",
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            Centers List
            <Chip
              label={centers.length}
              size="small"
              sx={{
                backgroundColor: "#1e3a8a",
                color: "white",
                fontWeight: 600,
              }}
            />
          </Typography>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: "#f8fafc" }}>
                <TableCell
                  sx={{
                    fontWeight: 600,
                    color: "#1e293b",
                    borderBottom: "2px solid #e2e8f0",
                  }}
                >
                  Center Name
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 600,
                    color: "#1e293b",
                    borderBottom: "2px solid #e2e8f0",
                  }}
                >
                  Collection Day
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 600,
                    color: "#1e293b",
                    borderBottom: "2px solid #e2e8f0",
                  }}
                >
                  Address
                </TableCell>
                <TableCell
                  align="center"
                  sx={{
                    fontWeight: 600,
                    color: "#1e293b",
                    borderBottom: "2px solid #e2e8f0",
                  }}
                >
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {centers.map((center, index) => (
                <TableRow
                  key={center.id}
                  sx={{
                    "&:hover": {
                      backgroundColor: "#f8fafc",
                    },
                    backgroundColor: index % 2 === 0 ? "#ffffff" : "#fafbfc",
                  }}
                >
                  <TableCell>
                    <Typography variant="body1" fontWeight={500}>
                      {center.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={<CalendarToday sx={{ fontSize: 16 }} />}
                      label={center.collectionDay}
                      size="small"
                      sx={{
                        backgroundColor: getDayColor(center.collectionDay),
                        color: "white",
                        fontWeight: 500,
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    {center.address ? (
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <LocationOn sx={{ fontSize: 16, color: "#64748b" }} />
                        <Typography variant="body2" color="text.secondary">
                          {center.address}
                        </Typography>
                      </Box>
                    ) : (
                      <Typography
                        variant="body2"
                        color="text.disabled"
                        fontStyle="italic"
                      >
                        No address provided
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Box
                      sx={{ display: "flex", justifyContent: "center", gap: 1 }}
                    >
                      <IconButton
                        onClick={() => onEdit(center)}
                        size="small"
                        sx={{
                          color: "#3b82f6",
                          "&:hover": {
                            backgroundColor: "#dbeafe",
                          },
                        }}
                      >
                        <Edit fontSize="small" />
                      </IconButton>
                      <IconButton
                        onClick={() => handleDeleteClick(center)}
                        size="small"
                        sx={{
                          color: "#ef4444",
                          "&:hover": {
                            backgroundColor: "#fee2e2",
                          },
                        }}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={handleDeleteCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 600, color: "#1e293b" }}>
          Delete Center
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete "{deleteDialog.center?.name}"? This
            action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 1 }}>
          <Button
            onClick={handleDeleteCancel}
            disabled={deleting}
            sx={{ color: "#64748b" }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            variant="contained"
            color="error"
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={16} /> : <Delete />}
          >
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
