import {
  Box,
  Chip,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import { Edit, LockReset, Block, CheckCircle } from "@mui/icons-material";
import type { AdminUser } from "../types";

interface UserTableProps {
  users: AdminUser[];
  loading?: boolean;
  currentUserId?: string;
  onEdit: (user: AdminUser) => void;
  onResetPassword: (user: AdminUser) => void;
  onToggleStatus: (user: AdminUser) => void;
}

export default function UserTable({
  users,
  loading = false,
  currentUserId,
  onEdit,
  onResetPassword,
  onToggleStatus,
}: UserTableProps) {
  if (loading && users.length === 0) {
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
          Loading users...
        </Typography>
      </Paper>
    );
  }

  if (users.length === 0) {
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
          No Users Found
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Create your first user to get started.
        </Typography>
      </Paper>
    );
  }

  return (
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
          Users List
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
                Name
              </TableCell>
              <TableCell
                sx={{
                  fontWeight: 600,
                  color: "#1e293b",
                  borderBottom: "2px solid #e2e8f0",
                }}
              >
                Email
              </TableCell>
              <TableCell
                sx={{
                  fontWeight: 600,
                  color: "#1e293b",
                  borderBottom: "2px solid #e2e8f0",
                }}
              >
                Role
              </TableCell>
              <TableCell
                sx={{
                  fontWeight: 600,
                  color: "#1e293b",
                  borderBottom: "2px solid #e2e8f0",
                }}
              >
                Status
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
            {users.map((user, index) => {
              const isSelf = currentUserId === user.id;
              const isAdmin = user.role === "admin";
              const disableStatus = isAdmin || isSelf;
              const disableEdit = isAdmin;
              const disableReset = isAdmin;
              return (
                <TableRow
                  key={user.id}
                  sx={{
                    "&:hover": { backgroundColor: "#f8fafc" },
                    backgroundColor: index % 2 === 0 ? "#ffffff" : "#fafbfc",
                  }}
                >
                  <TableCell>
                    <Typography variant="body1" fontWeight={500}>
                      {[user.firstName, user.middleName, user.lastName]
                        .filter(Boolean)
                        .join(" ") || "-"}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {user.email}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={(user.role || "").toString().toUpperCase()}
                      size="small"
                      sx={{
                        backgroundColor: "#e2e8f0",
                        color: "#334155",
                        fontWeight: 600,
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={user.isActive ? "Active" : "Inactive"}
                      size="small"
                      sx={{
                        backgroundColor: user.isActive ? "#dcfce7" : "#fee2e2",
                        color: user.isActive ? "#15803d" : "#b91c1c",
                        fontWeight: 600,
                      }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Box
                      sx={{ display: "flex", justifyContent: "center", gap: 1 }}
                    >
                      <Tooltip
                        title={
                          disableEdit
                            ? "Admin account cannot be edited here"
                            : "Edit user"
                        }
                      >
                        <span>
                          <IconButton
                            onClick={() => onEdit(user)}
                            size="small"
                            disabled={disableEdit}
                            sx={{
                              color: "#3b82f6",
                              "&:hover": { backgroundColor: "#dbeafe" },
                            }}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip
                        title={
                          disableReset
                            ? "Admin password cannot be reset here"
                            : "Reset password"
                        }
                      >
                        <span>
                          <IconButton
                            onClick={() => onResetPassword(user)}
                            size="small"
                            disabled={disableReset}
                            sx={{
                              color: "#f59e0b",
                              "&:hover": { backgroundColor: "#fef3c7" },
                            }}
                          >
                            <LockReset fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip
                        title={
                          user.isActive ? "Deactivate user" : "Reactivate user"
                        }
                      >
                        <span>
                          <IconButton
                            onClick={() => onToggleStatus(user)}
                            size="small"
                            disabled={disableStatus}
                            sx={{
                              color: user.isActive ? "#ef4444" : "#22c55e",
                              "&:hover": {
                                backgroundColor: user.isActive
                                  ? "#fee2e2"
                                  : "#dcfce7",
                              },
                            }}
                          >
                            {user.isActive ? (
                              <Block fontSize="small" />
                            ) : (
                              <CheckCircle fontSize="small" />
                            )}
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
