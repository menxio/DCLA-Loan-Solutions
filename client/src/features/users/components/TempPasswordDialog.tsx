import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  TextField,
  IconButton,
  Box,
} from "@mui/material";
import { ContentCopy, Close } from "@mui/icons-material";
import { useState } from "react";

interface TempPasswordDialogProps {
  open: boolean;
  title: string;
  password: string;
  onClose: () => void;
}

export default function TempPasswordDialog({
  open,
  title,
  password,
  onClose,
}: TempPasswordDialogProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("Failed to copy password:", err);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
        },
      }}
    >
      <DialogTitle
        sx={{
          fontWeight: 600,
          color: "#1e293b",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
          pb: 1,
        }}
      >
        {title}
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="#64748b" mb={2}>
          This password is shown only once. Please copy it now.
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <TextField
            fullWidth
            value={password}
            InputProps={{ readOnly: true }}
          />
          <IconButton
            onClick={handleCopy}
            sx={{
              border: "1px solid #e2e8f0",
              borderRadius: 2,
              height: 40,
              width: 40,
            }}
          >
            <ContentCopy fontSize="small" />
          </IconButton>
        </Box>
        {copied && (
          <Typography variant="caption" color="#22c55e" mt={1}>
            Copied to clipboard.
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 3 }}>
        <Button
          variant="contained"
          onClick={onClose}
          sx={{
            background: "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)",
            "&:hover": {
              background: "linear-gradient(135deg, #1e40af 0%, #2563eb 100%)",
            },
          }}
        >
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
}
