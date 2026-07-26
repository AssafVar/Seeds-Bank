import React, { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Collapse from "@mui/material/Collapse";
import Dialog from "@mui/material/Dialog";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Pagination from "@mui/material/Pagination";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  createField,
  createFieldWorkLog,
  deleteField,
  deleteFieldWorkLog,
  getFields,
  getFieldWorkLogs,
  getVegetableVarieties,
  renameField,
  updateFieldGeometry,
  updateFieldProperties,
} from "../../services/serverCalls";
import { STATUS_CHIP_COLOR, statusLabel } from "../../libs/fieldStatus.js";
import FieldDrawingCanvas from "./FieldDrawingCanvas.jsx";
import FieldMapDrawing from "./FieldMapDrawing.jsx";
import FieldTimeline from "./FieldTimeline.jsx";
import ManageSubFieldsMap from "./ManageSubFieldsMap.jsx";
import ManageSubFieldsPanel from "./ManageSubFieldsPanel.jsx";
import ModalCloseButton from "../common/ModalCloseButton.jsx";
import { InlineSpinner } from "../common/Spinner.jsx";

const PAGE_SIZE = 12;

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

// Read-only view of a field's own lifecycle/planting data, shared by a
// selected sub-field row and a standalone (legacy, non-container) top-level
// field - both carry the same PlantSpacing-bearing shape.
function FieldDetail({ field, varieties }) {
  return (
    <Box sx={{ bgcolor: "action.hover", borderRadius: 1 }}>
      <FieldTimeline
        status={field.status}
        sowingDate={field.sowingDate}
        harvestDate={field.harvestDate}
        variety={field.variety}
        areaM2={field.area}
        totalCapacity={field.totalCapacity}
        varieties={varieties}
      />
      {field.notes && (
        <Box sx={{ px: 3, pb: 3, mt: -2 }}>
          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
            Notes
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-wrap" }}>
            {field.notes}
          </Typography>
        </Box>
      )}
    </Box>
  );
}

function SubFieldListItem({ field, isSelected, onSelect }) {
  return (
    <ListItemButton selected={isSelected} onClick={onSelect} sx={{ borderRadius: 1 }}>
      <ListItemText
        primary={
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            {field.name}
            <Chip
              label={statusLabel(field.status)}
              size="small"
              color={STATUS_CHIP_COLOR[field.status] || "default"}
              variant={field.status && field.status !== "planning" ? "filled" : "outlined"}
            />
          </Box>
        }
        secondary={`${field.variety || "Custom"} · ${field.totalCapacity} plants`}
      />
    </ListItemButton>
  );
}

