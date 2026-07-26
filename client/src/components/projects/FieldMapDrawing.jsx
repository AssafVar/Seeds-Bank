import React, { useMemo, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { InlineSpinner } from "../common/Spinner.jsx";
import { MapContainer, Polygon, Marker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import SearchCities from "../search/SearchCities.jsx";
import { getCoords } from "../../services/serverCalls";
import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  SEARCH_ZOOM,
  vertexIcon,
  pointAtDistanceAlong,
  MapView,
  ClickCapture,
  MapBaseLayers,
  SegmentLengthLabel,
} from "./mapDrawingShared.jsx";

const MIN_MAP_HEIGHT = 240;

// Fills the height of its parent - the caller is expected to give that
// parent a bounded height (e.g. a flex:1 box in a flex column) so the map
// grows/shrinks to whatever space is available instead of forcing the page
// to scroll.
function FieldMapDrawing({ onFinish, parentGeoVertices }) {
  const [vertices, setVertices] = useState([]);
  const [isClosed, setIsClosed] = useState(false);
  const [center, setCenter] = useState(parentGeoVertices?.length ? null : DEFAULT_CENTER);
  const [isLocating, setIsLocating] = useState(false);
  const suppressClickRef = useRef(false);

  const handleClick = (point) => {
    if (suppressClickRef.current) {
      // This click just opened/used a segment-length popup, not a new corner.
      return;
    }
    setVertices((prev) => [...prev, point]);
  };

  // Typing an exact edge length moves `b` along the a->b direction to match -
  // same idea as dragging a corner, just precise instead of eyeballed.
  const handleSegmentLengthChange = (targetIndex, anchor, meters) => {
    const newPoint = pointAtDistanceAlong(anchor, vertices[targetIndex], meters);
    const updated = vertices.map((v, i) => (i === targetIndex ? newPoint : v));
    setVertices(updated);
    if (isClosed) {
      onFinish(updated);
    }
  };

  const handleUndo = () => setVertices((prev) => prev.slice(0, -1));

  // Fires continuously while a corner is being dragged (not just on drop),
  // so the segment length labels track the pointer live instead of jumping
  // to their new value only once the drag ends.
  const handleVertexDrag = (index, latlng) => {
    const point = { lat: latlng.lat, lng: latlng.lng };
    setVertices((prev) => prev.map((v, i) => (i === index ? point : v)));
  };

  const handleVertexDragEnd = (index, latlng) => {
    const updated = vertices.map((v, i) => (i === index ? { lat: latlng.lat, lng: latlng.lng } : v));
    setVertices(updated);
    if (isClosed) {
      onFinish(updated);
    }
  };

  const handleClear = () => {
    setVertices([]);
    setIsClosed(false);
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

  const handleLocationPicked = async (location) => {
    setIsLocating(true);
    const coords = await getCoords(location);
    setIsLocating(false);
    if (coords) {
      setCenter({ lat: Number(coords.lat), lng: Number(coords.lon) });
    }
  };

  const segments = useMemo(() => {
    const list = [];
    for (let i = 0; i < vertices.length - 1; i++) {
      list.push([vertices[i], vertices[i + 1]]);
    }
    if (isClosed && vertices.length >= 3) {
      list.push([vertices[vertices.length - 1], vertices[0]]);
    }
    return list;
  }, [vertices, isClosed]);

  let helperText = "Search a location, then click on the map to place the first corner.";
  if (isClosed) {
    helperText = "Boundary closed. Drag a corner to fine-tune it, or press Edit again to keep drawing.";
  } else if (vertices.length === 1) {
    helperText = "Click to place the next corner, or drag the first one to adjust it.";
  } else if (vertices.length === 2) {
    helperText = "Click to place a third corner — at least 3 points are needed before you can close the shape.";
  } else if (vertices.length >= 3) {
    helperText = "Keep clicking to add corners, drag a corner to adjust it, or press Close Shape to finish.";
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", minHeight: 0, flex: 1 }}>
      {!parentGeoVertices?.length && (
        <Box sx={{ mb: 1, flexShrink: 0, display: "flex", alignItems: "center", gap: 1 }}>
          <SearchCities handleLocation={handleLocationPicked} />
          {isLocating && <InlineSpinner size={20} />}
        </Box>
      )}
      <Box sx={{ border: "1px solid", borderColor: "divider", flex: 1, minHeight: MIN_MAP_HEIGHT }}>
        <MapContainer
          center={[DEFAULT_CENTER.lat, DEFAULT_CENTER.lng]}
          zoom={DEFAULT_ZOOM}
          style={{ height: "100%", width: "100%" }}
        >
          <MapBaseLayers />
          <MapView center={center} zoom={SEARCH_ZOOM} fitTo={parentGeoVertices} />
          <ClickCapture disabled={isClosed} onClick={handleClick} />
          {parentGeoVertices?.length >= 3 && (
            <Polygon
              positions={parentGeoVertices.map((v) => [v.lat, v.lng])}
              pathOptions={{ color: "var(--color-muted)", weight: 2, dashArray: "6 6", fillOpacity: 0 }}
            />
          )}
          {vertices.length >= 2 && (
            <Polygon
              positions={vertices.map((v) => [v.lat, v.lng])}
              pathOptions={{ color: "var(--color-primary)", fillOpacity: isClosed ? 0.15 : 0 }}
            />
          )}
          {segments.map(([a, b], i) => {
            const targetIndex = isClosed && i === segments.length - 1 ? 0 : i + 1;
            return (
              <SegmentLengthLabel
                key={`segment-${i}`}
                a={a}
                b={b}
                suppressClickRef={suppressClickRef}
                onApply={(meters) => handleSegmentLengthChange(targetIndex, a, meters)}
              />
            );
          })}
          {vertices.map((v, i) => (
            <Marker
              key={i}
              position={[v.lat, v.lng]}
              icon={vertexIcon}
              draggable
              eventHandlers={{
                drag: (e) => handleVertexDrag(i, e.target.getLatLng()),
                dragend: (e) => handleVertexDragEnd(i, e.target.getLatLng()),
              }}
            />
          ))}
        </MapContainer>
      </Box>
      <Box sx={{ display: "flex", gap: 1, mt: 1, alignItems: "center", flexWrap: "wrap", flexShrink: 0 }}>
        <Button size="small" onClick={handleUndo} disabled={vertices.length === 0 || isClosed}>
          Undo point
        </Button>
        <Button size="small" onClick={handleClear}>
          Clear
        </Button>
        <Button size="small" variant="contained" onClick={handleCloseShape} disabled={vertices.length < 3 || isClosed}>
          Close Shape
        </Button>
        {isClosed && (
          <Button size="small" onClick={handleEditAgain}>
            Edit again
          </Button>
        )}
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
        {helperText}
      </Typography>
    </Box>
  );
}

export default FieldMapDrawing;
