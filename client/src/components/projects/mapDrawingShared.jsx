import { useEffect } from "react";
import L from "leaflet";
import { useMap, useMapEvents } from "react-leaflet";

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

export const vertexIcon = L.divIcon({
  className: "field-map-vertex-icon",
  html: '<div style="width:14px;height:14px;border-radius:50%;background:#1F4D3A;border:2px solid #fff;box-shadow:0 0 2px rgba(0,0,0,0.5);cursor:grab;"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

export function labelIcon(text) {
  return L.divIcon({
    className: "field-map-segment-label",
    html: `<div style="position:relative;left:-50%;top:-50%;background:rgba(255,255,255,0.9);border:1px solid #8A7A5C;border-radius:4px;padding:1px 5px;font-size:11px;color:#2B241C;white-space:nowrap;">${text}</div>`,
    iconSize: [0, 0],
  });
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

export function ClickCapture({ disabled, onClick }) {
  useMapEvents({
    click(e) {
      if (!disabled) {
        onClick({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    },
  });
  return null;
}
