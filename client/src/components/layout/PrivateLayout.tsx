import { Box } from "@mui/material";
import Header from "../header/Header";
import type { LayoutProps } from "../../types/common";

export default function DashboardLayout({ children }: LayoutProps) {
  return (
    <Box sx={{ display: "flex", width: "100%", maxWidth: "100%", minWidth: 0 }}>
      <Header />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          px: { xs: 2, sm: 3 },
          pb: 3,
          pt: "94px",
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
          minHeight: "100vh",
          overflow: "visible",
          background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
          transition: "width 0.3s ease-in-out",
        }}
      >
        <Box sx={{ pb: 3, width: "100%", maxWidth: "100%", minWidth: 0 }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
