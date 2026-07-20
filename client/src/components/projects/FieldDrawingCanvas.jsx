import React, { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

const SCALE = 22; // pixels per meter
const CANVAS_WIDTH = 320;
const CANVAS_HEIGHT = 220;
const GRID_STEP_M = 1;

const distance = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);

function GridLines() {
  const lines = [];
  for (let x = 0; x <= CANVAS_WIDTH / SCALE; x += GRID_STEP_M) {
    lines.push(
      <line key={`v${x}`} x1={x * SCALE} y1={0} x2={x * SCALE} y2={CANVAS_HEIGHT} stroke="#E3D9C4" strokeWidth={1} />
    );
  }
  for (let y = 0; y <= CANVAS_HEIGHT / SCALE; y += GRID_STEP_M) {
    lines.push(
      <line key={`h${y}`} x1={0} y1={y * SCALE} x2={CANVAS_WIDTH} y2={y * SCALE} stroke="#E3D9C4" strokeWidth={1} />
    );
  }
  return <>{lines}</>;
}

function FieldDrawingCanvas({ onFinish }) {
  const [vertices, setVertices] = useState([]);
  const [mousePos, setMousePos] = useState(null);
  const [isClosed, setIsClosed] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editValue, setEditValue] = useState("");

  const toMeters = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / SCALE,
      y: (e.clientY - rect.top) / SCALE,
    };
  };

  const handleClick = (e) => {
    if (isClosed) return;
    setVertices([...vertices, toMeters(e)]);
  };

  const handleMouseMove = (e) => {
    if (isClosed) return;
    setMousePos(toMeters(e));
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

  const points = vertices.map((v) => `${v.x * SCALE},${v.y * SCALE}`).join(" ");

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
      <Box sx={{ position: "relative", border: "1px solid", borderColor: "divider", width: CANVAS_WIDTH }}>
        <svg
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onClick={handleClick}
          onMouseMove={handleMouseMove}
          style={{ display: "block", cursor: isClosed ? "default" : "crosshair" }}
        >
          <GridLines />
          {isClosed ? (
            <polygon points={points} fill="rgba(31,77,58,0.15)" stroke="#1F4D3A" strokeWidth={2} />
          ) : (
            <polyline points={points} fill="none" stroke="#1F4D3A" strokeWidth={2} />
          )}
          {!isClosed && vertices.length > 0 && mousePos && (
            <line
              x1={vertices[vertices.length - 1].x * SCALE}
              y1={vertices[vertices.length - 1].y * SCALE}
              x2={mousePos.x * SCALE}
              y2={mousePos.y * SCALE}
              stroke="#D6543A"
              strokeDasharray="4 4"
              strokeWidth={1.5}
            />
          )}
          {vertices.map((v, i) => (
            <circle key={i} cx={v.x * SCALE} cy={v.y * SCALE} r={4} fill="#1F4D3A" />
          ))}
          {segments.map(([a, b, index]) => {
            const midX = ((a.x + b.x) / 2) * SCALE;
            const midY = ((a.y + b.y) / 2) * SCALE;
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
              x={mousePos.x * SCALE}
              y={mousePos.y * SCALE - 10}
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
