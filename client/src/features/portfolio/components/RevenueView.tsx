import { useState } from "react";
import { Box, Paper, Tab, Tabs, Typography } from "@mui/material";
import { Assessment, Savings } from "@mui/icons-material";
import ExpectedRevenueView from "./ExpectedRevenueView";
import ActualRevenueView from "./ActualRevenueView";

type RevenueMode = "expected" | "actual";

export default function RevenueView() {
  const [mode, setMode] = useState<RevenueMode>("expected");

  return (
    <Box>
      <Paper
        sx={{
          mb: 3,
          borderRadius: 3,
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
          overflow: "hidden",
        }}
      >
        <Box sx={{ px: 3, pt: 3, pb: 1 }}>
          <Typography variant="h6" sx={{ color: "#1e293b", fontWeight: 700, mb: 1 }}>
            Revenue
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Switch between expected collected revenue and actual collected revenue.
          </Typography>
        </Box>
        <Tabs
          value={mode}
          onChange={(_event, nextValue: RevenueMode) => setMode(nextValue)}
          sx={{
            px: 2,
            "& .MuiTab-root": {
              textTransform: "none",
              fontWeight: 600,
              color: "#64748b",
              minHeight: 54,
            },
            "& .Mui-selected": {
              color: "#2563eb !important",
            },
            "& .MuiTabs-indicator": {
              backgroundColor: "#2563eb",
              height: 3,
            },
          }}
        >
          <Tab
            value="expected"
            label={
              <Box display="flex" alignItems="center" gap={1}>
                <Assessment sx={{ fontSize: 18 }} />
                <span>Expected</span>
              </Box>
            }
          />
          <Tab
            value="actual"
            label={
              <Box display="flex" alignItems="center" gap={1}>
                <Savings sx={{ fontSize: 18 }} />
                <span>Actual</span>
              </Box>
            }
          />
        </Tabs>
      </Paper>

      {mode === "expected" ? <ExpectedRevenueView /> : <ActualRevenueView />}
    </Box>
  );
}
