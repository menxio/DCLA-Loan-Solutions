import {
  Alert,
  Box,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Typography,
} from "@mui/material";
import {
  AccountBalance,
  Assignment,
  Group,
  Savings,
  Person,
} from "@mui/icons-material";
import { useCallback, useEffect, useMemo, useState } from "react";
import activityService from "@features/activity/api";
import type { ActivityLog, ActivityLogResponse } from "@features/activity/types";

type EntityIconMap = Record<string, JSX.Element>;

const iconMap: EntityIconMap = {
  loan: <AccountBalance sx={{ color: "#3b82f6" }} />,
  savings: <Savings sx={{ color: "#f59e0b" }} />,
  member: <Person sx={{ color: "#13ef6bff" }} />,
  center: <Group sx={{ color: "#10b981" }} />,
};

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
});

const toTitleCase = (value: string) =>
  value
    .replace(/[_-]/g, " ")
    .split(" ")
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");

const extractName = (
  payload: Record<string, unknown> | null | undefined,
  key: "memberName" | "centerName",
): string | undefined => {
  if (!payload) return undefined;
  const value = payload[key];
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
};

interface ActivityLogListProps {
  title?: string;
  limit?: number;
  height?: number | string;
}

export default function ActivityLogList({
  title = "Transaction History",
  limit = 20,
  height = 300,
}: ActivityLogListProps) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response: ActivityLogResponse = await activityService.list({
        limit,
      });
      setLogs(response.items);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to load activity logs.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  const content = useMemo(() => {
    if (loading) {
      return (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
          }}
        >
          <CircularProgress />
        </Box>
      );
    }

    if (error) {
      return (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      );
    }

    if (!logs.length) {
      return (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            color: "text.secondary",
          }}
        >
          <Typography variant="body1">No activity recorded yet.</Typography>
        </Box>
      );
    }

    return (
      <List>
        {logs.map((log, index) => {
          const icon =
            iconMap[log.entityType] ?? (
              <Assignment sx={{ color: "#6366f1" }} />
            );
          const amountText =
            typeof log.amount === "number"
              ? pesoFormatter.format(log.amount)
              : null;
          const createdAt = new Date(log.createdAt).toLocaleString();
          const subjectName =
            extractName(log.payload, "memberName") ??
            extractName(log.payload, "centerName");

          return (
            <Box key={log.id}>
              <ListItem
                alignItems="flex-start"
                sx={{
                  borderRadius: 2,
                  mb: 1,
                  backgroundColor: "#ffffff",
                  border: "1px solid #e2e8f0",
                }}
              >
                <ListItemIcon>{icon}</ListItemIcon>
                <ListItemText
                  primary={
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 0.5,
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          flexWrap: "wrap",
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 600, color: "#1e293b" }}
                        >
                          {toTitleCase(log.action)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {createdAt}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          • {toTitleCase(log.entityType)}
                        </Typography>
                        {amountText && (
                          <Typography
                            variant="caption"
                            sx={{ color: "#0f766e", fontWeight: 600 }}
                          >
                            {amountText}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  }
                  secondary={
                    log.description ? (
                      <Typography
                        variant="body2"
                        sx={{ color: "#475569", mt: 0.5 }}
                      >
                        {log.description}
                      </Typography>
                    ) : undefined
                  }
                />
              </ListItem>
              {index < logs.length - 1 && (
                <Divider sx={{ borderColor: "#e2e8f0" }} />
              )}
            </Box>
          );
        })}
      </List>
    );
  }, [logs, loading, error]);

  return (
    <Paper
      sx={{
        p: 3,
        background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
        border: "1px solid #e2e8f0",
        display: "flex",
        flexDirection: "column",
        ...(height !== undefined ? { height } : {}),
      }}
    >
      <Typography
        variant="h5"
        gutterBottom
        sx={{ fontWeight: 600, color: "#1e293b", mb: 2 }}
      >
        {title}
      </Typography>
      <Box sx={{ flex: 1, overflowY: "auto" }}>{content}</Box>
    </Paper>
  );
}
