import { Box } from "@mui/material";
import Header from "../header/Header";
import type { LayoutProps } from "../../types/common";

export default function DashboardLayout({ children }: LayoutProps) {
  return (
    <Box sx={{ display: "flex" }}>
      <Header />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          px: 3,
          pb: 3,
          pt: "94px",
          width: "100%",
          minHeight: "100vh",
          overflow: "visible",
          background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
          transition: "width 0.3s ease-in-out",
        }}
      >
        <Box sx={{ pb: 3 }}>
          {" "}
          {/* Add padding bottom for better spacing */}
          {children}
        </Box>
      </Box>
    </Box>
  );
}
