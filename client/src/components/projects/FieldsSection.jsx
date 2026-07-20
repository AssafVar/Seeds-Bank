import React, { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
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
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import DeleteIcon from "@mui/icons-material/Delete";
import { createField, deleteField, getFields } from "../../services/serverCalls";
import vegetableVarieties from "../../libs/vegetableVarieties";
import FieldDrawingCanvas from "./FieldDrawingCanvas.jsx";

const emptyForm = { name: "", landWidth: "", landLength: "", plantSpacing: "", rowSpacing: "" };
const PREVIEW_WIDTH = 280;
const PREVIEW_HEIGHT = 180;
const PREVIEW_PADDING = 10;

function FieldGrid({ vertices, plantPositions, totalCapacity }) {
  if (!plantPositions || !vertices?.length) {
    return (
      <Typography variant="body2" color="text.secondary">
        Layout too large to preview — {totalCapacity} plants total.
      </Typography>
    );
  }

  const xs = vertices.map((v) => v.x);
  const ys = vertices.map((v) => v.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const shapeWidth = Math.max(...xs) - minX || 1;
  const shapeHeight = Math.max(...ys) - minY || 1;
  const scale = Math.min(
    (PREVIEW_WIDTH - PREVIEW_PADDING * 2) / shapeWidth,
    (PREVIEW_HEIGHT - PREVIEW_PADDING * 2) / shapeHeight
  );
  const toX = (x) => (x - minX) * scale + PREVIEW_PADDING;
  const toY = (y) => (y - minY) * scale + PREVIEW_PADDING;
  const points = vertices.map((v) => `${toX(v.x)},${toY(v.y)}`).join(" ");

  return (
    <svg width={PREVIEW_WIDTH} height={PREVIEW_HEIGHT}>
      <polygon points={points} fill="rgba(31,77,58,0.12)" stroke="#1F4D3A" strokeWidth={1.5} />
      {plantPositions.map((p, i) => (
        <circle key={i} cx={toX(p.x)} cy={toY(p.y)} r={2.5} fill="#1F4D3A" />
      ))}
    </svg>
  );
}

function FieldsSection({ userId, projectId }) {
  const [fields, setFields] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [shapeMode, setShapeMode] = useState("rectangle");
  const [form, setForm] = useState(emptyForm);
  const [variety, setVariety] = useState("Custom");
  const [sowingStructure, setSowingStructure] = useState("grid");
  const [polygonVertices, setPolygonVertices] = useState(null);
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
    setSowingStructure("grid");
    setShapeMode("rectangle");
    setPolygonVertices(null);
    setErrorMessage("");
  };

  const handleCreateField = async () => {
    const { name, plantSpacing, rowSpacing } = form;
    const spacingValues = [plantSpacing, rowSpacing].map(Number);
    if (!name || spacingValues.some((v) => !(v > 0))) {
      setErrorMessage("Please fill in a name and positive spacing values");
      return;
    }

    let payload;
    if (shapeMode === "rectangle") {
      const dimensionValues = [form.landWidth, form.landLength].map(Number);
      if (dimensionValues.some((v) => !(v > 0))) {
        setErrorMessage("Please fill in positive land width and length");
        return;
      }
      payload = {
        name,
        variety: variety === "Custom" ? null : variety,
        shapeType: "rectangle",
        landWidth: dimensionValues[0],
        landLength: dimensionValues[1],
        sowingStructure,
        plantSpacing: spacingValues[0],
        rowSpacing: spacingValues[1],
      };
    } else {
      if (!polygonVertices || polygonVertices.length < 3) {
        setErrorMessage("Draw and close a shape with at least 3 points");
        return;
      }
      payload = {
        name,
        variety: variety === "Custom" ? null : variety,
        shapeType: "polygon",
        vertices: polygonVertices,
        sowingStructure,
        plantSpacing: spacingValues[0],
        rowSpacing: spacingValues[1],
      };
    }

    const created = await createField(userId, projectId, payload);
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
                    <Box>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {field.name}
                      </Typography>
                      <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mb: 0.5 }}>
                        {field.variety && (
                          <Chip label={field.variety} size="small" color="success" />
                        )}
                        {field.sowingStructure === "staggered" && (
                          <Chip label="Staggered" size="small" variant="outlined" />
                        )}
                      </Box>
                    </Box>
                    <IconButton size="small" onClick={() => handleDeleteField(field.id)}>
                      <DeleteIcon color="error" fontSize="small" />
                    </IconButton>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {field.shapeType === "rectangle"
                      ? `${field.landWidth}m × ${field.landLength}m land`
                      : `${field.area.toFixed(1)}m² custom plot`}
                    {" · "}
                    {field.plantSpacing}m × {field.rowSpacing}m spacing
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    {field.plantsPerRow && field.numberOfRows
                      ? `${field.numberOfRows} rows × ${field.plantsPerRow} plants/row = `
                      : ""}
                    <strong>{field.totalCapacity} plants</strong>
                  </Typography>
                  <FieldGrid
                    vertices={field.vertices}
                    plantPositions={field.plantPositions}
                    totalCapacity={field.totalCapacity}
                  />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog open={isDialogOpen} onClose={closeDialog} fullWidth maxWidth={shapeMode === "polygon" ? "sm" : "xs"}>
        <DialogTitle>Add Field</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <ToggleButtonGroup
              exclusive
              value={shapeMode}
              onChange={(e, value) => value && setShapeMode(value)}
              size="small"
            >
              <ToggleButton value="rectangle">Rectangle</ToggleButton>
              <ToggleButton value="polygon">Custom shape</ToggleButton>
            </ToggleButtonGroup>
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

            <Box>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                Sowing structure
              </Typography>
              <ToggleButtonGroup
                exclusive
                value={sowingStructure}
                onChange={(e, value) => value && setSowingStructure(value)}
                size="small"
              >
                <ToggleButton value="grid">Grid (aligned rows)</ToggleButton>
                <ToggleButton value="staggered">Staggered (denser)</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {shapeMode === "rectangle" ? (
              <>
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
              </>
            ) : (
              <FieldDrawingCanvas onFinish={setPolygonVertices} />
            )}

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
