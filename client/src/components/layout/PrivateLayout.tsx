import { Box, Toolbar } from "@mui/material";
import { useState, useEffect } from "react";
import Header from "@components/header/Header";
import Sidebar from "@components/sidebar/Sidebar";
import type { LayoutProps } from "../../types/common";

const SIDEBAR_WIDTH = 240;

export default function PrivateLayout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true); // Default open
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      // On mobile, sidebar should be closed by default
      if (mobile) {
        setSidebarOpen(false);
      } else {
        // On desktop, restore sidebar state or default to open
        const savedState = localStorage.getItem("sidebar-open");
        setSidebarOpen(savedState ? JSON.parse(savedState) : true);
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleSidebarToggle = () => {
    const newState = !sidebarOpen;
    setSidebarOpen(newState);

    // Save state to localStorage for desktop
    if (!isMobile) {
      localStorage.setItem("sidebar-open", JSON.stringify(newState));
    }
  };

  return (
    <Box sx={{ display: "flex" }}>
      <Header onMenuClick={handleSidebarToggle} />
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        width={SIDEBAR_WIDTH}
      />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: "100%",
          minHeight: "100vh",
          background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
          marginLeft: {
            xs: 0,
            md: sidebarOpen ? 0 : `-${SIDEBAR_WIDTH}px`,
          },
          transition: "margin-left 0.3s ease-in-out",
        }}
      >
        <Toolbar sx={{ minHeight: "70px !important" }} />
        {children}
      </Box>
    </Box>
  );
}
