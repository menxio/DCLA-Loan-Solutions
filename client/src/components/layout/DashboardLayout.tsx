import { Box, Toolbar } from "@mui/material";
import { useState } from "react";
import Header from "@components/header/Header";
import Sidebar from "@components/sidebar/Sidebar";
import type { LayoutProps } from "../../types/common";

export default function DashboardLayout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <Box sx={{ display: "flex" }}>
      <Header onMenuClick={handleSidebarToggle} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: "100%",
          minHeight: "100vh",
          backgroundColor: "grey.50",
        }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}
