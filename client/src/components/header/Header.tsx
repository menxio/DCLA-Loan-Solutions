import { useState } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Box,
  ListItemIcon,
  Divider,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  Tooltip,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import AccountCircle from "@mui/icons-material/AccountCircle";
import Logout from "@mui/icons-material/Logout";
import AdminPanelSettings from "@mui/icons-material/AdminPanelSettings";
import MenuIcon from "@mui/icons-material/Menu";
import Close from "@mui/icons-material/Close";
import AccountBalance from "@mui/icons-material/AccountBalance";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { authService } from "@features/auth/api";
import { useAuthStore } from "@features/auth/authStore";
import {
  getNavigationItems,
  headerHeight,
  navigationWidth,
} from "../layout/navigation";

interface HeaderProps {
  title?: string;
}

export default function Header({ title }: HeaderProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up("lg"));
  const items = getNavigationItems(user?.role);
  const currentLabel = items.find(
    (item) => item.path === location.pathname,
  )?.label;
  const userName = [user?.firstName, user?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  const handleLogout = async () => {
    await authService.logout();
    navigate("/login");
    setAnchorEl(null);
  };

  return (
    <>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          ml: { lg: `${navigationWidth}px` },
          width: { xs: "100%", lg: `calc(100% - ${navigationWidth}px)` },
        }}
      >
        <Toolbar
          sx={{
            minHeight: `${headerHeight}px !important`,
            px: { xs: 2, sm: 3, lg: 4 },
            gap: 1,
          }}
        >
          {!desktop && (
            <Tooltip title="Open navigation">
              <IconButton
                aria-label="Open navigation"
                aria-expanded={drawerOpen}
                aria-controls={
                  drawerOpen ? "application-navigation" : undefined
                }
                onClick={() => setDrawerOpen(true)}
                sx={{ width: 44, height: 44, ml: -1 }}
              >
                <MenuIcon />
              </IconButton>
            </Tooltip>
          )}
          <Typography
            component="div"
            sx={{ flexGrow: 1, minWidth: 0, fontSize: 16, fontWeight: 600 }}
          >
            {desktop
              ? (title ?? currentLabel ?? "DCLA Loan Solutions")
              : "DCLA Loan Solutions"}
          </Typography>
          <Tooltip title="Account">
            <IconButton
              aria-label="account of current user"
              aria-controls={anchorEl ? "menu-appbar" : undefined}
              aria-haspopup="menu"
              aria-expanded={Boolean(anchorEl)}
              onClick={(event) => setAnchorEl(event.currentTarget)}
              sx={{ width: 44, height: 44 }}
            >
              <Avatar sx={{ width: 32, height: 32, bgcolor: "primary.main" }}>
                <AccountCircle />
              </Avatar>
            </IconButton>
          </Tooltip>
          <Menu
            id="menu-appbar"
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
            PaperProps={{
              sx: {
                maxWidth: "calc(100vw - 32px)",
                "& .MuiMenuItem-root": {
                  whiteSpace: "normal",
                  overflowWrap: "anywhere",
                },
              },
            }}
          >
            <MenuItem disabled>
              <ListItemIcon>
                <AccountCircle fontSize="small" />
              </ListItemIcon>
              {userName || user?.email || "User"}
            </MenuItem>
            {user?.role === "superadmin" && [
              <Divider key="admin-divider" />,
              <MenuItem
                key="admin"
                onClick={() => {
                  navigate("/admin/users");
                  setAnchorEl(null);
                }}
              >
                <ListItemIcon>
                  <AdminPanelSettings fontSize="small" />
                </ListItemIcon>
                User Management
              </MenuItem>,
            ]}
            <Divider />
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <Logout fontSize="small" />
              </ListItemIcon>
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      <Drawer
        variant={desktop ? "permanent" : "temporary"}
        open={desktop || drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: {
            width: navigationWidth,
            maxWidth: "calc(100vw - 32px)",
            borderRadius: 0,
            boxShadow: "none",
            borderRight: "1px solid",
            borderColor: "divider",
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            minHeight: 88,
            px: 2.5,
            gap: 1.5,
          }}
        >
          <AccountBalance sx={{ color: "primary.main", fontSize: 28 }} />
          <Box sx={{ flexGrow: 1 }}>
            <Typography
              sx={{ fontWeight: 800, fontSize: 20, color: "primary.main" }}
            >
              DCLA
            </Typography>
            <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
              Loan Solutions
            </Typography>
          </Box>
          {!desktop && (
            <IconButton
              aria-label="Close navigation"
              onClick={() => setDrawerOpen(false)}
              sx={{ width: 44, height: 44 }}
            >
              <Close />
            </IconButton>
          )}
        </Box>
        <Box
          component="nav"
          id="application-navigation"
          aria-label="Main navigation"
          sx={{ px: 1.5, py: 1 }}
        >
          <List disablePadding>
            {items.map((item) => (
              <ListItemButton
                key={item.path}
                component={NavLink}
                to={item.path}
                end
                selected={location.pathname === item.path}
                onClick={() => setDrawerOpen(false)}
                sx={{
                  minHeight: 48,
                  borderRadius: "8px",
                  mb: 0.5,
                  borderLeft: "3px solid transparent",
                  px: 1.5,
                  "&.Mui-selected": {
                    bgcolor: "action.selected",
                    borderLeftColor: "primary.main",
                    color: "primary.main",
                    "& .MuiTypography-root": { fontWeight: 700 },
                  },
                  "& .MuiListItemIcon-root": { color: "inherit", minWidth: 36 },
                }}
              >
                <ListItemIcon>
                  <item.icon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{ fontSize: 14 }}
                />
              </ListItemButton>
            ))}
          </List>
        </Box>
      </Drawer>
    </>
  );
}
