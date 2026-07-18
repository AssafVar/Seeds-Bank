import React, { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControl from "@mui/material/FormControl";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import DeleteIcon from "@mui/icons-material/Delete";
import { createField, deleteField, getFields } from "../../services/serverCalls";
import vegetableVarieties from "../../libs/vegetableVarieties";

const MAX_GRID_CELLS = 400;
const emptyForm = { name: "", landWidth: "", landLength: "", plantSpacing: "", rowSpacing: "" };

function FieldGrid({ plantsPerRow, numberOfRows }) {
  const totalCells = plantsPerRow * numberOfRows;
  if (totalCells > MAX_GRID_CELLS) {
    return (
      <Typography variant="body2" color="text.secondary">
        Layout too large to preview — showing capacity summary only.
      </Typography>
    );
  }
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: `repeat(${plantsPerRow}, 1fr)`,
        gap: "3px",
        maxWidth: 320,
      }}
    >
      {Array.from({ length: totalCells }).map((_, i) => (
        <Box
          key={i}
          sx={{
            aspectRatio: "1 / 1",
            borderRadius: "50%",
            bgcolor: "success.main",
          }}
        />
      ))}
    </Box>
  );
}

function FieldsSection({ userId, projectId }) {
  const [fields, setFields] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [variety, setVariety] = useState("Custom");
  const [errorMessage, setErrorMessage] = useState("");

  const loadFields = async () => {
    const data = await getFields(userId, projectId);
    if (data) {
      setFields(data);
    }
  };

  useEffect(() => {
    loadFields();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, projectId]);

  const handleVarietyChange = (name) => {
    setVariety(name);
    const match = vegetableVarieties.find((v) => v.name === name);
    if (match) {
      setForm((prev) => ({
        ...prev,
        plantSpacing: String(match.plantSpacing),
        rowSpacing: String(match.rowSpacing),
      }));
    }
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setForm(emptyForm);
    setVariety("Custom");
    setErrorMessage("");
  };

  const handleCreateField = async () => {
    const { name, landWidth, landLength, plantSpacing, rowSpacing } = form;
    const values = [landWidth, landLength, plantSpacing, rowSpacing].map(Number);
    if (!name || values.some((v) => !(v > 0))) {
      setErrorMessage("Please fill in a name and positive values for every field");
      return;
    }
    const created = await createField(userId, projectId, {
      name,
      landWidth: values[0],
      landLength: values[1],
      plantSpacing: values[2],
      rowSpacing: values[3],
    });
    if (created) {
      setFields([created, ...fields]);
      closeDialog();
    } else {
      setErrorMessage("Failed to create field");
    }
  };

  const handleDeleteField = async (fieldId) => {
    const success = await deleteField(userId, projectId, fieldId);
    if (success) {
      setFields(fields.filter((field) => field.id !== fieldId));
    }
  };

  return (
    <Box sx={{ mt: 4 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
        <Typography variant="h5">Fields</Typography>
        <Button variant="contained" onClick={() => setIsDialogOpen(true)}>
          Add Field
        </Button>
      </Box>

      {fields.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No fields yet. Add one to plan a planting layout.
        </Typography>
      ) : (
        <Grid container spacing={2}>
          {fields.map((field) => (
            <Grid item xs={12} sm={6} md={4} key={field.id}>
              <Card variant="outlined">
                <CardContent>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {field.name}
                    </Typography>
                    <IconButton size="small" onClick={() => handleDeleteField(field.id)}>
                      <DeleteIcon color="error" fontSize="small" />
                    </IconButton>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {field.landWidth}m × {field.landLength}m land, {field.plantSpacing}m ×{" "}
                    {field.rowSpacing}m spacing
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    {field.numberOfRows} rows × {field.plantsPerRow} plants/row ={" "}
                    <strong>{field.totalCapacity} plants</strong>
                  </Typography>
                  <FieldGrid plantsPerRow={field.plantsPerRow} numberOfRows={field.numberOfRows} />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog open={isDialogOpen} onClose={closeDialog} fullWidth maxWidth="xs">
        <DialogTitle>Add Field</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <TextField
              label="Field name"
              fullWidth
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel id="variety-label">Vegetable variety</InputLabel>
              <Select
                labelId="variety-label"
                label="Vegetable variety"
                value={variety}
                onChange={(e) => handleVarietyChange(e.target.value)}
              >
                <MenuItem value="Custom">Custom</MenuItem>
                {vegetableVarieties.map((v) => (
                  <MenuItem key={v.name} value={v.name}>
                    {v.name} ({v.plantSpacing}m × {v.rowSpacing}m)
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Land width (m)" type="number" fullWidth
              value={form.landWidth}
              onChange={(e) => setForm({ ...form, landWidth: e.target.value })}
            />
            <TextField
              label="Land length (m)" type="number" fullWidth
              value={form.landLength}
              onChange={(e) => setForm({ ...form, landLength: e.target.value })}
            />
            <TextField
              label="Plant spacing (m)" type="number" fullWidth
              value={form.plantSpacing}
              onChange={(e) => setForm({ ...form, plantSpacing: e.target.value })}
            />
            <TextField
              label="Row spacing (m)" type="number" fullWidth
              value={form.rowSpacing}
              onChange={(e) => setForm({ ...form, rowSpacing: e.target.value })}
            />
            {errorMessage && (
              <Typography variant="body2" color="error">
                {errorMessage}
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateField}>
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default FieldsSection;
