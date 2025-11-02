import {
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
  Button,
  Tooltip,
  alpha,
} from "@mui/material";
import { Payment, AccountBalance } from "@mui/icons-material";

interface Loan {
  id: string;
  status: string;
  weeksPaid?: number;
}

interface Collection {
  paymentReceived: number;
  amount: number;
  netRelease?: number;
  numberOfPayments?: number;
}

interface MemberWithLoans {
  id: string;
  firstName: string;
  lastName: string;
  contactNumber: string;
  totalLoanAmount: number;
  overallAmount: number;
  totalTermWeeks: number;
  weeklyPaymentAmount: number;
  totalSavings: number;
  totalBalance: number;
  loans: Loan[];
  collection?: Collection;
}

interface MembersTableProps {
  members: any[];
  getStatusColor: (member: any) => "default" | "success" | "warning" | "error";
  getStatusLabel: (member: any) => string;
  getCollectionMetrics: (member: any) => {
    received: number;
    due: number;
    weeklyDue?: number;
  };
  formatCurrency: (amount: number) => string;
  onOpenPaymentDialog: (member: any) => void;
  onOpenReloanDialog: (member: any) => void;
}

export function MembersTable({
  members,
  getStatusColor,
  getStatusLabel,
  getCollectionMetrics,
  formatCurrency,
  onOpenPaymentDialog,
  onOpenReloanDialog,
}: MembersTableProps) {
  const tableHeaders = [
    { label: "Client Name", minWidth: 180 },
    { label: "Loan Amount", minWidth: 120 },
    { label: "Overall Amount", minWidth: 130 },
    { label: "Term Weeks", minWidth: 100 },
    { label: "Weekly Payment", minWidth: 130 },
    { label: "Payment Received", minWidth: 140 },
    { label: "Net Cash Released", minWidth: 140 },
    { label: "Payments Made", minWidth: 120 },
    { label: "Savings", minWidth: 100 },
    { label: "Remaining Balance", minWidth: 140 },
    { label: "Status", minWidth: 100 },
    { label: "Actions", minWidth: 180 },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography
        variant="h6"
        sx={{
          fontWeight: 600,
          color: "#1e293b",
          mb: 3,
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <AccountBalance sx={{ color: "#3b82f6" }} />
        Member Collection Status & Management
      </Typography>

      <TableContainer
        component={Paper}
        sx={{
          borderRadius: 3,
          border: "1px solid #e2e8f0",
          maxHeight: 600,
          overflow: "auto",
          boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
        }}
      >
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              {tableHeaders.map((header, index) => (
                <TableCell
                  key={index}
                  sx={{
                    fontWeight: 600,
                    color: "#1e293b",
                    backgroundColor: "#f8fafc",
                    minWidth: header.minWidth,
                    borderBottom: "2px solid #e2e8f0",
                  }}
                >
                  {header.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {members.map((member, index) => {
              const activeLoan = member.loans?.find(
                (l: any) => l.status === "active"
              ) as any;
              const { received, due } = getCollectionMetrics(member);
              const weeksPaid =
                (activeLoan as any)?.weeksPaid ??
                member.collection?.numberOfPayments ??
                0;
              const hasActive = Boolean(activeLoan);
              const principal = Number(activeLoan?.principalAmount ?? 0);
              const totalAmount = Number(activeLoan?.totalAmount ?? 0);
              const weekly =
                due ||
                Number(activeLoan?.weeklyPaymentAmount ?? member.weeklyPaymentAmount ?? 0);
              const balance = Number(activeLoan?.balance ?? 0);
              const paymentColor =
                due > 0
                  ? received >= due
                    ? "#10b981"
                    : received > 0
                      ? "#f59e0b"
                      : "#6b7280"
                  : received > 0
                    ? "#f59e0b"
                    : "#6b7280";

              return (
                <TableRow
                  key={member.id}
                  sx={{
                    "&:hover": {
                      backgroundColor: alpha("#3b82f6", 0.04),
                      transform: "scale(1.001)",
                      transition: "all 0.2s ease-in-out",
                    },
                    backgroundColor: index % 2 === 0 ? "#ffffff" : "#fafbfc",
                    transition: "all 0.2s ease-in-out",
                  }}
                >
                  <TableCell>
                    <Box>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 600, color: "#1e293b" }}
                      >
                        {member.firstName} {member.lastName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {member.contactNumber}
                      </Typography>
                    </Box>
                  </TableCell>

                  <TableCell>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 600, color: "#1e3a8a" }}
                    >
                      {formatCurrency(hasActive ? principal : 0)}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 600, color: "#8b5cf6" }}
                    >
                      {formatCurrency(hasActive ? totalAmount : 0)}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Chip
                      label={`${Number(
                        (hasActive ? activeLoan?.termWeeks : 0) || 0
                      )}w`}
                      size="small"
                      sx={{
                        backgroundColor: "#dbeafe",
                        color: "#1e40af",
                        fontWeight: 600,
                      }}
                    />
                  </TableCell>

                  <TableCell>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 600, color: "#059669" }}
                    >
                      {formatCurrency(hasActive ? weekly : 0)}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        color: paymentColor,
                      }}
                    >
                      {formatCurrency(received)}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 600, color: "#3b82f6" }}
                    >
                      {formatCurrency(Number((member as any)?.netCashReleased || 0))}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Chip
                      label={weeksPaid}
                      size="small"
                      sx={{
                        backgroundColor: "#f3e8ff",
                        color: "#7c3aed",
                        fontWeight: 600,
                      }}
                    />
                  </TableCell>

                  <TableCell>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 600, color: "#f59e0b" }}
                    >
                      {formatCurrency(Number(member.totalSavings || 0))}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        color:
                          Number(hasActive ? balance : 0) > 0
                            ? "#ef4444"
                            : "#10b981",
                      }}
                    >
                      {formatCurrency(Number(hasActive ? balance : 0))}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Chip
                      label={getStatusLabel(member)}
                      color={getStatusColor(member) as any}
                      size="small"
                      sx={{ fontWeight: 600, minWidth: 80 }}
                    />
                  </TableCell>

                  <TableCell>
                    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                      <Tooltip title="Process Payment">
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<Payment />}
                          onClick={() => onOpenPaymentDialog(member)}
                          disabled={!hasActive || Number(balance) <= 0}
                          sx={{
                            minWidth: 100,
                            borderRadius: 2,
                            "&:hover": {
                              backgroundColor: alpha("#3b82f6", 0.1),
                            },
                          }}
                        >
                          Payment
                        </Button>
                      </Tooltip>
                      <Tooltip title="Process Reloan">
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<AccountBalance />}
                          onClick={() =>
                            onOpenReloanDialog({
                              ...member,
                              _forcePayoff: !hasActive || Number(balance) <= 0,
                            } as any)
                          }
                          sx={{
                            minWidth: 100,
                            borderRadius: 2,
                            "&:hover": {
                              backgroundColor: alpha("#10b981", 0.1),
                            },
                          }}
                        >
                          Reloan
                        </Button>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
