import { Card, CardContent, Typography, Box, Avatar } from "@mui/material";
import type React from "react";

interface CollectionStatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: "primary" | "success" | "warning" | "error" | "info";
  subtitle?: string;
}

export default function CollectionStatsCard({
  title,
  value,
  icon,
  color,
  subtitle,
}: CollectionStatsCardProps) {
  const colorMap = {
    primary: "#1e3a8a",
    success: "#10b981",
    warning: "#f59e0b",
    error: "#ef4444",
    info: "#0284c7",
  };

  return (
    <Card
      sx={{
        height: "100%",
        background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
        border: "1px solid #e2e8f0",
        transition: "all 0.3s ease-in-out",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: "0 8px 25px rgba(0, 0, 0, 0.1)",
        },
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
          <Avatar
            sx={{
              bgcolor: colorMap[color],
              mr: 2,
              width: 48,
              height: 48,
              background: `linear-gradient(135deg, ${colorMap[color]} 0%, ${colorMap[color]}CC 100%)`,
            }}
          >
            {icon}
          </Avatar>
          <Box>
            <Typography
              variant="h5"
              component="div"
              fontWeight="bold"
              sx={{ color: "#1e293b" }}
            >
              {value}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontWeight: 500 }}
            >
              {title}
            </Typography>
          </Box>
        </Box>
        {subtitle && (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
