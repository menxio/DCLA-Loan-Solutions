import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  TextField,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
} from "@mui/material";
import { CentersAPI } from "./api";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

type Center = {
  id: string;
  name: string;
  collectionDay: string;
  address?: string;
};

export default function CentersPage() {
  const [centers, setCenters] = useState<Center[]>([]);
  const [form, setForm] = useState({
    name: "",
    collectionDay: "",
    address: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchCenters = async () => {
    setCenters(await CentersAPI.getAll());
  };

  useEffect(() => {
    fetchCenters();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await CentersAPI.update(editingId, form);
      setEditingId(null);
    } else {
      await CentersAPI.create(form);
    }
    setForm({ name: "", collectionDay: "", address: "" });
    fetchCenters();
  };

  const handleEdit = (center: Center) => {
    setEditingId(center.id);
    setForm({
      name: center.name,
      collectionDay: center.collectionDay,
      address: center.address || "",
    });
  };

  const handleDelete = async (id: string) => {
    await CentersAPI.remove(id);
    fetchCenters();
  };

  return (
    <Box sx={{ maxWidth: 700, mx: "auto", mt: 4 }}>
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          {editingId ? "Edit Center" : "Add Center"}
        </Typography>
        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", gap: 16, flexWrap: "wrap" }}
        >
          <TextField
            label="Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
          <TextField
            label="Collection Day"
            value={form.collectionDay}
            onChange={(e) =>
              setForm((f) => ({ ...f, collectionDay: e.target.value }))
            }
            required
          />
          <TextField
            label="Address"
            value={form.address}
            onChange={(e) =>
              setForm((f) => ({ ...f, address: e.target.value }))
            }
          />
          <Button type="submit" variant="contained" sx={{ minWidth: 120 }}>
            {editingId ? "Update" : "Create"}
          </Button>
          {editingId && (
            <Button
              variant="outlined"
              color="secondary"
              onClick={() => {
                setEditingId(null);
                setForm({ name: "", collectionDay: "", address: "" });
              }}
            >
              Cancel
            </Button>
          )}
        </form>
      </Paper>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Centers List
        </Typography>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Collection Day</TableCell>
              <TableCell>Address</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {centers.map((center) => (
              <TableRow key={center.id}>
                <TableCell>{center.name}</TableCell>
                <TableCell>{center.collectionDay}</TableCell>
                <TableCell>{center.address}</TableCell>
                <TableCell>
                  <IconButton onClick={() => handleEdit(center)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    onClick={() => handleDelete(center.id)}
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
