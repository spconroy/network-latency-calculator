"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Circle, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default marker icons in Next.js
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

function MapUpdater({ center, radiusKm }) {
  const map = useMap();

  useEffect(() => {
    if (center) {
      // Calculate bounds to fit the circle
      const radiusInDegrees = radiusKm / 111; // Rough conversion: 111km per degree
      const bounds = [
        [center[0] - radiusInDegrees, center[1] - radiusInDegrees],
        [center[0] + radiusInDegrees, center[1] + radiusInDegrees]
      ];
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [center, radiusKm, map]);

  return null;
}

export default function PingMapView({ cityCoords }) {
  const center = [cityCoords.lat, cityCoords.lon];
  const radiusMeters = cityCoords.radiusKm * 1000; // Convert km to meters

  return (
    <MapContainer
      center={center}
      zoom={6}
      style={{ height: "100%", width: "100%", zIndex: 0 }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <Marker position={center} />
      <Circle
        center={center}
        radius={radiusMeters}
        pathOptions={{
          color: "blue",
          fillColor: "blue",
          fillOpacity: 0.1,
          weight: 2
        }}
      />
      <MapUpdater center={center} radiusKm={cityCoords.radiusKm} />
    </MapContainer>
  );
}
