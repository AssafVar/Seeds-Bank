import React, { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 280;
const REFERENCE_PADDING = 16;

// A single fixed scale can't serve both a small garden bed (needs precision)
// and a field spanning tens/hundreds of meters (needs the room), so the user
// sets how many meters wide the view should be - only used in freestanding
// mode; referenceVertices mode always auto-fits to the parent's own size.
const DEFAULT_VIEW_WIDTH_M = 80;
const MIN_VIEW_WIDTH_M = 5;
const MAX_VIEW_WIDTH_M = 2000;

// Picks the smallest "nice" grid spacing whose on-screen size is still
// legible (>=20px), so a wide view doesn't draw hundreds of illegible 1m
// lines and a narrow one isn't stuck with a single giant square.
const NICE_GRID_STEPS_M = [0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
const MIN_GRID_STEP_PX = 20;
function pickGridStep(scale) {
  return NICE_GRID_STEPS_M.find((step) => step * scale >= MIN_GRID_STEP_PX) ?? NICE_GRID_STEPS_M[NICE_GRID_STEPS_M.length - 1];
}

const distance = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);

function GridLines({ scale, gridStep }) {
  const lines = [];
  for (let x = 0; x <= CANVAS_WIDTH / scale; x += gridStep) {
    lines.push(
      <line key={`v${x}`} x1={x * scale} y1={0} x2={x * scale} y2={CANVAS_HEIGHT} stroke="#E3D9C4" strokeWidth={1} />
    );
  }
  for (let y = 0; y <= CANVAS_HEIGHT / scale; y += gridStep) {
    lines.push(
      <line key={`h${y}`} x1={0} y1={y * scale} x2={CANVAS_WIDTH} y2={y * scale} stroke="#E3D9C4" strokeWidth={1} />
    );
  }
  return <>{lines}</>;
}

// A "small field"'s sub-field needs to be drawn in the SAME local coordinate
// space as its parent's own stored vertices (there's no shared GPS origin to
// project through, unlike a map-anchored large field's sub-fields) - so when
// referenceVertices is given, the view fits to that boundary and every click
// is converted back through that same fit, rather than through the plain
// SCALE-per-meter grid used for a freestanding shape.
function fitToReference(referenceVertices) {
  if (!referenceVertices?.length) {
    return null;
  }
  const xs = referenceVertices.map((v) => v.x);
  const ys = referenceVertices.map((v) => v.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const shapeWidth = Math.max(...xs) - minX || 1;
  const shapeHeight = Math.max(...ys) - minY || 1;
  const scale = Math.min(
    (CANVAS_WIDTH - REFERENCE_PADDING * 2) / shapeWidth,
    (CANVAS_HEIGHT - REFERENCE_PADDING * 2) / shapeHeight
  );
  return { minX, minY, scale };
}

function FieldDrawingCanvas({ onFinish, referenceVertices }) {
  const [vertices, setVertices] = useState([]);
  const [mousePos, setMousePos] = useState(null);
  const [isClosed, setIsClosed] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [viewWidthInput, setViewWidthInput] = useState(String(DEFAULT_VIEW_WIDTH_M));

  const fit = useMemo(() => fitToReference(referenceVertices), [referenceVertices]);
  const parsedViewWidth = Number(viewWidthInput);
  const viewWidthMeters =
    parsedViewWidth > 0 ? Math.min(MAX_VIEW_WIDTH_M, Math.max(MIN_VIEW_WIDTH_M, parsedViewWidth)) : DEFAULT_VIEW_WIDTH_M;
  const scale = fit?.scale ?? CANVAS_WIDTH / viewWidthMeters;
  const gridStep = pickGridStep(scale);
  const viewHeightMeters = CANVAS_HEIGHT / scale;

  const toPixel = (v) =>
    fit
      ? { x: (v.x - fit.minX) * fit.scale + REFERENCE_PADDING, y: (v.y - fit.minY) * fit.scale + REFERENCE_PADDING }
      : { x: v.x * scale, y: v.y * scale };

  const toLocal = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pixelX = e.clientX - rect.left;
    const pixelY = e.clientY - rect.top;
    if (fit) {
      return { x: (pixelX - REFERENCE_PADDING) / fit.scale + fit.minX, y: (pixelY - REFERENCE_PADDING) / fit.scale + fit.minY };
    }
    return { x: pixelX / scale, y: pixelY / scale };
  };

  const handleClick = (e) => {
    if (isClosed) return;
    setVertices([...vertices, toLocal(e)]);
  };

  const handleMouseMove = (e) => {
    if (isClosed) return;
    setMousePos(toLocal(e));
  };

  const handleUndo = () => {
    setVertices(vertices.slice(0, -1));
  };

  const handleClear = () => {
    setVertices([]);
    setIsClosed(false);
    setEditingIndex(null);
    onFinish(null);
  };

  const handleCloseShape = () => {
    if (vertices.length < 3) return;
    setIsClosed(true);
    onFinish(vertices);
  };

  const handleEditAgain = () => {
    setIsClosed(false);
    onFinish(null);
  };

  const startEditSegment = (index) => {
    const a = vertices[index];
    const b = vertices[(index + 1) % vertices.length];
    setEditingIndex(index);
    setEditValue(distance(a, b).toFixed(2));
  };

  const commitEditSegment = () => {
    const newLength = Number(editValue);
    if (editingIndex === null || !(newLength > 0)) {
      setEditingIndex(null);
      return;
    }
    const a = vertices[editingIndex];
    const bIndex = (editingIndex + 1) % vertices.length;
    const b = vertices[bIndex];
    const currentLength = distance(a, b) || 1;
    const dx = ((b.x - a.x) / currentLength) * newLength;
    const dy = ((b.y - a.y) / currentLength) * newLength;
    const updated = [...vertices];
    updated[bIndex] = { x: a.x + dx, y: a.y + dy };
    setVertices(updated);
    onFinish(isClosed ? updated : null);
    setEditingIndex(null);
  };

  const segments = [];
  for (let i = 0; i < vertices.length - 1; i++) {
    segments.push([vertices[i], vertices[i + 1], i]);
  }
  if (isClosed && vertices.length >= 3) {
    segments.push([vertices[vertices.length - 1], vertices[0], vertices.length - 1]);
  }

  const points = vertices.map((v) => `${toPixel(v).x},${toPixel(v).y}`).join(" ");
  const referencePoints = fit ? referenceVertices.map((v) => `${toPixel(v).x},${toPixel(v).y}`).join(" ") : null;

  let helperText = "Click on the grid to place the first corner.";
  if (isClosed) {
    helperText = "Shape closed. Click a segment's length to fine-tune it, or press Edit again to keep drawing.";
  } else if (vertices.length === 1) {
    helperText = "Click to place the next corner.";
  } else if (vertices.length === 2) {
    helperText = "Click to place a third corner — at least 3 points are needed before you can close the shape.";
  } else if (vertices.length >= 3) {
    helperText = "Keep clicking to add corners, or press Close Shape to finish.";
  }

  return (
    <Box>
      {!fit && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
          <TextField
            label="View width (meters)"
            type="number"
            size="small"
            value={viewWidthInput}
            onChange={(e) => setViewWidthInput(e.target.value)}
            sx={{ width: 160 }}
          />
          <Typography variant="caption" color="text.secondary">
            Shows ~{Math.round(viewWidthMeters)}m × {Math.round(viewHeightMeters)}m
          </Typography>
        </Box>
      )}
      <Box sx={{ position: "relative", border: "1px solid", borderColor: "divider", width: CANVAS_WIDTH }}>
        <svg
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onClick={handleClick}
          onMouseMove={handleMouseMove}
          style={{ display: "block", cursor: isClosed ? "default" : "crosshair" }}
        >
          {fit ? (
            <polygon points={referencePoints} fill="none" stroke="#1F4D3A" strokeDasharray="6 4" strokeWidth={1.5} />
          ) : (
            <GridLines scale={scale} gridStep={gridStep} />
          )}
          {isClosed ? (
            <polygon points={points} fill="rgba(31,77,58,0.15)" stroke="#1F4D3A" strokeWidth={2} />
          ) : (
            <polyline points={points} fill="none" stroke="#1F4D3A" strokeWidth={2} />
          )}
          {!isClosed && vertices.length > 0 && mousePos && (
            <line
              x1={toPixel(vertices[vertices.length - 1]).x}
              y1={toPixel(vertices[vertices.length - 1]).y}
              x2={toPixel(mousePos).x}
              y2={toPixel(mousePos).y}
              stroke="#D6543A"
              strokeDasharray="4 4"
              strokeWidth={1.5}
            />
          )}
          {vertices.map((v, i) => {
            const p = toPixel(v);
            return <circle key={i} cx={p.x} cy={p.y} r={4} fill="#1F4D3A" />;
          })}
          {segments.map(([a, b, index]) => {
            const pa = toPixel(a);
            const pb = toPixel(b);
            const midX = (pa.x + pb.x) / 2;
            const midY = (pa.y + pb.y) / 2;
            return (
              <text
                key={index}
                x={midX}
                y={midY - 6}
                fontSize={12}
                fill="#2B241C"
                textAnchor="middle"
                style={{ cursor: "pointer", userSelect: "none" }}
                onClick={(e) => {
                  e.stopPropagation();
                  startEditSegment(index);
                }}
              >
                {distance(a, b).toFixed(2)}m
              </text>
            );
          })}
          {!isClosed && vertices.length > 0 && mousePos && (
            <text
              x={toPixel(mousePos).x}
              y={toPixel(mousePos).y - 10}
              fontSize={12}
              fill="#D6543A"
            >
              {distance(vertices[vertices.length - 1], mousePos).toFixed(2)}m
            </text>
          )}
        </svg>
        {editingIndex !== null && (
          <TextField
            autoFocus
            size="small"
            type="number"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitEditSegment}
            onKeyDown={(e) => e.key === "Enter" && commitEditSegment()}
            sx={{ position: "absolute", top: 8, right: 8, width: 100, bgcolor: "background.paper" }}
          />
        )}
      </Box>
      <Box sx={{ display: "flex", gap: 1, mt: 1, alignItems: "center", flexWrap: "wrap" }}>
        <Button size="small" onClick={handleUndo} disabled={vertices.length === 0 || isClosed}>
          Undo point
        </Button>
        <Button size="small" onClick={handleClear}>
          Clear
        </Button>
        <Button
          size="small"
          variant="contained"
          onClick={handleCloseShape}
          disabled={vertices.length < 3 || isClosed}
        >
          Close Shape
        </Button>
        {isClosed && (
          <Button size="small" onClick={handleEditAgain}>
            Edit again
          </Button>
        )}
      </Box>
      <Typography variant="caption" color="text.secondary">
        {helperText}
      </Typography>
    </Box>
  );
}

export default FieldDrawingCanvas;
