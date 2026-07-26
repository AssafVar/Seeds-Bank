import React, { useEffect, useRef, useState } from "react";
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
import { STATUS_OPTIONS, STATUS_CHIP_COLOR, statusLabel } from "../../libs/fieldStatus.js";
import { InlineSpinner } from "../common/Spinner.jsx";
import FieldTimeline from "./FieldTimeline.jsx";
import FieldLaborTab from "./FieldLaborTab.jsx";
import { getVegetableVarieties, getWorkers } from "../../services/serverCalls";

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
const PREVIEW_WIDTH = 400;
const PREVIEW_HEIGHT = 320;
const PREVIEW_PADDING = 16;

// ISO datetime from the server -> the yyyy-mm-dd a native date input wants.
const toDateInputValue = (isoString) => (isoString ? isoString.slice(0, 10) : "");

const distance = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);

// A saved sub-field, rendered as a whole-shape-draggable polygon (mousedown
// captures the shape's starting vertices, mousemove translates them by the
// pointer's delta - converted from pixels to meters via the shared `scale` -
// mouseup commits via onMoved, snapping back if the server rejects it, e.g.
// it now falls outside the parent boundary). Unlike the Leaflet map version
// (ManageSubFieldsMap.jsx's DraggableSubFieldPolygon), there's no map camera
// to fight over and no lat/lng conversion - everything here is already in
// the parent's own local-meter space, so the drag math is plain vector math.
function DraggableSubFieldShape({ field, isSelected, onSelect, onMoved, toPixel, scale, allowShapeDrag = true, dashed = false }) {
  const [liveVertices, setLiveVertices] = useState(field.vertices);
  const [plantOffset, setPlantOffset] = useState({ dx: 0, dy: 0 });
  const [editingIndex, setEditingIndex] = useState(null);
  const [editValue, setEditValue] = useState("");

  useEffect(() => {
    setLiveVertices(field.vertices);
    setPlantOffset({ dx: 0, dy: 0 });
  }, [field.vertices]);

  const startDrag = (getOriginal, onDrag, onCommit) => (e) => {
    e.stopPropagation();
    const start = { x: e.clientX, y: e.clientY };
    const original = getOriginal();

    const handleMouseMove = (moveEvt) => {
      const dx = (moveEvt.clientX - start.x) / scale;
      const dy = (moveEvt.clientY - start.y) / scale;
      onDrag(original, dx, dy);
    };

    const handleMouseUp = (upEvt) => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      const dx = (upEvt.clientX - start.x) / scale;
      const dy = (upEvt.clientY - start.y) / scale;
      if (dx === 0 && dy === 0) return; // a plain click, not a drag - selection already happened on mousedown
      onCommit(original, dx, dy);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleShapeMouseDown = (e) => {
    onSelect(field.id);
    if (!allowShapeDrag) return;
    startDrag(
      () => field.vertices,
      (original, dx, dy) => {
        setLiveVertices(original.map((v) => ({ x: v.x + dx, y: v.y + dy })));
        setPlantOffset({ dx, dy });
      },
      (original, dx, dy) => {
        const moved = original.map((v) => ({ x: v.x + dx, y: v.y + dy }));
        setLiveVertices(moved);
        onMoved(field.id, moved, () => {
          setLiveVertices(original);
          setPlantOffset({ dx: 0, dy: 0 });
        });
      }
    )(e);
  };

  const handleVertexMouseDown = (index) => (e) => {
    startDrag(
      () => field.vertices,
      (original, dx, dy) => {
        setLiveVertices(original.map((v, i) => (i === index ? { x: v.x + dx, y: v.y + dy } : v)));
      },
      (original, dx, dy) => {
        const moved = original.map((v, i) => (i === index ? { x: v.x + dx, y: v.y + dy } : v));
        setLiveVertices(moved);
        onMoved(field.id, moved, () => setLiveVertices(original));
      }
    )(e);
  };

  const startEditSegment = (index) => {
    const a = liveVertices[index];
    const b = liveVertices[(index + 1) % liveVertices.length];
    setEditingIndex(index);
    setEditValue(distance(a, b).toFixed(2));
  };

  const commitEditSegment = () => {
    const newLength = Number(editValue);
    if (editingIndex === null || !(newLength > 0)) {
      setEditingIndex(null);
      return;
    }
    const a = liveVertices[editingIndex];
    const bIndex = (editingIndex + 1) % liveVertices.length;
    const b = liveVertices[bIndex];
    const currentLength = distance(a, b) || 1;
    const dx = ((b.x - a.x) / currentLength) * newLength;
    const dy = ((b.y - a.y) / currentLength) * newLength;
    const updated = [...liveVertices];
    updated[bIndex] = { x: a.x + dx, y: a.y + dy };
    setLiveVertices(updated);
    onMoved(field.id, updated, () => setLiveVertices(field.vertices));
    setEditingIndex(null);
  };

  const points = liveVertices.map((v) => { const p = toPixel(v); return `${p.x},${p.y}`; }).join(" ");

  return (
    <>
      <polygon
        points={points}
        fill={isSelected ? "rgba(var(--color-secondary-rgb), 0.2)" : dashed ? "none" : "rgba(var(--color-primary-rgb), 0.15)"}
        stroke={isSelected ? "var(--color-secondary)" : dashed ? "var(--color-muted)" : "var(--color-primary)"}
        strokeWidth={isSelected ? 3 : 2}
        strokeDasharray={!isSelected && dashed ? "6 6" : undefined}
        style={{ cursor: allowShapeDrag ? "move" : "pointer" }}
        onMouseDown={handleShapeMouseDown}
        onClick={(e) => e.stopPropagation()}
      />
      {(field.plantPositions || []).map((p, i) => {
        const point = toPixel({ x: p.x + plantOffset.dx, y: p.y + plantOffset.dy });
        return <circle key={i} cx={point.x} cy={point.y} r={2} fill="var(--color-primary)" style={{ pointerEvents: "none" }} />;
      })}
      {isSelected &&
        liveVertices.map((v, i) => {
          const p = toPixel(v);
          return (
            <circle
              key={`vertex-${i}`}
              cx={p.x}
              cy={p.y}
              r={5}
              fill="#fff"
              stroke="var(--color-primary)"
              strokeWidth={2}
              style={{ cursor: "pointer" }}
              onMouseDown={handleVertexMouseDown(i)}
              onClick={(e) => e.stopPropagation()}
            />
          );
        })}
      {isSelected &&
        liveVertices.map((a, i) => {
          const targetIndex = (i + 1) % liveVertices.length;
          const b = liveVertices[targetIndex];
          const pa = toPixel(a);
          const pb = toPixel(b);
          return (
            <text
              key={`edge-${i}`}
              x={(pa.x + pb.x) / 2}
              y={(pa.y + pb.y) / 2 - 6}
              fontSize={11}
              fill="var(--color-text-primary)"
              textAnchor="middle"
              style={{ cursor: "pointer", userSelect: "none" }}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                startEditSegment(i);
              }}
            >
              {distance(a, b).toFixed(2)}m
            </text>
          );
        })}
      {editingIndex !== null &&
        (() => {
          const a = liveVertices[editingIndex];
          const b = liveVertices[(editingIndex + 1) % liveVertices.length];
          const pa = toPixel(a);
          const pb = toPixel(b);
          const midX = (pa.x + pb.x) / 2;
          const midY = (pa.y + pb.y) / 2;
          return (
            <foreignObject x={midX - 50} y={midY - 36} width={100} height={40}>
              <TextField
                autoFocus
                size="small"
                type="number"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={commitEditSegment}
                onKeyDown={(e) => e.key === "Enter" && commitEditSegment()}
                sx={{ width: 100, bgcolor: "background.paper" }}
              />
            </foreignObject>
          );
        })()}
    </>
  );
}

