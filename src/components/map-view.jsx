import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix for default marker icons in Next.js
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Component to update map bounds when coordinates change
function MapUpdater({ lineCoordinates }) {
  const map = useMap();

  useEffect(() => {
    if (lineCoordinates && lineCoordinates.length === 2) {
      map.fitBounds(lineCoordinates, { padding: [50, 50] });
    }
  }, [lineCoordinates, map]);

  return null;
}

export default function MapView({ coordinates }) {
  const { origin, destination } = coordinates;

  // Line coordinates
  const lineCoordinates = [
    [origin.lat, origin.lon],
    [destination.lat, destination.lon],
  ];

  return (
    <MapContainer
      center={[0, 0]}
      zoom={2}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MapUpdater lineCoordinates={lineCoordinates} />

      {/* Origin marker */}
      <Marker position={[origin.lat, origin.lon]}>
        <Popup>Origin</Popup>
      </Marker>

      {/* Destination marker */}
      <Marker position={[destination.lat, destination.lon]}>
        <Popup>Destination</Popup>
      </Marker>

      {/* Line between points */}
      <Polyline
        positions={lineCoordinates}
        color="#3b82f6"
        weight={3}
        opacity={0.7}
      />
    </MapContainer>
  );
}