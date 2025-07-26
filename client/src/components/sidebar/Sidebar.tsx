import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Divider,
  Toolbar,
  Box,
} from "@mui/material";
import {
  Dashboard,
  AccountBalance,
  ExpandLess,
  ExpandMore,
  Person,
  Settings,
} from "@mui/icons-material";
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import type { SidebarItem } from "../../types/common";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  width?: number;
}

const sidebarItems: SidebarItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: Dashboard,
    path: "/dashboard",
  },
  {
    id: "loans",
    label: "Loans",
    icon: AccountBalance,
    path: "/loans",
    children: [
      {
        id: "loan-applications",
        label: "Applications",
        icon: Person,
        path: "/loans/applications",
      },
      {
        id: "loan-management",
        label: "Management",
        icon: Settings,
        path: "/loans/management",
      },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    path: "/settings",
  },
];

export default function Sidebar({ open, onClose, width = 240 }: SidebarProps) {
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const navigate = useNavigate();
  const location = useLocation();

  const handleItemClick = (item: SidebarItem) => {
    if (item.children) {
      toggleExpanded(item.id);
    } else {
      navigate(item.path);
      onClose();
    }
  };

  const toggleExpanded = (itemId: string) => {
    setExpandedItems((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    );
  };

  const isItemActive = (path: string) => location.pathname === path;

  const renderSidebarItem = (item: SidebarItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.id);
    const isActive = isItemActive(item.path);

    return (
      <Box key={item.id}>
        <ListItem disablePadding>
          <ListItemButton
            onClick={() => handleItemClick(item)}
            selected={isActive}
            sx={{
              pl: 2 + level * 2,
              "&.Mui-selected": {
                backgroundColor: "primary.main",
                color: "primary.contrastText",
                "&:hover": {
                  backgroundColor: "primary.dark",
                },
                "& .MuiListItemIcon-root": {
                  color: "primary.contrastText",
                },
              },
            }}
          >
            <ListItemIcon>
              <item.icon />
            </ListItemIcon>
            <ListItemText primary={item.label} />
            {hasChildren && (isExpanded ? <ExpandLess /> : <ExpandMore />)}
          </ListItemButton>
        </ListItem>

        {hasChildren && (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.children!.map((child) =>
                renderSidebarItem(child, level + 1)
              )}
            </List>
          </Collapse>
        )}
      </Box>
    );
  };

  return (
    <Drawer
      variant="temporary"
      open={open}
      onClose={onClose}
      ModalProps={{
        keepMounted: true,
      }}
      sx={{
        width: width,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: width,
          boxSizing: "border-box",
        },
      }}
    >
      <Toolbar />
      <Box sx={{ overflow: "auto" }}>
        <List>{sidebarItems.map((item) => renderSidebarItem(item))}</List>
        <Divider />
      </Box>
    </Drawer>
  );
}
