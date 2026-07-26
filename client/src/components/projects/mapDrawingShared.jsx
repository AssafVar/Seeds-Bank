import { useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import L from "leaflet";
import { LayersControl, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";

export const DEFAULT_CENTER = { lat: 20, lng: 0 };
export const DEFAULT_ZOOM = 2;
export const SEARCH_ZOOM = 13;
const EARTH_RADIUS_M = 6371000;

export function boundsOf(points) {
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  return [
    [Math.min(...lats), Math.min(...lngs)],
    [Math.max(...lats), Math.max(...lngs)],
  ];
}

// Great-circle distance - the vertices are real GPS coordinates, so plain
// Euclidean distance on lat/lng would be wrong at any real-world scale.
export function distanceMeters(a, b) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

export function formatDistance(meters) {
  return meters >= 1000 ? `${(meters / 1000).toFixed(2)}km` : `${meters.toFixed(1)}m`;
}

// Returns the point reached by walking `meters` from `a` towards `b`,
// keeping a->b's direction fixed - i.e. "what does b become if this edge
// is exactly this long". Uses the same flat-earth, latitude-scaled-longitude
// approximation as the rest of this file (see localToLatLng); accurate
// enough at field scale and consistent with how the server projects too.
export function pointAtDistanceAlong(a, b, meters) {
  const latPerMeter = 180 / (Math.PI * EARTH_RADIUS_M);
  const lngPerMeter = 180 / (Math.PI * EARTH_RADIUS_M * Math.cos((a.lat * Math.PI) / 180));
  const dx = (b.lng - a.lng) / lngPerMeter;
  const dy = (b.lat - a.lat) / latPerMeter;
  const currentLength = Math.hypot(dx, dy);
  if (currentLength === 0) {
    return { ...b };
  }
  const ux = dx / currentLength;
  const uy = dy / currentLength;
  return {
    lat: a.lat + uy * meters * latPerMeter,
    lng: a.lng + ux * meters * lngPerMeter,
  };
}

// Local xy (meters) -> lat/lng, inverting the server's equirectangular
// tangent-plane projection (GeoMath.Project). The projection's origin isn't
// exposed by the API, so it's backed out here from one known vertex/geoVertex
// pair - `vertices[i]` and `geoVertices[i]` are guaranteed to be the same
// boundary point in the same order, since the server derived one from the
// other.
export function localToLatLng(vertices, geoVertices) {
  if (!vertices?.length || !geoVertices?.length) {
    return () => null;
  }
  const v0 = vertices[0];
  const g0 = geoVertices[0];
  const latPerMeter = 180 / (Math.PI * EARTH_RADIUS_M);
  const originLat = g0.lat - v0.y * latPerMeter;
  const lngPerMeter = 180 / (Math.PI * EARTH_RADIUS_M * Math.cos((originLat * Math.PI) / 180));
  const originLng = g0.lng - v0.x * lngPerMeter;

  return (point) => ({
    lat: originLat + point.y * latPerMeter,
    lng: originLng + point.x * lngPerMeter,
  });
}

export const vertexIcon = L.divIcon({
  className: "field-map-vertex-icon",
  html: '<div style="width:14px;height:14px;border-radius:50%;background:var(--color-primary);border:2px solid #fff;box-shadow:0 0 2px rgba(0,0,0,0.5);cursor:grab;"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

export function labelIcon(text) {
  return L.divIcon({
    className: "field-map-segment-label",
    html: `<div style="position:relative;left:-50%;top:-50%;background:rgba(255,255,255,0.9);border:1px solid var(--color-muted);border-radius:4px;padding:1px 5px;font-size:11px;color:var(--color-text-primary);white-space:nowrap;">${text}</div>`,
    iconSize: [0, 0],
  });
}

// A segment's distance label, clickable to type an exact edge length instead
// of eyeballing it by dragging. Applying it moves `b` to match, keeping the
// a->b direction fixed (see pointAtDistanceAlong) - the caller supplies
// which vertex `b` actually is via onApply.
export function SegmentLengthLabel({ a, b, onApply, suppressClickRef }) {
  const meters = distanceMeters(a, b);
  const midpoint = { lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 };
  const [value, setValue] = useState(() => meters.toFixed(1));

  useEffect(() => {
    setValue(meters.toFixed(1));
  }, [meters]);

  const handleMarkerClick = () => {
    // Opening the popup is itself a map click, which the draw-boundary
    // ClickCapture would otherwise mistake for a new vertex.
    if (suppressClickRef) {
      suppressClickRef.current = true;
      setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    }
  };

  const handleApply = () => {
    const parsed = Number(value);
    if (parsed > 0) {
      onApply(parsed);
    }
  };

  return (
    <Marker
      position={[midpoint.lat, midpoint.lng]}
      icon={labelIcon(formatDistance(meters))}
      eventHandlers={{ click: handleMarkerClick }}
    >
      {/* No close button - Leaflet already closes an open popup automatically
          when the user clicks anywhere else on the map. */}
      <Popup closeButton={false}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 150 }}>
          <Typography variant="caption">Edge length (m)</Typography>
          <TextField
            size="small"
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleApply();
            }}
            inputProps={{ step: 0.1, min: 0.1 }}
          />
          <Button size="small" variant="contained" onClick={handleApply}>
            Apply
          </Button>
        </Box>
      </Popup>
    </Marker>
  );
}

// react-leaflet's MapContainer only honors `center`/`zoom` on first mount, so
// recentering later (city search, or fitting a boundary) has to go through
// the map instance directly.
export function MapView({ center, zoom, fitTo }) {
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

// A base-layer switcher (top-right control) offering a few free, no-API-key
// tile sources - street, topographic, and satellite - so users can pick
// whichever reads the field's terrain best while drawing/reviewing shapes.
export function MapBaseLayers() {
  return (
    <LayersControl position="topright">
      <LayersControl.BaseLayer checked name="Street">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
      </LayersControl.BaseLayer>
      <LayersControl.BaseLayer name="Topographic">
        <TileLayer
          attribution='Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, SRTM | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
          url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
          maxZoom={17}
        />
      </LayersControl.BaseLayer>
      <LayersControl.BaseLayer name="Satellite">
        <TileLayer
          attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        />
      </LayersControl.BaseLayer>
    </LayersControl>
  );
}

export function ClickCapture({ disabled, onClick }) {
  const suppressNextClickRef = useRef(false);
  useMapEvents({
    // Leaflet closes an open popup by firing 'preclick' (and, as part of
    // that, 'popupclose') before the regular 'click' event for the same
    // user click - see leaflet-src.js _fireDOMEvent. So a click that lands
    // outside an open popup to dismiss it reaches here too; without this,
    // that same click would also register as a new boundary point.
    popupclose() {
      suppressNextClickRef.current = true;
      setTimeout(() => {
        suppressNextClickRef.current = false;
      }, 0);
    },
    click(e) {
      if (!disabled && !suppressNextClickRef.current) {
        onClick({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    },
  });
  return null;
}
