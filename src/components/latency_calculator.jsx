import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function LatencyCalculator() {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [distance, setDistance] = useState({ km: "", miles: "" });
  const [oneWayLatency, setOneWayLatency] = useState(0);
  const [roundTripLatency, setRoundTripLatency] = useState(0);
  const [error, setError] = useState(null);

  function getCoordinates(address, callback) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;

    fetch(url)
      .then((response) => response.json())
      .then((data) => {
        if (data && data.length > 0) {
          const location = data[0];
          callback(null, { lat: parseFloat(location.lat), lon: parseFloat(location.lon) });
        } else {
          callback(new Error("Address not found"), null);
        }
      })
      .catch((error) => callback(error, null));
  }

  const calculateLatency = () => {
    if (!origin || !destination) {
      setError("Both origin and destination must be provided.");
      return;
    }
    setError(null);

    getCoordinates(origin, (originError, originCoords) => {
      if (originError) {
        setError(`Error fetching origin coordinates: ${originError.message}`);
        return;
      }

      getCoordinates(destination, (destinationError, destinationCoords) => {
        if (destinationError) {
          setError(`Error fetching destination coordinates: ${destinationError.message}`);
          return;
        }

        // Haversine formula calculation
        const R = 6371; // Radius of the Earth in km
        const φ1 = (originCoords.lat * Math.PI) / 180;
        const φ2 = (destinationCoords.lat * Math.PI) / 180;
        const Δφ = ((destinationCoords.lat - originCoords.lat) * Math.PI) / 180;
        const Δλ = ((destinationCoords.lon - originCoords.lon) * Math.PI) / 180;

        const a =
          Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
          Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distanceKm = R * c;
        const distanceMiles = distanceKm * 0.621371;

        // Latency calculation
        const oneWayLatencyMs = (distanceKm / 200000) * 1000; // Speed of light in fiber = 200,000 km/s
        const roundTripLatencyMs = oneWayLatencyMs * 2;

        // Update state with results
        setDistance({
          km: distanceKm.toFixed(2),
          miles: distanceMiles.toFixed(2),
        });
        setOneWayLatency(oneWayLatencyMs.toFixed(2));
        setRoundTripLatency(roundTripLatencyMs.toFixed(2));
      });
    });
  };

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Network Latency Calculator</CardTitle>
        <CardDescription>Enter two addresses or cities to calculate the distance and latency.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="origin">Origin</Label>
          <Input
            id="origin"
            placeholder="Enter origin address or city"
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="destination">Destination</Label>
          <Input
            id="destination"
            placeholder="Enter destination address or city"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
          />
        </div>
        <Button onClick={calculateLatency}>Calculate</Button>
        {error && <p className="text-red-500">{error}</p>}
      </CardContent>
      {distance.km && oneWayLatency && roundTripLatency && (
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold">Results</h3>
            <p>
              The distance between the origin and destination is{" "}
              <span className="font-semibold">{distance.km} km</span>{" "}
              (<span className="font-semibold">{distance.miles} miles</span>).
            </p>
            <p>
              The theoretical one-way latency based on the speed of light in fiber optic cables is{" "}
              <span className="font-semibold">{oneWayLatency} ms</span>.
            </p>
            <p>
              The theoretical round-trip latency based on the speed of light in fiber optic cables is{" "}
              <span className="font-semibold">{roundTripLatency} ms</span>.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">Calculations</h3>
            <p>
              The distance between the origin and destination was calculated using the Haversine formula, which takes
              into account the curvature of the Earth.
            </p>
            <p>
              The one-way latency was calculated by dividing the distance in kilometers by the speed of light in fiber
              optic cables (200,000 km/s) and multiplying by 1000 to get the value in milliseconds.
            </p>
            <p>
              The round-trip latency was calculated by doubling the one-way latency to account for the time it takes for
              the signal to travel from the origin to the destination and back.
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
