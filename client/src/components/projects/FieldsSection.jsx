import React, { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  createField,
  createFieldWorkLog,
  deleteField,
  deleteFieldWorkLog,
  getFields,
  getFieldWorkLogs,
  updateFieldGeometry,
  updateFieldProperties,
} from "../../services/serverCalls";
import { STATUS_CHIP_COLOR, statusLabel } from "../../libs/fieldStatus.js";
import FieldDrawingCanvas from "./FieldDrawingCanvas.jsx";
import FieldMapDrawing from "./FieldMapDrawing.jsx";
import ManageSubFieldsMap from "./ManageSubFieldsMap.jsx";
import ManageSubFieldsPanel from "./ManageSubFieldsPanel.jsx";
import ModalCloseButton from "../common/ModalCloseButton.jsx";
import Spinner, { InlineSpinner } from "../common/Spinner.jsx";

const PREVIEW_WIDTH = 280;
const PREVIEW_HEIGHT = 180;
const PREVIEW_PADDING = 10;

function FieldGrid({ vertices, plantPositions, isPreviewApproximate }) {
  if (!vertices?.length) {
    return null;
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
    <Box>
      <svg width={PREVIEW_WIDTH} height={PREVIEW_HEIGHT}>
        <polygon points={points} fill="rgba(31,77,58,0.12)" stroke="#1F4D3A" strokeWidth={1.5} />
        {(plantPositions || []).map((p, i) => (
          <circle key={i} cx={toX(p.x)} cy={toY(p.y)} r={2.5} fill="#1F4D3A" />
        ))}
      </svg>
      {isPreviewApproximate && (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
          Pattern shown at reduced density for readability — plant count above is exact.
        </Typography>
      )}
    </Box>
  );
}

function FullScreenDialogHeader({ title, onClose }) {
  return (
    <Box
      sx={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        px: 3,
        py: 2,
        borderBottom: "1px solid",
        borderColor: "divider",
      }}
    >
      <ModalCloseButton onClick={onClose} floating={false} />
      <Typography variant="h6" sx={{ pl: 5 }}>
        {title}
      </Typography>
    </Box>
  );
}

function FieldCard({ field, onDelete, actions, onClick, selected }) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = async (e) => {
    e.stopPropagation();
    setIsDeleting(true);
    const success = await onDelete(field.id);
    if (!success) {
      setIsDeleting(false);
    }
  };

  return (
    <Card
      variant="outlined"
      onClick={onClick}
      sx={{
        ...(onClick && { cursor: "pointer" }),
        ...(selected && { borderColor: "primary.main", boxShadow: 2 }),
      }}
    >
      <CardContent>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <Box>
            <Typography variant="subtitle1" fontWeight="bold">
              {field.name}
            </Typography>
            <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mb: 0.5 }}>
              {field.plantSpacing != null && (
                <Chip
                  label={statusLabel(field.status)}
                  size="small"
                  color={STATUS_CHIP_COLOR[field.status] || "default"}
                  variant={field.status && field.status !== "planning" ? "filled" : "outlined"}
                />
              )}
              {field.variety && <Chip label={field.variety} size="small" color="success" />}
              {field.sowingStructure === "staggered" && (
                <Chip label="Staggered" size="small" variant="outlined" />
              )}
              {field.plantSpacing == null && <Chip label="Container" size="small" />}
            </Box>
          </Box>
          <IconButton size="small" onClick={handleDeleteClick} disabled={isDeleting}>
            {isDeleting ? <InlineSpinner size={16} /> : <DeleteIcon color="error" fontSize="small" />}
          </IconButton>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {field.plantSpacing == null
            ? `${field.area.toFixed(0)}m² boundary`
            : field.shapeType === "rectangle"
            ? `${field.landWidth}m × ${field.landLength}m land`
            : `${field.area.toFixed(1)}m² custom plot`}
          {field.plantSpacing != null && ` · ${field.plantSpacing}m × ${field.rowSpacing}m spacing`}
        </Typography>
        {field.plantSpacing != null && (
          <Typography variant="body2" sx={{ mb: 1 }}>
            {field.plantsPerRow && field.numberOfRows
              ? `${field.numberOfRows} rows × ${field.plantsPerRow} plants/row = `
              : ""}
            <strong>{field.totalCapacity} plants</strong>
          </Typography>
        )}
        <FieldGrid
          vertices={field.vertices}
          plantPositions={field.plantPositions}
          isPreviewApproximate={field.isPreviewApproximate}
        />
        {actions}
      </CardContent>
    </Card>
  );
}

