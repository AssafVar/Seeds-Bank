import React, { useEffect, useMemo, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
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
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteIcon from "@mui/icons-material/Delete";
import { MapContainer, TileLayer, Polygon, Marker, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import vegetableVarieties from "../../libs/vegetableVarieties";
import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  distanceMeters,
  formatDistance,
  vertexIcon,
  labelIcon,
  MapView,
  ClickCapture,
} from "./mapDrawingShared.jsx";

const MIN_MAP_HEIGHT = 240;
const emptyNewField = { name: "", variety: "Custom", sowingStructure: "grid", plantSpacing: "", rowSpacing: "" };

// A saved sub-field, rendered as a whole-shape-draggable polygon. Leaflet's
// vector layers (unlike Marker) have no built-in dragging, so this wires the
// map's own mouse events by hand: mousedown captures the shape's starting
// vertices and disables map panning, mousemove translates every vertex by
// the pointer's delta, mouseup re-enables panning and reports the move up -
// snapping back to the original position if the server rejects it (e.g. it
// now falls outside the parent boundary).
function DraggableSubFieldPolygon({ field, isSelected, onSelect, onMoved }) {
  const map = useMap();
  const [liveVertices, setLiveVertices] = useState(field.geoVertices);
  const dragRef = useRef(null);

  useEffect(() => {
    setLiveVertices(field.geoVertices);
  }, [field.geoVertices]);

  const handleMouseDown = (e) => {
    onSelect(field.id);
    map.dragging.disable();
    const original = field.geoVertices;
    dragRef.current = { start: e.latlng, original };

    const handleMouseMove = (moveEvt) => {
      if (!dragRef.current) return;
      const dLat = moveEvt.latlng.lat - dragRef.current.start.lat;
      const dLng = moveEvt.latlng.lng - dragRef.current.start.lng;
      setLiveVertices(dragRef.current.original.map((v) => ({ lat: v.lat + dLat, lng: v.lng + dLng })));
    };

    const handleMouseUp = (upEvt) => {
      map.off("mousemove", handleMouseMove);
      map.off("mouseup", handleMouseUp);
      map.dragging.enable();
      const dragInfo = dragRef.current;
      dragRef.current = null;
      if (!dragInfo) return;

      const dLat = upEvt.latlng.lat - dragInfo.start.lat;
      const dLng = upEvt.latlng.lng - dragInfo.start.lng;
      if (dLat === 0 && dLng === 0) return;

      const moved = dragInfo.original.map((v) => ({ lat: v.lat + dLat, lng: v.lng + dLng }));
      setLiveVertices(moved);
      onMoved(field.id, moved, () => setLiveVertices(dragInfo.original));
    };

    map.on("mousemove", handleMouseMove);
    map.on("mouseup", handleMouseUp);
  };

  return (
    <Polygon
      positions={liveVertices.map((v) => [v.lat, v.lng])}
      pathOptions={{
        color: isSelected ? "#D6543A" : "#1F4D3A",
        weight: isSelected ? 3 : 2,
        fillOpacity: 0.25,
      }}
      eventHandlers={{ mousedown: handleMouseDown }}
    />
  );
}

function ManageSubFieldsMap({ parentField, subFields, onCreate, onUpdateGeometry, onDelete, onClose }) {
  const [selectedId, setSelectedId] = useState(null);
  const [clipboard, setClipboard] = useState(null);

  const [drawVertices, setDrawVertices] = useState([]);
  const [isDrawClosed, setIsDrawClosed] = useState(false);
  const [newField, setNewField] = useState(emptyNewField);
  const [error, setError] = useState("");

  const handleVarietyChange = (name) => {
    const match = vegetableVarieties.find((v) => v.name === name);
    setNewField((prev) => ({
      ...prev,
      variety: name,
      ...(match ? { plantSpacing: String(match.plantSpacing), rowSpacing: String(match.rowSpacing) } : {}),
    }));
  };

  const handleDrawClick = (point) => {
    setDrawVertices((prev) => [...prev, point]);
  };

  const handleDrawUndo = () => setDrawVertices((prev) => prev.slice(0, -1));

  const handleDrawVertexDrag = (index, latlng) => {
    const point = { lat: latlng.lat, lng: latlng.lng };
    setDrawVertices((prev) => prev.map((v, i) => (i === index ? point : v)));
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
    const lngs = clipboard.geoVertices.map((v) => v.lng);
    const width = Math.max(...lngs) - Math.min(...lngs) || 0.0005;
    const offsetVertices = clipboard.geoVertices.map((v) => ({ lat: v.lat, lng: v.lng + width * 0.6 }));

    const created = await onCreate({
      name: `${clipboard.name} copy`,
      variety: clipboard.variety,
      shapeType: "polygon",
      parentFieldId: parentField.id,
      geoVertices: offsetVertices,
      sowingStructure: clipboard.sowingStructure,
      plantSpacing: clipboard.plantSpacing,
      rowSpacing: clipboard.rowSpacing,
    });
    if (created) {
      setSelectedId(created.id);
      setError("");
    } else {
      setError("Failed to paste sub-field");
    }
  };

  const handleDeleteField = async (field) => {
    const success = await onDelete(field.id);
    if (success && field.id === selectedId) {
      setSelectedId(null);
      // Clipboard is intentionally left alone even if its source field was
      // just deleted - the copied shape/spacing is still useful to paste.
    }
  };

  const handleMoved = async (fieldId, geoVertices, resetOnFailure) => {
    const updated = await onUpdateGeometry(fieldId, geoVertices);
    if (!updated) {
      resetOnFailure();
      setError("That position is outside the large field's boundary.");
    } else {
      setError("");
    }
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
    if (created) {
      setDrawVertices([]);
      setIsDrawClosed(false);
      setNewField(emptyNewField);
      setError("");
    } else {
      setError("Failed to create sub-field");
    }
  };

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

  return (
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
                      <IconButton size="small" title="Delete" onClick={() => handleDeleteField(f)}>
                        <DeleteIcon fontSize="small" color="error" />
                      </IconButton>
                    </Box>
                  }
                >
                  <ListItemButton selected={f.id === selectedId} onClick={() => setSelectedId(f.id)} sx={{ pr: 9 }}>
                    <ListItemText primary={f.name} secondary={f.variety || "Custom"} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Box>
        )}

        {clipboard && (
          <Button size="small" variant="outlined" onClick={handlePaste}>
            Paste copy of "{clipboard.name}"
          </Button>
        )}

        <Divider />

        <Typography variant="subtitle2">Add a new sub-field</Typography>
        <TextField
          label="Field name"
          fullWidth
          value={newField.name}
          onChange={(e) => setNewField({ ...newField, name: e.target.value })}
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
            value={newField.sowingStructure}
            onChange={(e, value) => value && setNewField({ ...newField, sowingStructure: value })}
            size="small"
          >
            <ToggleButton value="grid">Grid (aligned rows)</ToggleButton>
            <ToggleButton value="staggered">Staggered (denser)</ToggleButton>
          </ToggleButtonGroup>
        </Box>
        <TextField
          label="Plant spacing (m)" type="number" fullWidth
          value={newField.plantSpacing}
          onChange={(e) => setNewField({ ...newField, plantSpacing: e.target.value })}
        />
        <TextField
          label="Row spacing (m)" type="number" fullWidth
          value={newField.rowSpacing}
          onChange={(e) => setNewField({ ...newField, rowSpacing: e.target.value })}
        />
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

        {error && (
          <Typography variant="body2" color="error">
            {error}
          </Typography>
        )}

        <Box sx={{ display: "flex", gap: 1 }}>
          <Button onClick={onClose}>Close</Button>
          <Button variant="contained" onClick={handleCreateNew}>
            Add Sub-Field
          </Button>
        </Box>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, display: "flex" }}>
        <Box sx={{ border: "1px solid", borderColor: "divider", flex: 1, minHeight: MIN_MAP_HEIGHT }}>
          <MapContainer
            center={[DEFAULT_CENTER.lat, DEFAULT_CENTER.lng]}
            zoom={DEFAULT_ZOOM}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapView fitTo={parentField.geoVertices} />
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
                onSelect={setSelectedId}
                onMoved={handleMoved}
              />
            ))}

            {drawVertices.length >= 2 && (
              <Polygon
                positions={drawVertices.map((v) => [v.lat, v.lng])}
                pathOptions={{ color: "#1F4D3A", fillOpacity: isDrawClosed ? 0.15 : 0 }}
              />
            )}
            {drawSegments.map(([a, b], i) => {
              const midpoint = { lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 };
              return (
                <Marker
                  key={`draw-segment-${i}`}
                  position={[midpoint.lat, midpoint.lng]}
                  icon={labelIcon(formatDistance(distanceMeters(a, b)))}
                  interactive={false}
                  keyboard={false}
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
    </Box>
  );
}

export default ManageSubFieldsMap;
