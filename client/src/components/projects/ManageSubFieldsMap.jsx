import React, { useEffect, useMemo, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import FormControl from "@mui/material/FormControl";
import IconButton from "@mui/material/IconButton";
import InputLabel from "@mui/material/InputLabel";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteIcon from "@mui/icons-material/Delete";
import { MapContainer, Polygon, Marker, CircleMarker, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { STATUS_OPTIONS, STATUS_CHIP_COLOR, statusLabel } from "../../libs/fieldStatus.js";
import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  vertexIcon,
  localToLatLng,
  pointAtDistanceAlong,
  MapView,
  ClickCapture,
  MapBaseLayers,
  SegmentLengthLabel,
} from "./mapDrawingShared.jsx";
import { InlineSpinner } from "../common/Spinner.jsx";
import FieldTimeline from "./FieldTimeline.jsx";
import FieldLaborTab from "./FieldLaborTab.jsx";
import { getVegetableVarieties, getWorkers } from "../../services/serverCalls";

const MIN_MAP_HEIGHT = 240;
const emptyNewField = {
  name: "",
  variety: "Custom",
  sowingStructure: "grid",
  plantSpacing: "",
  rowSpacing: "",
  status: "planning",
  sowingDate: "",
  harvestDate: "",
  yieldAmount: "",
  yieldUnit: "",
  notes: "",
};
const AUTOSAVE_DEBOUNCE_MS = 600;

// ISO datetime from the server -> the yyyy-mm-dd a native date input wants.
const toDateInputValue = (isoString) => (isoString ? isoString.slice(0, 10) : "");

// A saved sub-field, rendered as a whole-shape-draggable polygon. Leaflet's
// vector layers (unlike Marker) have no built-in dragging, so this wires the
// map's own mouse events by hand: mousedown captures the shape's starting
// vertices and disables map panning, mousemove translates every vertex by
// the pointer's delta, mouseup re-enables panning and reports the move up -
// snapping back to the original position if the server rejects it (e.g. it
// now falls outside the parent boundary).
function DraggableSubFieldPolygon({ field, isSelected, onSelect, onMoved, suppressClickRef }) {
  const map = useMap();
  const [liveVertices, setLiveVertices] = useState(field.geoVertices);
  // A pure shape-body drag is just a translation - it can't change the
  // plant count or layout, so instead of waiting on a server round trip the
  // already-computed dots just slide by the same delta as the boundary,
  // live. Reshaping a single corner does change the fill, so that case
  // leaves this at zero and waits for the recalculated set from the server.
  const [plantOffset, setPlantOffset] = useState({ dLat: 0, dLng: 0 });
  const dragRef = useRef(null);

  useEffect(() => {
    setLiveVertices(field.geoVertices);
    setPlantOffset({ dLat: 0, dLng: 0 });
  }, [field.geoVertices]);

  const handleMouseDown = (e) => {
    // A plain click (mousedown with no movement) still bubbles up to the
    // map as a native "click" afterward, which the draw-boundary
    // ClickCapture would otherwise mistake for a new vertex. Arm the flag
    // now and clear it just after that click has had a chance to fire.
    suppressClickRef.current = true;
    onSelect(field.id);
    map.dragging.disable();
    const original = field.geoVertices;
    dragRef.current = { start: e.latlng, original };

    const handleMouseMove = (moveEvt) => {
      if (!dragRef.current) return;
      const dLat = moveEvt.latlng.lat - dragRef.current.start.lat;
      const dLng = moveEvt.latlng.lng - dragRef.current.start.lng;
      setLiveVertices(dragRef.current.original.map((v) => ({ lat: v.lat + dLat, lng: v.lng + dLng })));
      setPlantOffset({ dLat, dLng });
    };

    const handleMouseUp = (upEvt) => {
      map.off("mousemove", handleMouseMove);
      map.off("mouseup", handleMouseUp);
      map.dragging.enable();
      const dragInfo = dragRef.current;
      dragRef.current = null;
      setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
      if (!dragInfo) return;

      const dLat = upEvt.latlng.lat - dragInfo.start.lat;
      const dLng = upEvt.latlng.lng - dragInfo.start.lng;
      if (dLat === 0 && dLng === 0) return;

      const moved = dragInfo.original.map((v) => ({ lat: v.lat + dLat, lng: v.lng + dLng }));
      setLiveVertices(moved);
      // plantOffset is left as-is (not reset here) so the dots stay put at
      // their translated spot until the server's recalculated field.vertices
      // arrives and the effect above zeroes the offset back out; resetting
      // it now would snap them back to the pre-drag position for a beat.
      onMoved(field.id, moved, () => {
        setLiveVertices(dragInfo.original);
        setPlantOffset({ dLat: 0, dLng: 0 });
      });
    };

    map.on("mousemove", handleMouseMove);
    map.on("mouseup", handleMouseUp);
  };

  // Reshaping one corner - Leaflet Markers drag themselves (unlike Path
  // layers), so this just tracks the single vertex being moved rather than
  // reusing the whole-shape mousemove/mouseup wiring above.
  const handleVertexDragStart = () => {
    suppressClickRef.current = true;
  };

  const handleVertexDrag = (index, latlng) => {
    setLiveVertices((prev) => prev.map((v, i) => (i === index ? { lat: latlng.lat, lng: latlng.lng } : v)));
  };

  const handleVertexDragEnd = (index, latlng) => {
    const moved = field.geoVertices.map((v, i) => (i === index ? { lat: latlng.lat, lng: latlng.lng } : v));
    setLiveVertices(moved);
    onMoved(field.id, moved, () => setLiveVertices(field.geoVertices));
    setTimeout(() => {
      suppressClickRef.current = false;
    }, 0);
  };

  // Typing an exact edge length moves the far vertex along that edge's
  // direction to match, same idea as dragging a corner but precise.
  const handleSegmentLengthChange = (targetIndex, anchor, meters) => {
    const newPoint = pointAtDistanceAlong(anchor, field.geoVertices[targetIndex], meters);
    const moved = field.geoVertices.map((v, i) => (i === targetIndex ? newPoint : v));
    setLiveVertices(moved);
    onMoved(field.id, moved, () => setLiveVertices(field.geoVertices));
  };

  return (
    <>
      <Polygon
        positions={liveVertices.map((v) => [v.lat, v.lng])}
        pathOptions={{
          color: isSelected ? "#D6543A" : "#1F4D3A",
          weight: isSelected ? 3 : 2,
          fillOpacity: 0.25,
        }}
        eventHandlers={{ mousedown: handleMouseDown }}
      />
      {isSelected &&
        liveVertices.map((v, i) => (
          <Marker
            key={i}
            position={[v.lat, v.lng]}
            icon={vertexIcon}
            draggable
            eventHandlers={{
              dragstart: handleVertexDragStart,
              drag: (e) => handleVertexDrag(i, e.target.getLatLng()),
              dragend: (e) => handleVertexDragEnd(i, e.target.getLatLng()),
            }}
          />
        ))}
      {isSelected &&
        liveVertices.map((a, i) => {
          const targetIndex = (i + 1) % liveVertices.length;
          return (
            <SegmentLengthLabel
              key={`edge-${i}`}
              a={a}
              b={liveVertices[targetIndex]}
              suppressClickRef={suppressClickRef}
              onApply={(meters) => handleSegmentLengthChange(targetIndex, a, meters)}
            />
          );
        })}
      <SubFieldPlants field={field} offset={plantOffset} />
    </>
  );
}

// Leaflet sizes its panes from the container's dimensions at mount/last
// invalidateSize() call and doesn't notice a plain CSS/flex-basis resize
// (there's no window "resize" event to react to), so shrinking the map
// panel when switching to the Field Data tab would otherwise leave the
// tiles clipped to the old, larger size until the browser window itself
// was resized. Nudging it once the CSS transition finishes fixes that.
function MapResizeHandler({ trigger }) {
  const map = useMap();
  useEffect(() => {
    const timeout = setTimeout(() => map.invalidateSize(), 220);
    return () => clearTimeout(timeout);
  }, [map, trigger]);
  return null;
}

function SubFieldPlants({ field, offset }) {
  if (!field.plantPositions?.length) {
    return null;
  }
  const toLatLng = localToLatLng(field.vertices, field.geoVertices);
  const dLat = offset?.dLat || 0;
  const dLng = offset?.dLng || 0;
  return field.plantPositions.map((p, i) => {
    const latLng = toLatLng(p);
    if (!latLng) return null;
    return (
      <CircleMarker
        key={i}
        center={[latLng.lat + dLat, latLng.lng + dLng]}
        radius={3}
        pathOptions={{ color: "#1F4D3A", fillColor: "#1F4D3A", fillOpacity: 0.9, weight: 1 }}
        interactive={false}
      />
    );
  });
}

function ManageSubFieldsMap({
  parentField,
  subFields,
  onCreate,
  onUpdateGeometry,
  onUpdateProperties,
  onDelete,
  onGetWorkLogs,
  onCreateWorkLog,
  onDeleteWorkLog,
  onClose,
}) {
  const [selectedId, setSelectedId] = useState(null);
  const [clipboard, setClipboard] = useState(null);

  const [drawVertices, setDrawVertices] = useState([]);
  const [isDrawClosed, setIsDrawClosed] = useState(false);
  const [newField, setNewField] = useState(emptyNewField);
  const [error, setError] = useState("");
  const [activeEditTab, setActiveEditTab] = useState(0);

  const [isSavingSelected, setIsSavingSelected] = useState(false);
  const [isPasting, setIsPasting] = useState(false);
  const [isCreatingSubField, setIsCreatingSubField] = useState(false);
  const [deletingFieldId, setDeletingFieldId] = useState(null);

  const [varieties, setVarieties] = useState([]);
  const [workers, setWorkers] = useState([]);

  const saveTimeoutRef = useRef(null);
  const pendingSaveRef = useRef(null);
  const suppressClickRef = useRef(false);

  useEffect(() => {
    getVegetableVarieties().then((data) => data && setVarieties(data));
    getWorkers().then((data) => data && setWorkers(data));
  }, []);

  const commitSave = async (fieldId, values) => {
    const spacingValues = [values.plantSpacing, values.rowSpacing].map(Number);
    if (!values.name || spacingValues.some((v) => !(v > 0))) {
      return;
    }
    setIsSavingSelected(true);
    const updated = await onUpdateProperties(fieldId, {
      name: values.name,
      variety: values.variety === "Custom" ? null : values.variety,
      sowingStructure: values.sowingStructure,
      plantSpacing: spacingValues[0],
      rowSpacing: spacingValues[1],
      status: values.status || "planning",
      sowingDate: values.sowingDate || null,
      harvestDate: values.harvestDate || null,
      yieldAmount: values.yieldAmount ? Number(values.yieldAmount) : null,
      yieldUnit: values.yieldUnit || null,
      notes: values.notes || null,
    });
    setIsSavingSelected(false);
    setError(updated ? "" : "Failed to save changes");
  };

  const flushPendingSave = () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    if (pendingSaveRef.current) {
      const { fieldId, values } = pendingSaveRef.current;
      pendingSaveRef.current = null;
      commitSave(fieldId, values);
    }
  };

  const discardPendingSave = (fieldId) => {
    if (pendingSaveRef.current?.fieldId === fieldId) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      pendingSaveRef.current = null;
    }
  };

  // Flush a save left pending by an unmount (e.g. closing the dialog)
  // mid-debounce, so the last edit isn't silently dropped.
  useEffect(() => flushPendingSave, []); // eslint-disable-line react-hooks/exhaustive-deps

  const scheduleSave = (fieldId, values, immediate) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    if (immediate) {
      pendingSaveRef.current = null;
      commitSave(fieldId, values);
      return;
    }
    pendingSaveRef.current = { fieldId, values };
    saveTimeoutRef.current = setTimeout(() => {
      saveTimeoutRef.current = null;
      pendingSaveRef.current = null;
      commitSave(fieldId, values);
    }, AUTOSAVE_DEBOUNCE_MS);
  };

  // Updates the form, and - while editing an existing sub-field - autosaves
  // the change (debounced for free-typed text, immediate for discrete
  // picks like variety/sowing structure) so switching to another sub-field
  // never loses an edit.
  const updateFieldValue = (patch, immediate) => {
    const updated = { ...newField, ...patch };
    setNewField(updated);
    if (selectedId) {
      scheduleSave(selectedId, updated, immediate);
    }
  };

  const handleVarietyChange = (name) => {
    const match = varieties.find((v) => v.name === name);
    updateFieldValue(
      {
        variety: name,
        ...(match ? { plantSpacing: String(match.plantSpacing), rowSpacing: String(match.rowSpacing) } : {}),
      },
      true
    );
  };

  const selectField = (fieldId) => {
    flushPendingSave();
    setSelectedId(fieldId);
    const field = subFields.find((f) => f.id === fieldId);
    if (field) {
      const status = field.status || "planning";
      setNewField({
        name: field.name,
        variety: field.variety || "Custom",
        sowingStructure: field.sowingStructure || "grid",
        plantSpacing: field.plantSpacing != null ? String(field.plantSpacing) : "",
        rowSpacing: field.rowSpacing != null ? String(field.rowSpacing) : "",
        status,
        sowingDate: toDateInputValue(field.sowingDate),
        harvestDate: toDateInputValue(field.harvestDate),
        yieldAmount: field.yieldAmount != null ? String(field.yieldAmount) : "",
        yieldUnit: field.yieldUnit || "",
        notes: field.notes || "",
      });
      // A field still being planned opens on its shape - once it's actually
      // sown, the shape rarely needs touching again and the agricultural
      // data is what you came here for.
      setActiveEditTab(status === "planning" ? 0 : 1);
    }
  };

  const handleDrawClick = (point) => {
    if (suppressClickRef.current) {
      // This click is the tail end of selecting/dragging an existing
      // sub-field, not an intent to add a new boundary point.
      return;
    }
    setDrawVertices((prev) => [...prev, point]);
  };

  const handleDrawUndo = () => setDrawVertices((prev) => prev.slice(0, -1));

  const handleDrawVertexDrag = (index, latlng) => {
    const point = { lat: latlng.lat, lng: latlng.lng };
    setDrawVertices((prev) => prev.map((v, i) => (i === index ? point : v)));
  };

  const handleDrawSegmentLengthChange = (targetIndex, anchor, meters) => {
    const newPoint = pointAtDistanceAlong(anchor, drawVertices[targetIndex], meters);
    setDrawVertices((prev) => prev.map((v, i) => (i === targetIndex ? newPoint : v)));
  };

  const handleDrawClear = () => {
    setDrawVertices([]);
    setIsDrawClosed(false);
  };

  const handleDrawClose = () => {
    if (drawVertices.length < 3) return;
    setIsDrawClosed(true);
  };

  const handleDrawEditAgain = () => setIsDrawClosed(false);

  const handleCopy = (field) => {
    setClipboard({
      name: field.name,
      variety: field.variety,
      sowingStructure: field.sowingStructure,
      plantSpacing: field.plantSpacing,
      rowSpacing: field.rowSpacing,
      geoVertices: field.geoVertices,
    });
  };

  const handlePaste = async () => {
    if (!clipboard) return;

    // Pasted directly on top of the source shape rather than at a computed
    // offset - an offset guess (e.g. shifted by a fraction of its own width)
    // frequently landed outside the parent boundary since sub-fields
    // typically already tile most of it, which silently failed the create
    // with no obvious visual cause. Stacking it exactly on the original is
    // always a valid position (it's identical to one that already passed
    // the boundary check), and the new copy is immediately draggable - same
    // as any other sub-field - so the user just drags it off to one side.
    setIsPasting(true);
    const created = await onCreate({
      name: `${clipboard.name} copy`,
      variety: clipboard.variety,
      shapeType: "polygon",
      parentFieldId: parentField.id,
      geoVertices: clipboard.geoVertices,
      sowingStructure: clipboard.sowingStructure,
      plantSpacing: clipboard.plantSpacing,
      rowSpacing: clipboard.rowSpacing,
    });
    setIsPasting(false);
    if (created) {
      setSelectedId(created.id);
      setError("");
    } else {
      setError("Failed to paste sub-field");
    }
  };

  const handleDeleteField = async (field) => {
    discardPendingSave(field.id);
    setDeletingFieldId(field.id);
    const success = await onDelete(field.id);
    setDeletingFieldId(null);
    if (success && field.id === selectedId) {
      setSelectedId(null);
      setNewField(emptyNewField);
      // Clipboard is intentionally left alone even if its source field was
      // just deleted - the copied shape/spacing is still useful to paste.
    }
  };

  const handleMoved = async (fieldId, geoVertices, resetOnFailure) => {
    setIsSavingSelected(true);
    const updated = await onUpdateGeometry(fieldId, geoVertices);
    setIsSavingSelected(false);
    if (!updated) {
      resetOnFailure();
      setError("That position is outside the large field's boundary.");
    } else {
      setError("");
    }
  };

  const handleDoneEditing = () => {
    flushPendingSave();
    setSelectedId(null);
    setNewField(emptyNewField);
    setError("");
  };

  const handleCreateNew = async () => {
    const spacingValues = [newField.plantSpacing, newField.rowSpacing].map(Number);
    if (!newField.name || spacingValues.some((v) => !(v > 0))) {
      setError("Please fill in a name and positive spacing values");
      return;
    }
    if (!isDrawClosed || drawVertices.length < 3) {
      setError("Draw and close a boundary with at least 3 points");
      return;
    }

    setIsCreatingSubField(true);
    const created = await onCreate({
      name: newField.name,
      variety: newField.variety === "Custom" ? null : newField.variety,
      shapeType: "polygon",
      parentFieldId: parentField.id,
      geoVertices: drawVertices,
      sowingStructure: newField.sowingStructure,
      plantSpacing: spacingValues[0],
      rowSpacing: spacingValues[1],
    });
    setIsCreatingSubField(false);
    if (created) {
      setDrawVertices([]);
      setIsDrawClosed(false);
      setNewField(emptyNewField);
      setError("");
    } else {
      setError("Failed to create sub-field");
    }
  };

  // Pulled fresh from `subFields` (not `newField`) each render, so it
  // reflects the server's recalculated capacity for the current shape and
  // spacing - including right after a corner/shape drag - not just what's
  // pending in the form.
  const selectedField = subFields.find((f) => f.id === selectedId);

  const drawSegments = useMemo(() => {
    const list = [];
    for (let i = 0; i < drawVertices.length - 1; i++) {
      list.push([drawVertices[i], drawVertices[i + 1]]);
    }
    if (isDrawClosed && drawVertices.length >= 3) {
      list.push([drawVertices[drawVertices.length - 1], drawVertices[0]]);
    }
    return list;
  }, [drawVertices, isDrawClosed]);

  // Once a field is past planning, its shape rarely needs the map's full
  // attention any more - the map stays reachable (Shape & Basics is one
  // click away) but shrinks to a small locator/drag target while the
  // agricultural data panel takes the room instead.
  const isDataFocused = Boolean(selectedId) && (activeEditTab === 1 || activeEditTab === 2);

  return (
    <Box sx={{ flex: 1, minHeight: 0, display: "flex", overflow: "hidden" }}>
      <Box
        sx={{
          width: isDataFocused ? 520 : 360,
          transition: "width 0.2s ease",
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
          Drag a sub-field on the map to reposition it, use the icons below to copy or delete one, or draw a new
          one further down.
        </Typography>

        {subFields.length > 0 && (
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
              Sub-fields
            </Typography>
            <List dense disablePadding sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
              {subFields.map((f) => (
                <ListItem
                  key={f.id}
                  disablePadding
                  secondaryAction={
                    <Box sx={{ display: "flex", gap: 0.5, pr: 0.5 }}>
                      <IconButton size="small" title="Copy" onClick={() => handleCopy(f)}>
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        title="Delete"
                        onClick={() => handleDeleteField(f)}
                        disabled={deletingFieldId === f.id}
                      >
                        {deletingFieldId === f.id ? (
                          <InlineSpinner size={16} />
                        ) : (
                          <DeleteIcon fontSize="small" color="error" />
                        )}
                      </IconButton>
                    </Box>
                  }
                >
                  <ListItemButton selected={f.id === selectedId} onClick={() => selectField(f.id)} sx={{ pr: 9 }}>
                    <ListItemText
                      primary={
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                          {f.name}
                          <Chip
                            label={statusLabel(f.status)}
                            size="small"
                            color={STATUS_CHIP_COLOR[f.status] || "default"}
                            variant={f.status && f.status !== "planning" ? "filled" : "outlined"}
                          />
                        </Box>
                      }
                      secondary={`${f.variety || "Custom"} · ${f.totalCapacity} plants`}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Box>
        )}

        {clipboard && (
          <Box>
            <Button size="small" variant="outlined" onClick={handlePaste} disabled={isPasting} fullWidth>
              {isPasting ? <InlineSpinner size={18} /> : `Paste copy of "${clipboard.name}"`}
            </Button>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
              The copy lands on top of the original - drag it on the map to reposition it.
            </Typography>
          </Box>
        )}

        <Divider />

        <Typography variant="subtitle2">
          {selectedId ? "Edit selected sub-field" : "Add a new sub-field"}
          {selectedId && (
            <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
              {isSavingSelected ? (
                <>
                  <InlineSpinner size={10} sx={{ mr: 0.5 }} />
                  Saving...
                </>
              ) : (
                "(saves automatically)"
              )}
            </Typography>
          )}
        </Typography>

        {selectedId && (
          <Tabs
            value={activeEditTab}
            onChange={(e, value) => setActiveEditTab(value)}
            variant="fullWidth"
            sx={{ minHeight: 36, "& .MuiTab-root": { minHeight: 36 } }}
          >
            <Tab label="Shape & Basics" />
            <Tab label="Field Data" />
            <Tab label="Labor" />
          </Tabs>
        )}

        {(!selectedId || activeEditTab === 0) && (
          <>
            {selectedField && (
              <Typography variant="body2" color="text.secondary">
                Fits <strong>{selectedField.totalCapacity} plants</strong> at this shape and spacing
                {selectedField.isPreviewApproximate ? " (preview thinned for display)" : ""}.
              </Typography>
            )}
            <TextField
              label="Field name"
              fullWidth
              value={newField.name}
              onChange={(e) => updateFieldValue({ name: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel id="new-subfield-variety-label">Vegetable variety</InputLabel>
              <Select
                labelId="new-subfield-variety-label"
                label="Vegetable variety"
                value={newField.variety}
                onChange={(e) => handleVarietyChange(e.target.value)}
              >
                <MenuItem value="Custom">Custom</MenuItem>
                {varieties.map((v) => (
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
                value={newField.sowingStructure}
                onChange={(e, value) => value && updateFieldValue({ sowingStructure: value }, true)}
                size="small"
              >
                <ToggleButton value="grid">Grid (aligned rows)</ToggleButton>
                <ToggleButton value="staggered">Staggered (denser)</ToggleButton>
              </ToggleButtonGroup>
            </Box>
            <TextField
              label="Plant spacing (m)" type="number" fullWidth
              value={newField.plantSpacing}
              onChange={(e) => updateFieldValue({ plantSpacing: e.target.value })}
            />
            <TextField
              label="Row spacing (m)" type="number" fullWidth
              value={newField.rowSpacing}
              onChange={(e) => updateFieldValue({ rowSpacing: e.target.value })}
            />
          </>
        )}

        {selectedId && activeEditTab === 1 && (
          <>
            <FormControl fullWidth>
              <InputLabel id="subfield-status-label">Status</InputLabel>
              <Select
                labelId="subfield-status-label"
                label="Status"
                value={newField.status}
                onChange={(e) => updateFieldValue({ status: e.target.value }, true)}
              >
                {STATUS_OPTIONS.map((s) => (
                  <MenuItem key={s.value} value={s.value}>
                    {s.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Sowing date"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={newField.sowingDate}
              onChange={(e) => updateFieldValue({ sowingDate: e.target.value }, true)}
            />
            <TextField
              label="Harvest date"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={newField.harvestDate}
              onChange={(e) => updateFieldValue({ harvestDate: e.target.value }, true)}
            />
            <Box sx={{ display: "flex", gap: 1 }}>
              <TextField
                label="Yield amount" type="number" fullWidth
                value={newField.yieldAmount}
                onChange={(e) => updateFieldValue({ yieldAmount: e.target.value })}
              />
              <TextField
                label="Unit" placeholder="kg" fullWidth
                value={newField.yieldUnit}
                onChange={(e) => updateFieldValue({ yieldUnit: e.target.value })}
              />
            </Box>
            <TextField
              label="Notes"
              placeholder="Irrigation, fertilizing, pest issues, anything else worth logging..."
              multiline
              minRows={3}
              fullWidth
              value={newField.notes}
              onChange={(e) => updateFieldValue({ notes: e.target.value })}
            />
          </>
        )}

        {!selectedId && (
          <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
            <Button size="small" onClick={handleDrawUndo} disabled={drawVertices.length === 0 || isDrawClosed}>
              Undo point
            </Button>
            <Button size="small" onClick={handleDrawClear}>
              Clear
            </Button>
            <Button size="small" variant="contained" onClick={handleDrawClose} disabled={drawVertices.length < 3 || isDrawClosed}>
              Close Shape
            </Button>
            {isDrawClosed && (
              <Button size="small" onClick={handleDrawEditAgain}>
                Edit again
              </Button>
            )}
          </Box>
        )}

        {error && (
          <Typography variant="body2" color="error">
            {error}
          </Typography>
        )}

        <Box sx={{ display: "flex", gap: 1 }}>
          <Button onClick={onClose}>Close</Button>
          {selectedId ? (
            <Button variant="contained" onClick={handleDoneEditing}>
              Done
            </Button>
          ) : (
            <Button variant="contained" onClick={handleCreateNew} disabled={isCreatingSubField}>
              {isCreatingSubField ? <InlineSpinner size={20} /> : "Add Sub-Field"}
            </Button>
          )}
        </Box>
      </Box>

      <Box
        sx={{
          flex: isDataFocused ? "0 0 320px" : 1,
          minHeight: 0,
          display: "flex",
          transition: "flex-basis 0.2s ease",
        }}
      >
        <Box sx={{ border: "1px solid", borderColor: "divider", flex: 1, minHeight: MIN_MAP_HEIGHT }}>
          <MapContainer
            center={[DEFAULT_CENTER.lat, DEFAULT_CENTER.lng]}
            zoom={DEFAULT_ZOOM}
            style={{ height: "100%", width: "100%" }}
          >
            <MapBaseLayers />
            <MapView fitTo={parentField.geoVertices} />
            <MapResizeHandler trigger={isDataFocused} />
            <ClickCapture disabled={isDrawClosed} onClick={handleDrawClick} />

            <Polygon
              positions={parentField.geoVertices.map((v) => [v.lat, v.lng])}
              pathOptions={{ color: "#8A7A5C", weight: 2, dashArray: "6 6", fillOpacity: 0 }}
            />

            {subFields.map((f) => (
              <DraggableSubFieldPolygon
                key={f.id}
                field={f}
                isSelected={f.id === selectedId}
                onSelect={selectField}
                onMoved={handleMoved}
                suppressClickRef={suppressClickRef}
              />
            ))}

            {drawVertices.length >= 2 && (
              <Polygon
                positions={drawVertices.map((v) => [v.lat, v.lng])}
                pathOptions={{ color: "#1F4D3A", fillOpacity: isDrawClosed ? 0.15 : 0 }}
              />
            )}
            {drawSegments.map(([a, b], i) => {
              const targetIndex = isDrawClosed && i === drawSegments.length - 1 ? 0 : i + 1;
              return (
                <SegmentLengthLabel
                  key={`draw-segment-${i}`}
                  a={a}
                  b={b}
                  suppressClickRef={suppressClickRef}
                  onApply={(meters) => handleDrawSegmentLengthChange(targetIndex, a, meters)}
                />
              );
            })}
            {drawVertices.map((v, i) => (
              <Marker
                key={`draw-vertex-${i}`}
                position={[v.lat, v.lng]}
                icon={vertexIcon}
                draggable
                eventHandlers={{
                  drag: (e) => handleDrawVertexDrag(i, e.target.getLatLng()),
                  dragend: (e) => handleDrawVertexDrag(i, e.target.getLatLng()),
                }}
              />
            ))}
          </MapContainer>
        </Box>
      </Box>

      {isDataFocused && (
        <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", borderLeft: "1px solid", borderColor: "divider" }}>
          {activeEditTab === 1 && (
            <FieldTimeline
              status={selectedField?.status}
              sowingDate={selectedField?.sowingDate}
              harvestDate={selectedField?.harvestDate}
              variety={selectedField?.variety}
              areaM2={selectedField?.area}
              totalCapacity={selectedField?.totalCapacity}
              varieties={varieties}
            />
          )}
          {activeEditTab === 2 && (
            <FieldLaborTab
              fieldId={selectedId}
              workers={workers}
              onGetWorkLogs={onGetWorkLogs}
              onCreateWorkLog={onCreateWorkLog}
              onDeleteWorkLog={onDeleteWorkLog}
            />
          )}
        </Box>
      )}
    </Box>
  );
}

export default ManageSubFieldsMap;