function FieldsSection({ userId, projectId }) {
  const [fields, setFields] = useState([]);
  const [isLoadingFields, setIsLoadingFields] = useState(true);

  const [isAddingField, setIsAddingField] = useState(false);
  const [fieldName, setFieldName] = useState("");
  const [fieldVertices, setFieldVertices] = useState(null);
  const [fieldError, setFieldError] = useState("");
  // "map" draws a real-world GPS boundary; "canvas" draws the same
  // container concept locally, with no map at all - both submit through
  // handleCreateField, just with a different payload key.
  const [boundaryMode, setBoundaryMode] = useState("map");
  const [isCreatingField, setIsCreatingField] = useState(false);

  const [managingParentField, setManagingParentField] = useState(null);
  const [selectedFieldId, setSelectedFieldId] = useState(null);

  const toggleFieldSelection = (fieldId) => {
    setSelectedFieldId((prev) => (prev === fieldId ? null : fieldId));
  };

  const loadFields = async () => {
    setIsLoadingFields(true);
    const data = await getFields(userId, projectId);
    if (data) {
      setFields(data);
    }
    setIsLoadingFields(false);
  };

  useEffect(() => {
    loadFields();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, projectId]);

  const closeAddFieldDialog = () => {
    setIsAddingField(false);
    setFieldName("");
    setFieldVertices(null);
    setFieldError("");
    setBoundaryMode("map");
  };

  const handleCreateField = async () => {
    if (!fieldName) {
      setFieldError("Please enter a name");
      return;
    }
    if (!fieldVertices || fieldVertices.length < 3) {
      setFieldError("Draw and close a boundary with at least 3 points");
      return;
    }

    setIsCreatingField(true);
    const created = await createField(userId, projectId, {
      name: fieldName,
      shapeType: "polygon",
      ...(boundaryMode === "map" ? { geoVertices: fieldVertices } : { vertices: fieldVertices }),
    });
    setIsCreatingField(false);
    if (created) {
      setFields([created, ...fields]);
      closeAddFieldDialog();
    } else {
      setFieldError("Failed to create field");
    }
  };

  const handleDeleteField = async (fieldId) => {
    const success = await deleteField(userId, projectId, fieldId);
    if (success) {
      // Deleting a field cascades to its sub-fields server-side.
      setFields(fields.filter((field) => field.id !== fieldId && field.parentFieldId !== fieldId));
    }
    return success;
  };

  const handleCreateSubField = async (payload) => {
    const created = await createField(userId, projectId, payload);
    if (created) {
      setFields((prev) => [created, ...prev]);
    }
    return created;
  };

  const handleUpdateSubFieldGeometry = async (fieldId, geoVertices) => {
    const updated = await updateFieldGeometry(userId, projectId, fieldId, geoVertices);
    if (updated) {
      setFields((prev) => prev.map((f) => (f.id === fieldId ? updated : f)));
    }
    return updated;
  };

  const handleUpdateSubFieldProperties = async (fieldId, properties) => {
    const updated = await updateFieldProperties(userId, projectId, fieldId, properties);
    if (updated) {
      setFields((prev) => prev.map((f) => (f.id === fieldId ? updated : f)));
    }
    return updated;
  };

  const handleGetWorkLogs = (fieldId) => getFieldWorkLogs(userId, projectId, fieldId);
  const handleCreateWorkLog = (fieldId, payload) => createFieldWorkLog(userId, projectId, fieldId, payload);
  const handleDeleteWorkLog = (fieldId, logId) => deleteFieldWorkLog(userId, projectId, fieldId, logId);

  // Every top-level field is a container - a boundary only, with sub-fields
  // (each carrying their own spacing/variety) added afterward via Manage
  // Sub-Fields. standaloneFields is kept only to still display fields
  // created before this model existed (they have their own spacing).
  const containerFields = fields.filter((f) => f.parentFieldId == null && f.plantSpacing == null);
  const standaloneFields = fields.filter((f) => f.parentFieldId == null && f.plantSpacing != null);
  const subFieldsByParent = fields.reduce((acc, f) => {
    if (f.parentFieldId != null) {
      (acc[f.parentFieldId] = acc[f.parentFieldId] || []).push(f);
    }
    return acc;
  }, {});

  const addFieldDialog = (
    <Dialog
      fullScreen
      open={isAddingField}
      onClose={closeAddFieldDialog}
      PaperProps={{ sx: { display: "flex", flexDirection: "column" } }}
    >
      <FullScreenDialogHeader title="Add Field" onClose={closeAddFieldDialog} />
      <Box sx={{ flex: 1, minHeight: 0, display: "flex", overflow: "hidden" }}>
        <Box
          sx={{
            width: 360,
            flexShrink: 0,
            p: 3,
            overflowY: "auto",
            borderRight: "1px solid",
            borderColor: "divider",
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Draw the outer boundary of the field{boundaryMode === "map" ? " on the map" : ""}. You'll be
            able to divide it into smaller sub-fields for planting afterward.
          </Typography>
          <ToggleButtonGroup
            exclusive
            value={boundaryMode}
            onChange={(e, value) => {
              if (!value) return;
              setBoundaryMode(value);
              setFieldVertices(null);
            }}
            size="small"
          >
            <ToggleButton value="map">Position on a map</ToggleButton>
            <ToggleButton value="canvas">Draw without a map</ToggleButton>
          </ToggleButtonGroup>
          <TextField
            label="Field name"
            fullWidth
            value={fieldName}
            onChange={(e) => setFieldName(e.target.value)}
          />
          {fieldError && (
            <Typography variant="body2" color="error">
              {fieldError}
            </Typography>
          )}
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button onClick={closeAddFieldDialog}>Cancel</Button>
            <Button variant="contained" onClick={handleCreateField} disabled={isCreatingField}>
              {isCreatingField ? <InlineSpinner size={20} /> : "Create"}
            </Button>
          </Box>
        </Box>
        <Box sx={{ flex: 1, minHeight: 0, display: "flex", p: 3 }}>
          {boundaryMode === "map" ? (
            <FieldMapDrawing onFinish={setFieldVertices} />
          ) : (
            <FieldDrawingCanvas onFinish={setFieldVertices} />
          )}
        </Box>
      </Box>
    </Dialog>
  );

  const manageSubFieldsDialog = managingParentField && (
    <Dialog
      fullScreen
      open={Boolean(managingParentField)}
      onClose={() => setManagingParentField(null)}
      PaperProps={{ sx: { display: "flex", flexDirection: "column" } }}
    >
      <FullScreenDialogHeader
        title={`Manage Sub-Fields of ${managingParentField.name}`}
        onClose={() => setManagingParentField(null)}
      />
      {managingParentField.geoVertices != null ? (
        <ManageSubFieldsMap
          parentField={managingParentField}
          subFields={subFieldsByParent[managingParentField.id] || []}
          onCreate={handleCreateSubField}
          onUpdateGeometry={handleUpdateSubFieldGeometry}
          onUpdateProperties={handleUpdateSubFieldProperties}
          onDelete={handleDeleteField}
          onGetWorkLogs={handleGetWorkLogs}
          onCreateWorkLog={handleCreateWorkLog}
          onDeleteWorkLog={handleDeleteWorkLog}
          onClose={() => setManagingParentField(null)}
        />
      ) : (
        <ManageSubFieldsPanel
          parentField={managingParentField}
          subFields={subFieldsByParent[managingParentField.id] || []}
          onCreate={handleCreateSubField}
          onUpdateGeometry={handleUpdateSubFieldGeometry}
          onUpdateProperties={handleUpdateSubFieldProperties}
          onDelete={handleDeleteField}
          onGetWorkLogs={handleGetWorkLogs}
          onCreateWorkLog={handleCreateWorkLog}
          onDeleteWorkLog={handleDeleteWorkLog}
          onClose={() => setManagingParentField(null)}
        />
      )}
    </Dialog>
  );

  return (
    <Box sx={{ mt: 4 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
        <Typography variant="h5">Fields</Typography>
        <Button variant="contained" onClick={() => setIsAddingField(true)}>
          Add Field
        </Button>
      </Box>

      {isLoadingFields ? (
        <Spinner />
      ) : fields.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No fields yet. Add one to plan a planting layout.
        </Typography>
      ) : (
        <Grid container spacing={2}>
          {containerFields.map((field) => (
            <Grid item xs={12} key={field.id}>
              <FieldCard
                field={field}
                onDelete={handleDeleteField}
                onClick={() => setManagingParentField(field)}
                actions={
                  <Button
                    size="small"
                    sx={{ mt: 1 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setManagingParentField(field);
                    }}
                  >
                    Manage Sub-Fields
                  </Button>
                }
              />
              {(subFieldsByParent[field.id] || []).length > 0 && (
                <Box sx={{ mt: 1, ml: { xs: 0, sm: 4 }, pl: 2, borderLeft: "2px solid", borderColor: "divider" }}>
                  <Grid container spacing={2}>
                    {subFieldsByParent[field.id].map((sub) => (
                      <Grid item xs={12} sm={6} md={4} key={sub.id}>
                        <FieldCard
                          field={sub}
                          onDelete={handleDeleteField}
                          onClick={() => toggleFieldSelection(sub.id)}
                          selected={sub.id === selectedFieldId}
                        />
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}
            </Grid>
          ))}
          {standaloneFields.map((field) => (
            <Grid item xs={12} sm={6} md={4} key={field.id}>
              <FieldCard
                field={field}
                onDelete={handleDeleteField}
                onClick={() => toggleFieldSelection(field.id)}
                selected={field.id === selectedFieldId}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {addFieldDialog}
      {manageSubFieldsDialog}
    </Box>
  );
}

export default FieldsSection;
