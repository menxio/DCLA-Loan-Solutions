import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Paper,
} from "@mui/material";
import {
  Edit,
  CalendarToday,
  LocationOn,
  People,
  CheckCircle,
  Schedule,
  Warning,
} from "@mui/icons-material";
import CollectionStatsCard from "./CollectionStatsCard";
import type { DailyCollectionGroup, Collection } from "../types";

interface DailyCollectionsViewProps {
  data: DailyCollectionGroup[];
  onEditCollection: (collection: Collection) => void;
  loading?: boolean;
}

export default function DailyCollectionsView({
  data,
  onEditCollection,
  loading,
}: DailyCollectionsViewProps) {
  const getStatusColor = (collection: Collection) => {
    if (collection.paymentReceived >= collection.amount) return "success";
    if (collection.paymentReceived > 0) return "warning";
    return "error";
  };

  const getStatusLabel = (collection: Collection) => {
    if (collection.paymentReceived >= collection.amount) return "PAID";
    if (collection.paymentReceived > 0) return "PARTIAL";
    return "PENDING";
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
      {data.map((group) => (
        <Card
          key={group.centerId}
          sx={{
            mb: 4,
            background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
            border: "1px solid #e2e8f0",
            overflow: "hidden",
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
                    ₱{group.totalAmount.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Received: ₱{group.totalReceived.toLocaleString()}
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
                  value={
                    group.collections.filter(
                      (c) => c.paymentReceived >= c.amount
                    ).length
                  }
                  icon={<CheckCircle />}
                  color="success"
                />
              </Grid>
              <Grid item xs={6} md={3}>
                <CollectionStatsCard
                  title="Pending"
                  value={group.pendingCollections}
                  icon={<Schedule />}
                  color="warning"
                />
              </Grid>
              <Grid item xs={6} md={3}>
                <CollectionStatsCard
                  title="Partial"
                  value={
                    group.collections.filter(
                      (c) =>
                        c.paymentReceived < c.amount && c.paymentReceived > 0
                    ).length
                  }
                  icon={<Warning />}
                  color="error"
                />
              </Grid>
            </Grid>

            {/* Collections Table */}
            <TableContainer
              component={Paper}
              sx={{
                borderRadius: 2,
                border: "1px solid #e2e8f0",
              }}
            >
              <Table>
                <TableHead sx={{ backgroundColor: "#f8fafc" }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, color: "#1e293b" }}>
                      Member
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: "#1e293b" }}>
                      Amount
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: "#1e293b" }}>
                      Received
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: "#1e293b" }}>
                      Balance
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: "#1e293b" }}>
                      Status
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: "#1e293b" }}>
                      Notes
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{ fontWeight: 600, color: "#1e293b" }}
                    >
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {group.collections.map((collection, index) => (
                    <TableRow
                      key={collection.id}
                      sx={{
                        "&:hover": { backgroundColor: "#f8fafc" },
                        backgroundColor:
                          index % 2 === 0 ? "#ffffff" : "#fafbfc",
                      }}
                    >
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {collection.member?.firstName}{" "}
                          {collection.member?.lastName}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          ₱{collection.amount.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          ₱{collection.paymentReceived.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 600,
                            color:
                              collection.paymentReceived >= collection.amount
                                ? "#10b981"
                                : "#ef4444",
                          }}
                        >
                          ₱
                          {(
                            collection.amount - collection.paymentReceived
                          ).toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getStatusLabel(collection)}
                          color={getStatusColor(collection)}
                          size="small"
                          sx={{ fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{
                            maxWidth: 150,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {collection.notes || "-"}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          onClick={() => onEditCollection(collection)}
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
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}