function TopLevelFieldCard({
  field,
  subFields,
  isExpanded,
  onToggleExpand,
  selectedSubFieldId,
  onSelectSubField,
  onDelete,
  onManage,
  isDeleting,
  varieties,
  isRenaming,
  renameValue,
  onStartRename,
  onRenameChange,
  onCommitRename,
  onCancelRename,
}) {
  const isContainer = field.plantSpacing == null;
  const selectedSubField = subFields.find((f) => f.id === selectedSubFieldId);

  // Containers carry no planting data of their own - this is the only
  // summary of their sub-fields' progress visible without expanding.
  const subFieldStatusCounts = isContainer
    ? subFields.reduce((acc, f) => {
        const status = f.status || "planning";
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {})
    : {};
  const subFieldTotalCapacity = isContainer ? subFields.reduce((sum, f) => sum + (f.totalCapacity || 0), 0) : 0;

  return (
    <Card variant="outlined">
      <Box
        sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", p: 2, cursor: "pointer" }}
        onClick={onToggleExpand}
      >
        <Box sx={{ minWidth: 0, flex: 1 }}>
          {isRenaming ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }} onClick={(e) => e.stopPropagation()}>
              <TextField
                size="small"
                autoFocus
                value={renameValue}
                onChange={(e) => onRenameChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onCommitRename();
                  if (e.key === "Escape") onCancelRename();
                }}
                onBlur={onCommitRename}
              />
            </Box>
          ) : (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
              <Typography variant="subtitle1" fontWeight="bold">
                {field.name}
              </Typography>
              <IconButton
                size="small"
                aria-label={`Rename ${field.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onStartRename();
                }}
              >
                <EditIcon fontSize="inherit" />
              </IconButton>
            </Box>
          )}
          <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mt: 0.5, mb: 0.5 }}>
            {isContainer ? (
              <Chip label="Container" size="small" />
            ) : (
              <Chip
                label={statusLabel(field.status)}
                size="small"
                color={STATUS_CHIP_COLOR[field.status] || "default"}
                variant={field.status && field.status !== "planning" ? "filled" : "outlined"}
              />
            )}
            {field.variety && <Chip label={field.variety} size="small" color="success" />}
          </Box>
          <Typography variant="body2" color="text.secondary">
            {isContainer
              ? `${field.area.toFixed(0)}m² boundary · ${subFields.length} sub-field${subFields.length === 1 ? "" : "s"}`
              : `${field.area.toFixed(1)}m² · ${field.totalCapacity} plants`}
          </Typography>
          {isContainer && subFields.length > 0 && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap", mt: 0.5 }}>
              <Typography variant="body2" color="text.secondary">
                {subFieldTotalCapacity} plants total
              </Typography>
              {Object.entries(subFieldStatusCounts).map(([status, count]) => (
                <Chip
                  key={status}
                  label={`${count} ${statusLabel(status).toLowerCase()}`}
                  size="small"
                  color={STATUS_CHIP_COLOR[status] || "default"}
                  variant="outlined"
                />
              ))}
            </Box>
          )}
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
          <IconButton size="small" aria-label={`Delete ${field.name}`} onClick={() => onDelete(field.id)} disabled={isDeleting}>
            {isDeleting ? <InlineSpinner size={16} /> : <DeleteIcon color="error" fontSize="small" />}
          </IconButton>
          <IconButton
            size="small"
            aria-label={isExpanded ? `Collapse ${field.name}` : `Expand ${field.name}`}
            onClick={onToggleExpand}
            sx={{ transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
          >
            <ExpandMoreIcon />
          </IconButton>
        </Box>
      </Box>

      <Collapse in={isExpanded} unmountOnExit>
        <Divider />
        <Box sx={{ p: 2 }}>
          {isContainer ? (
            <>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                <Typography variant="subtitle2">Sub-fields</Typography>
                <Button size="small" onClick={onManage}>
                  Manage Sub-Fields
                </Button>
              </Box>
              {subFields.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No sub-fields yet. Use "Manage Sub-Fields" to divide this boundary for planting.
                </Typography>
              ) : (
                <List dense disablePadding>
                  {subFields.map((sub) => (
                    <SubFieldListItem
                      key={sub.id}
                      field={sub}
                      isSelected={sub.id === selectedSubFieldId}
                      onSelect={() => onSelectSubField(sub.id === selectedSubFieldId ? null : sub.id)}
                    />
                  ))}
                </List>
              )}
              <Collapse in={Boolean(selectedSubField)} unmountOnExit>
                {selectedSubField && (
                  <Box sx={{ mt: 1 }}>
                    <FieldDetail field={selectedSubField} varieties={varieties} />
                    <Button size="small" sx={{ m: 1 }} onClick={onManage}>
                      Edit
                    </Button>
                  </Box>
                )}
              </Collapse>
            </>
          ) : (
            <FieldDetail field={field} varieties={varieties} />
          )}
        </Box>
      </Collapse>
    </Card>
  );
}

function FieldsListSkeleton() {
  return (
    <Stack spacing={2}>
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} variant="rounded" height={92} />
      ))}
    </Stack>
  );
}

function FieldsList({ userId, projectId }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  const [fields, setFields] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingFields, setIsLoadingFields] = useState(true);
  const [deletingFieldId, setDeletingFieldId] = useState(null);
  const [varieties, setVarieties] = useState([]);

  const [expandedId, setExpandedId] = useState(null);
  const [selectedSubFieldId, setSelectedSubFieldId] = useState(null);

  const [renamingFieldId, setRenamingFieldId] = useState(null);
  const [renameValue, setRenameValue] = useState("");

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

  const goToPage = useCallback(
    (targetPage) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("page", String(targetPage));
        return next;
      });
    },
    [setSearchParams]
  );

  const loadFields = useCallback(async () => {
    setIsLoadingFields(true);
    const data = await getFields(userId, projectId, page, PAGE_SIZE);
    if (data) {
      setFields(data.items || []);
      setTotalPages(Math.max(1, data.totalPages || 1));
    }
    setIsLoadingFields(false);
  }, [userId, projectId, page]);

  useEffect(() => {
    loadFields();
  }, [loadFields]);

  useEffect(() => {
    setExpandedId(null);
    setSelectedSubFieldId(null);
    setRenamingFieldId(null);
  }, [page]);

  useEffect(() => {
    getVegetableVarieties().then((data) => data && setVarieties(data));
  }, []);

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
      closeAddFieldDialog();
      // New fields sort first (CreatedAt desc) - jump to page 1 so it's
      // immediately visible instead of landing wherever the current page
      // happens to be.
      if (page !== 1) {
        goToPage(1);
      } else {
        await loadFields();
      }
    } else {
      setFieldError("Failed to create field");
    }
  };

  const handleDeleteField = async (fieldId) => {
    const target = fields.find((f) => f.id === fieldId);
    const isTopLevel = target?.parentFieldId == null;

    setDeletingFieldId(fieldId);
    const success = await deleteField(userId, projectId, fieldId);
    setDeletingFieldId(null);

    if (!success) {
      return false;
    }

    if (isTopLevel) {
      if (expandedId === fieldId) setExpandedId(null);
      const remainingTopLevel = fields.filter((f) => f.parentFieldId == null && f.id !== fieldId).length;
      if (remainingTopLevel === 0 && page > 1) {
        goToPage(page - 1);
      } else {
        await loadFields();
      }
    } else {
      // Deleting a sub-field cascades server-side but never changes the
      // top-level page/total count, so a local patch is enough.
      setFields((prev) => prev.filter((f) => f.id !== fieldId));
      if (selectedSubFieldId === fieldId) setSelectedSubFieldId(null);
    }
    return true;
  };

  const startRenameField = (field) => {
    setRenamingFieldId(field.id);
    setRenameValue(field.name);
  };

  const cancelRenameField = () => {
    setRenamingFieldId(null);
    setRenameValue("");
  };

  const commitRenameField = async () => {
    const fieldId = renamingFieldId;
    const target = fields.find((f) => f.id === fieldId);
    const trimmed = renameValue.trim();
    if (!fieldId || !target || !trimmed || trimmed === target.name) {
      cancelRenameField();
      return;
    }

    const updated = await renameField(userId, projectId, fieldId, trimmed);
    if (updated) {
      setFields((prev) => prev.map((f) => (f.id === fieldId ? updated : f)));
    }
    cancelRenameField();
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
      // This same handler also reshapes a Small Field's own outer boundary
      // (not just its sub-fields) - keep the dialog's parentField prop in
      // sync so its scale/box reflects the newly saved shape immediately.
      setManagingParentField((prev) => (prev && prev.id === fieldId ? updated : prev));
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
  const topLevelFields = [...containerFields, ...standaloneFields];

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
        <FieldsListSkeleton />
      ) : topLevelFields.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No fields yet. Add one to plan a planting layout.
        </Typography>
      ) : (
        <Stack spacing={2}>
          {topLevelFields.map((field) => (
            <TopLevelFieldCard
              key={field.id}
              field={field}
              subFields={subFieldsByParent[field.id] || []}
              isExpanded={expandedId === field.id}
              onToggleExpand={() => setExpandedId((prev) => (prev === field.id ? null : field.id))}
              selectedSubFieldId={selectedSubFieldId}
              onSelectSubField={setSelectedSubFieldId}
              onDelete={handleDeleteField}
              onManage={() => setManagingParentField(field)}
              isDeleting={deletingFieldId === field.id}
              varieties={varieties}
              isRenaming={renamingFieldId === field.id}
              renameValue={renameValue}
              onStartRename={() => startRenameField(field)}
              onRenameChange={setRenameValue}
              onCommitRename={commitRenameField}
              onCancelRename={cancelRenameField}
            />
          ))}
        </Stack>
      )}

      {!isLoadingFields && totalPages > 1 && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
          <Pagination count={totalPages} page={page} onChange={(e, value) => goToPage(value)} color="primary" />
        </Box>
      )}

      {addFieldDialog}
      {manageSubFieldsDialog}
    </Box>
  );
}

export default FieldsList;
