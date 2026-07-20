import React, { useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import L from "leaflet";
import { MapContainer, TileLayer, Polygon, Marker, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import SearchCities from "../search/SearchCities.jsx";
import { getCoords } from "../../services/serverCalls";

const MIN_MAP_HEIGHT = 240;
const DEFAULT_CENTER = { lat: 20, lng: 0 };
const DEFAULT_ZOOM = 2;
const SEARCH_ZOOM = 13;
const EARTH_RADIUS_M = 6371000;

function boundsOf(points) {
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  return [
    [Math.min(...lats), Math.min(...lngs)],
    [Math.max(...lats), Math.max(...lngs)],
  ];
}

// Great-circle distance - the vertices are real GPS coordinates, so plain
// Euclidean distance on lat/lng would be wrong at any real-world scale.
function distanceMeters(a, b) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

function formatDistance(meters) {
  return meters >= 1000 ? `${(meters / 1000).toFixed(2)}km` : `${meters.toFixed(1)}m`;
}

const vertexIcon = L.divIcon({
  className: "field-map-vertex-icon",
  html: '<div style="width:14px;height:14px;border-radius:50%;background:#1F4D3A;border:2px solid #fff;box-shadow:0 0 2px rgba(0,0,0,0.5);cursor:grab;"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

function labelIcon(text) {
  return L.divIcon({
    className: "field-map-segment-label",
    html: `<div style="position:relative;left:-50%;top:-50%;background:rgba(255,255,255,0.9);border:1px solid #8A7A5C;border-radius:4px;padding:1px 5px;font-size:11px;color:#2B241C;white-space:nowrap;">${text}</div>`,
    iconSize: [0, 0],
  });
}

// react-leaflet's MapContainer only honors `center`/`zoom` on first mount, so
// recentering later (city search, or fitting the parent boundary) has to go
// through the map instance directly.
function MapView({ center, zoom, fitTo }) {
  const map = useMap();
  useEffect(() => {
    if (fitTo && fitTo.length >= 3) {
      map.fitBounds(boundsOf(fitTo), { padding: [20, 20] });
    } else if (center) {
      map.setView([center.lat, center.lng], zoom ?? map.getZoom());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center, zoom, fitTo]);
  return null;
}

function ClickCapture({ disabled, onClick }) {
  useMapEvents({
    click(e) {
      if (!disabled) {
        onClick({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    },
  });
  return null;
}

// Fills the height of its parent - the caller is expected to give that
// parent a bounded height (e.g. a flex:1 box in a flex column) so the map
// grows/shrinks to whatever space is available instead of forcing the page
// to scroll.
function FieldMapDrawing({ onFinish, parentGeoVertices }) {
  const [vertices, setVertices] = useState([]);
  const [isClosed, setIsClosed] = useState(false);
  const [center, setCenter] = useState(parentGeoVertices?.length ? null : DEFAULT_CENTER);

  const handleClick = (point) => {
    setVertices((prev) => [...prev, point]);
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
    const coords = await getCoords(location);
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
        <Box sx={{ mb: 1, flexShrink: 0 }}>
          <SearchCities handleLocation={handleLocationPicked} />
        </Box>
      )}
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
          <MapView center={center} zoom={SEARCH_ZOOM} fitTo={parentGeoVertices} />
          <ClickCapture disabled={isClosed} onClick={handleClick} />
          {parentGeoVertices?.length >= 3 && (
            <Polygon
              positions={parentGeoVertices.map((v) => [v.lat, v.lng])}
              pathOptions={{ color: "#8A7A5C", weight: 2, dashArray: "6 6", fillOpacity: 0 }}
            />
          )}
          {vertices.length >= 2 && (
            <Polygon
              positions={vertices.map((v) => [v.lat, v.lng])}
              pathOptions={{ color: "#1F4D3A", fillOpacity: isClosed ? 0.15 : 0 }}
            />
          )}
          {segments.map(([a, b], i) => {
            const midpoint = { lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 };
            const text = formatDistance(distanceMeters(a, b));
            return (
              <Marker
                key={`segment-${i}`}
                position={[midpoint.lat, midpoint.lng]}
                icon={labelIcon(text)}
                interactive={false}
                keyboard={false}
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
