import type React from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Box,
  Button,
  ListItemIcon,
  Divider,
} from "@mui/material";
import {
  AccountCircle,
  Logout,
  Dashboard,
  Groups,
  Person4,
  AccountBalance,
  History,
  KeyboardArrowDown,
  AdminPanelSettings,
  FactCheck,
  MoneyOff,
} from "@mui/icons-material";
import { useState } from "react";
import { authService } from "@features/auth/api";
import { useAuthStore } from "@features/auth/authStore";
import { useNavigate } from "react-router-dom";
import {
  canAccessPath,
  getDefaultRouteForRole,
} from "@features/auth/access";

interface HeaderProps {
  title?: string;
  offsetLeft?: number;
}

const navItems = [
  { label: "Dashboard", path: "/dashboard", icon: Dashboard },
  { label: "Members", path: "/member-management", icon: Person4 },
  { label: "Centers", path: "/centers", icon: Groups },
  { label: "Collections", path: "/collections", icon: Groups },
  { label: "Portfolio", path: "/portfolio", icon: AccountBalance },
  { label: "Transactions", path: "/transactions", icon: History },
  { label: "Approvals", path: "/approvals", icon: FactCheck },
  // { label: "Waivers", path: "/waivers", icon: MoneyOff },
];

export default function Header({
  title = "DCLA Loan Solutions",
  offsetLeft = 0,
}: HeaderProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [navAnchorEl, setNavAnchorEl] = useState<null | HTMLElement>(null);
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const isSuperAdmin = user?.role === "superadmin";
  const role = user?.role ?? "";
  const defaultRoute = getDefaultRouteForRole(role);
  const visibleNavItems = navItems.filter((item) => canAccessPath(role, item.path));

  const handleAccountMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleAccountClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    await authService.logout();
    navigate("/login");
    handleAccountClose();
  };

  const handleNavMenu = (event: React.MouseEvent<HTMLElement>) => {
    setNavAnchorEl(event.currentTarget);
  };

  const handleNavClose = () => {
    setNavAnchorEl(null);
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    handleNavClose();
  };

  const userName = [user?.firstName, user?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    <AppBar
      position="fixed"
      sx={{
        left: { xs: 0, md: `${offsetLeft}px` },
        width: { xs: "100%", md: `calc(100% - ${offsetLeft}px)` },
        zIndex: (theme) => theme.zIndex.drawer + 1,
        background: "linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)",
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
        transition: "width 0.3s ease-in-out, left 0.3s ease-in-out",
      }}
    >
      <Toolbar sx={{ minHeight: "70px !important" }}>
        <Typography
          variant="h5"
          noWrap
          component="div"
          sx={{
            flexGrow: 1,
            fontWeight: 700,
            background: "linear-gradient(45deg, #ffffff 30%, #e2e8f0 90%)",
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          {title}
        </Typography>

        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          {!isSuperAdmin && (
            <Button
              variant="outlined"
              color="inherit"
              onClick={handleNavMenu}
              endIcon={<KeyboardArrowDown />}
              sx={{
                borderColor: "rgba(255, 255, 255, 0.4)",
                color: "white",
                textTransform: "none",
                fontWeight: 600,
                "&:hover": {
                  borderColor: "rgba(255, 255, 255, 0.7)",
                  backgroundColor: "rgba(255, 255, 255, 0.08)",
                },
              }}
            >
              Menu
            </Button>
          )}

          <IconButton
            size="large"
            aria-label="account of current user"
            aria-controls="menu-appbar"
            aria-haspopup="true"
            onClick={handleAccountMenu}
            sx={{
              "&:hover": {
                backgroundColor: "rgba(255, 255, 255, 0.1)",
              },
            }}
          >
            <Avatar
              sx={{
                width: 36,
                height: 36,
                background: "linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)",
                border: "2px solid rgba(255, 255, 255, 0.2)",
              }}
            >
              <AccountCircle />
            </Avatar>
          </IconButton>

          <Menu
            id="menu-appbar"
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: "bottom",
              horizontal: "right",
            }}
            keepMounted
            transformOrigin={{
              vertical: "top",
              horizontal: "right",
            }}
            open={Boolean(anchorEl)}
            onClose={handleAccountClose}
          >
            <MenuItem disabled>
              <ListItemIcon>
                <AccountCircle fontSize="small" />
              </ListItemIcon>
              {userName || user?.email || "User"}
            </MenuItem>
            {isSuperAdmin && (
              <>
                <Divider />
                <MenuItem
                  onClick={() => {
                    navigate("/admin/users");
                    handleAccountClose();
                  }}
                >
                  <ListItemIcon>
                    <AdminPanelSettings fontSize="small" />
                  </ListItemIcon>
                  User Management
                </MenuItem>
              </>
            )}
            <Divider />
            <MenuItem onClick={handleLogout}>
              <Logout sx={{ mr: 1 }} />
              Logout
            </MenuItem>
          </Menu>

          {!isSuperAdmin && (
            <Menu
              id="menu-nav"
              anchorEl={navAnchorEl}
              anchorOrigin={{
                vertical: "bottom",
                horizontal: "right",
              }}
              keepMounted
              transformOrigin={{
                vertical: "top",
                horizontal: "right",
              }}
              open={Boolean(navAnchorEl)}
              onClose={handleNavClose}
            >
              {visibleNavItems.map((item) => (
                <MenuItem
                  key={item.path}
                  onClick={() => handleNavigate(item.path)}
                >
                  <ListItemIcon>
                    <item.icon fontSize="small" />
                  </ListItemIcon>
                  {item.label}
                </MenuItem>
              ))}
              {visibleNavItems.length === 0 && (
                <MenuItem onClick={() => handleNavigate(defaultRoute)}>
                  <ListItemIcon>
                    <Dashboard fontSize="small" />
                  </ListItemIcon>
                  Home
                </MenuItem>
              )}
            </Menu>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}