// A small field's sub-fields all share the parent's own local coordinate
// space, so - unlike the map version - every shape (including the one
// currently being drawn) can live in one shared SVG with no lat/lng
// conversion at all. Drawing a new sub-field happens right here, on top of
// the existing ones, the same way ManageSubFieldsMap draws directly onto
// the same map that already shows its siblings - so the free space (and
// what's already been claimed) is always visible while placing corners.
function SubFieldsOverview({
  parentField,
  subFields,
  selectedId,
  onSelect,
  onMoved,
  isEditingBoundary,
  onMovedBoundary,
  isDrawing,
  drawVertices,
  isDrawClosed,
  onDrawClick,
  onDrawVertexDrag,
  drawEditingIndex,
  drawEditValue,
  onDrawEditValueChange,
  onStartDrawEditSegment,
  onCommitDrawEditSegment,
}) {
  const xs = parentField.vertices.map((v) => v.x);
  const ys = parentField.vertices.map((v) => v.y);
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
  const toPixel = (v) => ({ x: toX(v.x), y: toY(v.y) });
  const toLocal = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - PREVIEW_PADDING) / scale + minX,
      y: (e.clientY - rect.top - PREVIEW_PADDING) / scale + minY,
    };
  };

  const handleSvgClick = (e) => {
    if (isDrawing && !isDrawClosed) {
      onDrawClick(toLocal(e));
    }
  };

  const handleDrawVertexMouseDown = (index) => (e) => {
    e.stopPropagation();
    const start = { x: e.clientX, y: e.clientY };
    const original = drawVertices[index];

    const handleMouseMove = (moveEvt) => {
      const dx = (moveEvt.clientX - start.x) / scale;
      const dy = (moveEvt.clientY - start.y) / scale;
      onDrawVertexDrag(index, { x: original.x + dx, y: original.y + dy });
    };
    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <svg
      width={PREVIEW_WIDTH}
      height={PREVIEW_HEIGHT}
      onClick={handleSvgClick}
      style={{ cursor: isDrawing && !isDrawClosed ? "crosshair" : "default" }}
    >
      <DraggableSubFieldShape
        field={{ id: parentField.id, vertices: parentField.vertices, plantPositions: [] }}
        isSelected={isEditingBoundary}
        onSelect={() => {}}
        onMoved={onMovedBoundary}
        toPixel={toPixel}
        scale={scale}
        allowShapeDrag={false}
        dashed
      />
      {subFields.map((f) => (
        <DraggableSubFieldShape
          key={f.id}
          field={f}
          isSelected={f.id === selectedId}
          onSelect={onSelect}
          onMoved={onMoved}
          toPixel={toPixel}
          scale={scale}
        />
      ))}
      {isDrawing && drawVertices.length > 0 && (
        isDrawClosed ? (
          <polygon
            points={drawVertices.map((v) => { const p = toPixel(v); return `${p.x},${p.y}`; }).join(" ")}
            fill="rgba(var(--color-primary-rgb), 0.15)"
            stroke="var(--color-primary)"
            strokeWidth={2}
          />
        ) : (
          <polyline
            points={drawVertices.map((v) => { const p = toPixel(v); return `${p.x},${p.y}`; }).join(" ")}
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth={2}
          />
        )
      )}
      {isDrawing &&
        drawVertices.map((a, i) => {
          if (!isDrawClosed && i === drawVertices.length - 1) return null;
          const targetIndex = (i + 1) % drawVertices.length;
          const b = drawVertices[targetIndex];
          const pa = toPixel(a);
          const pb = toPixel(b);
          return (
            <text
              key={`draw-edge-${i}`}
              x={(pa.x + pb.x) / 2}
              y={(pa.y + pb.y) / 2 - 6}
              fontSize={11}
              fill="var(--color-text-primary)"
              textAnchor="middle"
              style={{ cursor: "pointer", userSelect: "none" }}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onStartDrawEditSegment(i);
              }}
            >
              {distance(a, b).toFixed(2)}m
            </text>
          );
        })}
      {isDrawing &&
        drawVertices.map((v, i) => {
          const p = toPixel(v);
          return (
            <circle
              key={`draw-vertex-${i}`}
              cx={p.x}
              cy={p.y}
              r={5}
              fill="#fff"
              stroke="var(--color-primary)"
              strokeWidth={2}
              style={{ cursor: "grab" }}
              onMouseDown={handleDrawVertexMouseDown(i)}
              onClick={(e) => e.stopPropagation()}
            />
          );
        })}
      {isDrawing &&
        drawEditingIndex !== null &&
        (() => {
          const a = drawVertices[drawEditingIndex];
          const b = drawVertices[(drawEditingIndex + 1) % drawVertices.length];
          const pa = toPixel(a);
          const pb = toPixel(b);
          const midX = (pa.x + pb.x) / 2;
          const midY = (pa.y + pb.y) / 2;
          return (
            <foreignObject x={midX - 50} y={midY - 36} width={100} height={40}>
              <TextField
                autoFocus
                size="small"
                type="number"
                value={drawEditValue}
                onChange={(e) => onDrawEditValueChange(e.target.value)}
                onBlur={onCommitDrawEditSegment}
                onKeyDown={(e) => e.key === "Enter" && onCommitDrawEditSegment()}
                sx={{ width: 100, bgcolor: "background.paper" }}
              />
            </foreignObject>
          );
        })()}
    </svg>
  );
}

