"use client"
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Avatar,
  Chip,
  Typography,
  Box,
  Card,
  CardContent,
  CardHeader,
  IconButton,
  Tooltip,
  useTheme,
  Button
} from "@mui/material"
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon,
  AccountBalance as LoanIcon,
  Savings as SavingsIcon,
} from "@mui/icons-material"

interface Member {
  firstName: string
  lastName: string
  middleName: string
  contactNumber: string
  address: string
  birthDate: Date
  loans: any[]
  savings: any[]
  createdAt: string
  updatedAt: string
}

interface MemberTableProps {
  members: Member[]
}

const staticMembers: Member[] = [
  {
    firstName: "Juan",
    lastName: "Dela Cruz",
    middleName: "Santos",
    contactNumber: "09171234567",
    address: "123 Main St, City",
    birthDate: new Date("1990-01-01"),
    loans: [],
    savings: [],
    createdAt: "",
    updatedAt: "",
  },
  {
    firstName: "Maria",
    lastName: "Reyes",
    middleName: "Lopez",
    contactNumber: "09181234567",
    address: "456 Second St, City",
    birthDate: new Date("1985-05-15"),
    loans: [],
    savings: [],
    createdAt: "",
    updatedAt: "",
  },
]

export default function MemberManagementTable({ members }: MemberTableProps) {
  const theme = useTheme()
  const data = Array.isArray(members) && members.length > 0 ? members : staticMembers

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getAvatarColor = (id: string) => {
    const colors = [
      theme.palette.primary.main,
      theme.palette.secondary.main,
      theme.palette.error.main,
      theme.palette.warning.main,
      theme.palette.info.main,
      theme.palette.success.main,
    ]
    return colors[Number.parseInt(id) % colors.length]
  }

  return (
    <Box sx={{ width: "100%" }}>
      <Card elevation={5}>
        <CardHeader
          title={
            <Typography variant="h4" component="h1" fontWeight="bold">
              Member Management
            </Typography>
          }
          subheader={
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Manage your organization members, their loans, and savings accounts
            </Typography>
          }
          sx={{ pb: 2 }}
        />
        <CardContent sx={{ pt: 0 }}>
            <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
                <Button
                variant="contained"
                color="primary"
                size="medium"
                sx={{ fontWeight: 600, borderRadius: 2 }}
                startIcon={<AddIcon />} // You can use AddIcon if you import it
                onClick={() => {
                    // TODO: Open add member dialog or navigate to add member page
                    alert("Add Member clicked!");
                }}
                >
                Add Member
                </Button>
            </Box>
          <TableContainer
            component={Paper}
            variant="outlined"
            sx={{
              borderRadius: 2,
              "& .MuiTableCell-root": {
                borderBottom: `1px solid ${theme.palette.divider}`,
              },
            }}
          >
            <Table>
              <TableHead>
                <TableRow
                  sx={{
                    backgroundColor: theme.palette.grey[50],
                    "& .MuiTableCell-head": {
                      fontWeight: 600,
                      color: theme.palette.text.primary,
                    },
                  }}
                >
                  <TableCell>Member</TableCell>
                  <TableCell>Contact Information</TableCell>
                  <TableCell>Birth Date</TableCell>
                  <TableCell align="center">Financial Status</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.map((member, index) => (
                  <TableRow
                    sx={{
                      "&:hover": {
                        backgroundColor: theme.palette.action.hover,
                      },
                      "&:last-child td, &:last-child th": { border: 0 },
                    }}
                  >
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <Avatar
                          sx={{
                            width: 48,
                            height: 48,
                            fontSize: "1.1rem",
                            fontWeight: 600,
                          }}
                        >
                          {getInitials(member.firstName, member.lastName)}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle1" fontWeight={500}>
                            {member.firstName} {member.middleName} {member.lastName}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <PhoneIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                          <Typography variant="body2">{member.contactNumber}</Typography>
                        </Box>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <LocationIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              maxWidth: 200,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {member.address}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <CalendarIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                        <Typography variant="body2">
                          {member.birthDate ? formatDate(member.birthDate) : "N/A"}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: "flex", justifyContent: "center", gap: 1, flexWrap: "wrap" }}>
                        <Chip
                          icon={<LoanIcon sx={{ fontSize: 16 }} />}
                          label={`${member.loans.length} Loans`}
                          variant="outlined"
                          size="small"
                          color={member.loans.length > 0 ? "warning" : "default"}
                        />
                        <Chip
                          icon={<SavingsIcon sx={{ fontSize: 16 }} />}
                          label={`${member.savings.length} Savings`}
                          variant="outlined"
                          size="small"
                          color={member.savings.length > 0 ? "success" : "default"}
                        />
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: "flex", justifyContent: "center", gap: 1 }}>
                        <Tooltip title="Edit Member">
                          <IconButton
                            size="small"
                            sx={{
                              color: theme.palette.primary.main,
                              "&:hover": {
                                backgroundColor: theme.palette.primary.main + "10",
                              },
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Member">
                          <IconButton
                            size="small"
                            sx={{
                              color: theme.palette.error.main,
                              "&:hover": {
                                backgroundColor: theme.palette.error.main + "10",
                              },
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {data.length === 0 && (
            <Box
              sx={{
                textAlign: "center",
                py: 8,
                color: "text.secondary",
              }}
            >
              <Typography variant="body1">No members found.</Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  )
}
