import { useState } from "react";
import {
  Paper,
  Typography,
  Box,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Avatar,
  Tooltip,
  IconButton,
  Grid,
  Chip,
  Card,
  CardContent,
  CardActions,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import {
  Edit,
  Delete,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon,
  Person as PersonIcon,
  MoreVert as MoreVertIcon,
  Business as BusinessIcon,
  AccountBalance as AccountBalanceIcon,
} from "@mui/icons-material";
import type { MemberCardsProps, Member } from "../types";

const getInitials = (firstName: string, lastName: string) =>
  `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();

const formatDate = (date: Date) =>
  new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

export default function MemberCards({
  members,
  onEdit,
  onDelete,
  onViewLoan,
  loading = false,
}: MemberCardsProps) {
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    member: Member | null;
  }>({
    open: false,
    member: null,
  });
  const [deleting, setDeleting] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<{
    element: HTMLElement | null;
    member: Member | null;
  }>({
    element: null,
    member: null,
  });

  const handleDeleteDialogOpen = (member: Member) => {
    setDeleteDialog({ open: true, member });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.member) return;
    try {
      setDeleting(true);
      await onDelete(deleteDialog.member.id);
      setDeleteDialog({ open: false, member: null });
    } catch (err) {
      console.error("Error deleting member:", err);
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({ open: false, member: null });
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, member: Member) => {
    setMenuAnchor({ element: event.currentTarget, member });
  };

  const handleMenuClose = () => {
    setMenuAnchor({ element: null, member: null });
  };

  const handleEditClick = (member: Member) => {
    handleMenuClose();
    onEdit(member);
  };

  const handleDeleteClick = (member: Member) => {
    handleMenuClose();
    setDeleteDialog({ open: true, member });
  };

  if (loading && members.length === 0) {
    return (
      <Paper
        sx={{
          p: 4,
          background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
          border: "1px solid #e2e8f0",
          textAlign: "center",
        }}
      >
        <CircularProgress size={40} />
        <Typography variant="body1" sx={{ mt: 2, color: "text.secondary" }}>
          Loading members...
        </Typography>
      </Paper>
    );
  }

  if (members.length === 0) {
    return (
      <Paper
        sx={{
          p: 4,
          background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
          border: "1px solid #e2e8f0",
          textAlign: "center",
        }}
      >
        <PersonIcon sx={{ fontSize: 64, color: "text.secondary", mb: 2 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No Members Found
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Add your first member using the form above.
        </Typography>
      </Paper>
    );
  }

  return (
    <>
      <Grid container spacing={3}>
        {members.map((member) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={member.id}>
                         <Card
               sx={{
                 height: "100%",
                 display: "flex",
                 flexDirection: "column",
                 background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
                 border: "1px solid #e2e8f0",
                 transition: "all 0.3s ease",
                 position: "relative",
                 "&:hover": {
                   transform: "translateY(-4px)",
                   boxShadow: "0 8px 25px rgba(0, 0, 0, 0.1)",
                   borderColor: "#3b82f6",
                 },
               }}
             >
               {/* Menu Button */}
               <IconButton
                 onClick={(e) => handleMenuOpen(e, member)}
                 sx={{
                   position: "absolute",
                   top: 8,
                   right: 8,
                   zIndex: 1,
                   color: "#64748b",
                   "&:hover": {
                     backgroundColor: "rgba(0, 0, 0, 0.04)",
                   },
                 }}
                 size="small"
               >
                 <MoreVertIcon fontSize="small" />
               </IconButton>

               <CardContent sx={{ flexGrow: 1, p: 3 }}>
                {/* Header with Avatar and Name */}
                <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
                  <Avatar
                    sx={{
                      width: 56,
                      height: 56,
                      fontWeight: 600,
                      fontSize: "1.2rem",
                      background: "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)",
                      mr: 2,
                    }}
                  >
                    {getInitials(member.firstName, member.lastName)}
                  </Avatar>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 600,
                        color: "#1e293b",
                        lineHeight: 1.2,
                      }}
                    >
                      {member.firstName} {member.lastName}
                    </Typography>
                    {member.middleName && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ fontStyle: "italic" }}
                      >
                        {member.middleName}
                      </Typography>
                    )}
                  </Box>
                </Box>

                {/* Contact Information */}
                <Box>
                  <Box sx={{ display: "flex", alignItems: "center", mb: 1.5 }}>
                    <PhoneIcon
                      sx={{
                        fontSize: 18,
                        color: "#64748b",
                        mr: 1.5,
                        minWidth: 18,
                      }}
                    />
                    <Typography
                      variant="body2"
                      sx={{
                        color: "#374151",
                        fontWeight: 500,
                        wordBreak: "break-word",
                      }}
                    >
                      {member.contactNumber}
                    </Typography>
                  </Box>

                  <Box sx={{ display: "flex", alignItems: "flex-start", mb: 1.5 }}>
                    <LocationIcon
                      sx={{
                        fontSize: 18,
                        color: "#64748b",
                        mr: 1.5,
                        mt: 0.1,
                        minWidth: 18,
                      }}
                    />
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        wordBreak: "break-word",
                        lineHeight: 1.4,
                      }}
                    >
                      {member.address}
                    </Typography>
                  </Box>

                                    <Box sx={{ display: "flex", alignItems: "center", mb: 1.5 }}>
                    <CalendarIcon
                      sx={{
                        fontSize: 18,
                        color: "#64748b",
                        mr: 1.5,
                        minWidth: 18,
                      }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      {member.birthDate ? formatDate(member.birthDate) : "N/A"}
                    </Typography>
                  </Box>

                  {member.center && (
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <BusinessIcon
                        sx={{
                          fontSize: 18,
                          color: "#64748b",
                          mr: 1.5,
                          minWidth: 18,
                        }}
                      />
                      <Typography variant="body2" color="text.secondary">
                        {member.center.name}
                      </Typography>
                    </Box>
                  )}
                </Box>
               </CardContent>

               {/* View Loan Button */}
               <Box sx={{ px: 2, pb: 2 }}>
                 <Button
                   variant="outlined"
                   fullWidth
                   startIcon={<AccountBalanceIcon />}
                   onClick={() => onViewLoan?.(member)}
                   sx={{
                     borderColor: "#3b82f6",
                     color: "#3b82f6",
                     "&:hover": {
                       borderColor: "#2563eb",
                       backgroundColor: "#dbeafe",
                     },
                     fontWeight: 500,
                   }}
                 >
                   View Loan
                 </Button>
               </Box>
             </Card>
          </Grid>
                 ))}
       </Grid>

       {/* Member Actions Menu */}
       <Menu
         anchorEl={menuAnchor.element}
         open={Boolean(menuAnchor.element)}
         onClose={handleMenuClose}
         anchorOrigin={{
           vertical: "top",
           horizontal: "right",
         }}
         transformOrigin={{
           vertical: "top",
           horizontal: "right",
         }}
         PaperProps={{
           sx: {
             mt: 1,
             minWidth: 120,
             boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
             border: "1px solid #e2e8f0",
           },
         }}
       >
         <MenuItem
           onClick={() => handleEditClick(menuAnchor.member!)}
           sx={{
             py: 1.5,
             "&:hover": {
               backgroundColor: "#dbeafe",
             },
           }}
         >
           <ListItemIcon>
             <Edit fontSize="small" sx={{ color: "#3b82f6" }} />
           </ListItemIcon>
           <ListItemText
             primary="Edit"
             primaryTypographyProps={{
               sx: { fontWeight: 500, color: "#1e293b" },
             }}
           />
         </MenuItem>
         <MenuItem
           onClick={() => handleDeleteClick(menuAnchor.member!)}
           sx={{
             py: 1.5,
             "&:hover": {
               backgroundColor: "#fee2e2",
             },
           }}
         >
           <ListItemIcon>
             <Delete fontSize="small" sx={{ color: "#ef4444" }} />
           </ListItemIcon>
           <ListItemText
             primary="Delete"
             primaryTypographyProps={{
               sx: { fontWeight: 500, color: "#1e293b" },
             }}
           />
         </MenuItem>
       </Menu>

       {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={handleDeleteCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 600, color: "#1e293b" }}>
          Delete Member
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete "{deleteDialog.member?.firstName} {deleteDialog.member?.lastName}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 1 }}>
          <Button onClick={handleDeleteCancel} disabled={deleting} sx={{ color: "#64748b" }}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            variant="contained"
            color="error"
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={16} /> : <Delete />}
          >
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
} 