// Map-less sibling of ManageSubFieldsMap, porting its live drag/reshape
// model onto plain SVG since a Small Field's sub-fields (and the field's own
// outer boundary) already share one local-meter coordinate space with no
// lat/lng conversion needed.
function ManageSubFieldsPanel({
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
  const [isEditingBoundary, setIsEditingBoundary] = useState(false);
  const [clipboard, setClipboard] = useState(null);
  const [drawVertices, setDrawVertices] = useState([]);
  const [isDrawClosed, setIsDrawClosed] = useState(false);
  const [drawEditingIndex, setDrawEditingIndex] = useState(null);
  const [drawEditValue, setDrawEditValue] = useState("");
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
    setIsEditingBoundary(false);
    setDrawVertices([]);
    setIsDrawClosed(false);
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
      setActiveEditTab(status === "planning" ? 0 : 1);
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
    }
  };

  const handleCopy = (field) => {
    setClipboard({
      name: field.name,
      variety: field.variety,
      sowingStructure: field.sowingStructure,
      plantSpacing: field.plantSpacing,
      rowSpacing: field.rowSpacing,
      vertices: field.vertices,
    });
  };

  const handlePaste = async () => {
    if (!clipboard) return;

    // Pasted directly on top of the source shape - see ManageSubFieldsMap.jsx's
    // handlePaste for why: an offset guess routinely landed outside the
    // parent boundary, while stacking it exactly on the original is always
    // valid (identical to a shape that already passed the check), and it's
    // immediately draggable off to one side.
    setIsPasting(true);
    const created = await onCreate({
      name: `${clipboard.name} copy`,
      variety: clipboard.variety,
      shapeType: "polygon",
      parentFieldId: parentField.id,
      vertices: clipboard.vertices,
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

  const handleMoved = async (fieldId, vertices, resetOnFailure) => {
    setIsSavingSelected(true);
    const updated = await onUpdateGeometry(fieldId, { vertices });
    setIsSavingSelected(false);
    if (!updated) {
      resetOnFailure();
      setError("That position is outside the parent field's boundary.");
    } else {
      setError("");
    }
  };

  const handleMovedBoundary = async (fieldId, vertices, resetOnFailure) => {
    setIsSavingSelected(true);
    const updated = await onUpdateGeometry(fieldId, { vertices });
    setIsSavingSelected(false);
    if (!updated) {
      resetOnFailure();
      setError("Resizing would leave an existing sub-field outside this boundary.");
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

  // Drawing a new sub-field happens live on the same SubFieldsOverview SVG
  // that already shows the parent boundary and its existing siblings - see
  // ManageSubFieldsMap.jsx's identical draw-on-the-map handlers, which this
  // mirrors so free space (and what's already claimed) is visible the whole
  // time, not just guessed at in a separate blind canvas.
  const handleDrawClick = (point) => {
    if (isDrawClosed) return;
    setDrawVertices((prev) => [...prev, point]);
  };

  const handleDrawVertexDrag = (index, point) => {
    setDrawVertices((prev) => prev.map((v, i) => (i === index ? point : v)));
  };

  const handleDrawUndo = () => setDrawVertices((prev) => prev.slice(0, -1));

  const handleDrawClear = () => {
    setDrawVertices([]);
    setIsDrawClosed(false);
  };

  const handleDrawClose = () => {
    if (drawVertices.length < 3) return;
    setIsDrawClosed(true);
  };

  const handleDrawEditAgain = () => setIsDrawClosed(false);

  const startDrawEditSegment = (index) => {
    const a = drawVertices[index];
    const b = drawVertices[(index + 1) % drawVertices.length];
    setDrawEditingIndex(index);
    setDrawEditValue(distance(a, b).toFixed(2));
  };

  const commitDrawEditSegment = () => {
    const newLength = Number(drawEditValue);
    if (drawEditingIndex === null || !(newLength > 0)) {
      setDrawEditingIndex(null);
      return;
    }
    const a = drawVertices[drawEditingIndex];
    const bIndex = (drawEditingIndex + 1) % drawVertices.length;
    const b = drawVertices[bIndex];
    const currentLength = distance(a, b) || 1;
    const dx = ((b.x - a.x) / currentLength) * newLength;
    const dy = ((b.y - a.y) / currentLength) * newLength;
    setDrawVertices((prev) => {
      const updated = [...prev];
      updated[bIndex] = { x: a.x + dx, y: a.y + dy };
      return updated;
    });
    setDrawEditingIndex(null);
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
      vertices: drawVertices,
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

  const selectedField = subFields.find((f) => f.id === selectedId);

  return (
    <Box sx={{ flex: 1, minHeight: 0, display: "flex", overflow: "hidden" }}>
      <Box
        sx={{
          width: 460,
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
          Drag a sub-field to reposition it, use the icons below to copy or delete one, or draw a new one
          on the boundary shown on the right.
        </Typography>

        <Box>
          {isEditingBoundary ? (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Drag a corner or click an edge's length to resize the outer boundary. Existing sub-fields
                must stay inside it.
              </Typography>
              <Button size="small" variant="contained" onClick={() => setIsEditingBoundary(false)} fullWidth>
                Done editing boundary
              </Button>
            </>
          ) : (
            <Button
              size="small"
              variant="outlined"
              fullWidth
              onClick={() => {
                setIsEditingBoundary(true);
                setSelectedId(null);
                setDrawVertices([]);
                setIsDrawClosed(false);
              }}
            >
              Edit outer boundary shape
            </Button>
          )}
        </Box>

        <Divider />

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
                        {deletingFieldId === f.id ? <InlineSpinner size={16} /> : <DeleteIcon fontSize="small" color="error" />}
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
              The copy lands on top of the original - drag it to reposition it.
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
            <Tab label="Basics" />
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
              <InputLabel id="small-subfield-variety-label">Vegetable variety</InputLabel>
              <Select
                labelId="small-subfield-variety-label"
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
            {!selectedId && (
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Click on the boundary preview to place the new sub-field's corners, then Close Shape.
                </Typography>
                <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
                  <Button size="small" onClick={handleDrawUndo} disabled={drawVertices.length === 0 || isDrawClosed}>
                    Undo point
                  </Button>
                  <Button size="small" onClick={handleDrawClear}>
                    Clear
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={handleDrawClose}
                    disabled={drawVertices.length < 3 || isDrawClosed}
                  >
                    Close Shape
                  </Button>
                  {isDrawClosed && (
                    <Button size="small" onClick={handleDrawEditAgain}>
                      Edit again
                    </Button>
                  )}
                </Box>
              </Box>
            )}
          </>
        )}

        {selectedId && activeEditTab === 1 && (
          <>
            <FormControl fullWidth>
              <InputLabel id="small-subfield-status-label">Status</InputLabel>
              <Select
                labelId="small-subfield-status-label"
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

      <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        <Box sx={{ flex: 1, minHeight: 0, display: "flex", alignItems: "flex-start", justifyContent: "center", p: 3, overflow: "auto" }}>
          <SubFieldsOverview
            parentField={parentField}
            subFields={subFields}
            selectedId={selectedId}
            onSelect={selectField}
            onMoved={handleMoved}
            isEditingBoundary={isEditingBoundary}
            onMovedBoundary={handleMovedBoundary}
            isDrawing={!selectedId && !isEditingBoundary}
            drawVertices={drawVertices}
            isDrawClosed={isDrawClosed}
            onDrawClick={handleDrawClick}
            onDrawVertexDrag={handleDrawVertexDrag}
            drawEditingIndex={drawEditingIndex}
            drawEditValue={drawEditValue}
            onDrawEditValueChange={setDrawEditValue}
            onStartDrawEditSegment={startDrawEditSegment}
            onCommitDrawEditSegment={commitDrawEditSegment}
          />
        </Box>
        {selectedId && activeEditTab === 1 && (
          <Box sx={{ borderTop: "1px solid", borderColor: "divider", overflowY: "auto", maxHeight: "40%" }}>
            <FieldTimeline
              status={selectedField?.status}
              sowingDate={selectedField?.sowingDate}
              harvestDate={selectedField?.harvestDate}
              variety={selectedField?.variety}
              areaM2={selectedField?.area}
              totalCapacity={selectedField?.totalCapacity}
              varieties={varieties}
            />
          </Box>
        )}
        {selectedId && activeEditTab === 2 && (
          <Box sx={{ borderTop: "1px solid", borderColor: "divider", overflowY: "auto", maxHeight: "40%" }}>
            <FieldLaborTab
              fieldId={selectedId}
              workers={workers}
              onGetWorkLogs={onGetWorkLogs}
              onCreateWorkLog={onCreateWorkLog}
              onDeleteWorkLog={onDeleteWorkLog}
            />
          </Box>
        )}
      </Box>
    </Box>
  );
}

export default ManageSubFieldsPanel;
