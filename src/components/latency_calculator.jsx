import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { findWonderNetworkLocation } from "@/lib/wondernetwork-locations";
import { ExternalLink } from "lucide-react";

// Dynamically import map components to avoid SSR issues with leaflet
const MapView = dynamic(() => import("./map-view"), { ssr: false });
const PingMapView = dynamic(() => import("./ping-map-view"), { ssr: false });

// Medium types with their propagation speeds
const MEDIUM_TYPES = {
  fiber: { name: "Fiber Optic", speed: 200000, description: "~5ms per 1000km" },
  copper: { name: "Copper Cable", speed: 200000, description: "~5ms per 1000km" },
  wireless: { name: "Wireless 5G", speed: 200000, description: "~5ms per 1000km + processing" },
  satellite: { name: "Satellite (GEO)", speed: 300000, description: "~119ms to orbit" },
};

export function LatencyCalculator() {
  const [activeTab, setActiveTab] = useState("latency");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [distance, setDistance] = useState({ km: "", miles: "" });
  const [oneWayLatency, setOneWayLatency] = useState(0);
  const [roundTripLatency, setRoundTripLatency] = useState(0);
  const [realWorldLatency, setRealWorldLatency] = useState(0);
  const [error, setError] = useState(null);
  const [coordinates, setCoordinates] = useState(null);
  const [mediumType, setMediumType] = useState("fiber");
  const [multiplier, setMultiplier] = useState("2");
  const [wondernetworkLinks, setWondernetworkLinks] = useState({ origin: null, destination: null });

  // Ping calculator state
  const [pingRTT, setPingRTT] = useState("");
  const [estimatedDistance, setEstimatedDistance] = useState(null);
  const [pingError, setPingError] = useState(null);
  const [pingMediumType, setPingMediumType] = useState("fiber");
  const [pingMultiplier, setPingMultiplier] = useState("2");
  const [pingCity, setPingCity] = useState("");
  const [pingCityCoords, setPingCityCoords] = useState(null);
  const [showPingMap, setShowPingMap] = useState(false);
  const [pingCityWonderNetwork, setPingCityWonderNetwork] = useState(null);

  // Data Transfer calculator state
  const [fileSize, setFileSize] = useState("");
  const [fileSizeUnit, setFileSizeUnit] = useState("MB");
  const [bandwidth, setBandwidth] = useState("");
  const [bandwidthUnit, setBandwidthUnit] = useState("Mbps");
  const [transferLatency, setTransferLatency] = useState("");
  const [transferResult, setTransferResult] = useState(null);
  const [transferError, setTransferError] = useState(null);

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

        // Latency calculation based on medium type
        const selectedMedium = MEDIUM_TYPES[mediumType];
        const oneWayLatencyMs = (distanceKm / selectedMedium.speed) * 1000;
        const roundTripLatencyMs = oneWayLatencyMs * 2;

        // Real-world latency with multiplier
        const realWorldMs = roundTripLatencyMs * parseFloat(multiplier);

        // Update state with results
        setDistance({
          km: distanceKm.toFixed(2),
          miles: distanceMiles.toFixed(2),
        });
        setOneWayLatency(oneWayLatencyMs.toFixed(2));
        setRoundTripLatency(roundTripLatencyMs.toFixed(2));
        setRealWorldLatency(realWorldMs.toFixed(2));
        setCoordinates({
          origin: originCoords,
          destination: destinationCoords,
        });

        // Check for WonderNetwork locations
        const originWN = findWonderNetworkLocation(origin);
        const destinationWN = findWonderNetworkLocation(destination);
        setWondernetworkLinks({
          origin: originWN,
          destination: destinationWN
        });
      });
    });
  };

  // Helper function to get latency quality color
  const getLatencyColor = (ms) => {
    if (ms < 50) return "text-green-600";
    if (ms < 100) return "text-yellow-600";
    if (ms < 200) return "text-orange-600";
    return "text-red-600";
  };

  // Calculate distance from ping RTT
  const calculateDistanceFromPing = () => {
    if (!pingRTT) {
      setPingError("Please enter a ping RTT value.");
      return;
    }
    setPingError(null);

    const rtt = parseFloat(pingRTT);
    if (isNaN(rtt) || rtt <= 0) {
      setPingError("Please enter a valid positive number.");
      return;
    }

    // Get selected medium's propagation speed
    const selectedMedium = MEDIUM_TYPES[pingMediumType];
    const propagationSpeed = selectedMedium.speed; // km/s
    const realWorldMultiplier = parseFloat(pingMultiplier);

    // RTT is round-trip, so divide by 2 for one-way time
    const oneWayTimeSeconds = (rtt / 1000) / 2;

    // Calculate theoretical distance
    const theoreticalDistanceKm = oneWayTimeSeconds * propagationSpeed;

    // Apply real-world multiplier (divide since distance is less than theoretical suggests)
    const estimatedDistanceKm = theoreticalDistanceKm / realWorldMultiplier;
    const estimatedDistanceMiles = estimatedDistanceKm * 0.621371;

    setEstimatedDistance({
      km: estimatedDistanceKm.toFixed(2),
      miles: estimatedDistanceMiles.toFixed(2),
      theoreticalKm: theoreticalDistanceKm.toFixed(2),
      theoreticalMiles: (theoreticalDistanceKm * 0.621371).toFixed(2)
    });
  };

  // Auto-recalculate distance when multiplier changes
  useEffect(() => {
    if (pingRTT && estimatedDistance) {
      // Recalculate with new multiplier
      const rtt = parseFloat(pingRTT);
      const selectedMedium = MEDIUM_TYPES[pingMediumType];
      const propagationSpeed = selectedMedium.speed;
      const realWorldMultiplier = parseFloat(pingMultiplier);
      const oneWayTimeSeconds = (rtt / 1000) / 2;
      const theoreticalDistanceKm = oneWayTimeSeconds * propagationSpeed;
      const estimatedDistanceKm = theoreticalDistanceKm / realWorldMultiplier;
      const estimatedDistanceMiles = estimatedDistanceKm * 0.621371;

      setEstimatedDistance({
        km: estimatedDistanceKm.toFixed(2),
        miles: estimatedDistanceMiles.toFixed(2),
        theoreticalKm: theoreticalDistanceKm.toFixed(2),
        theoreticalMiles: (theoreticalDistanceKm * 0.621371).toFixed(2)
      });
    }
  }, [pingMultiplier, pingMediumType]);

  // Check if city is in WonderNetwork list
  useEffect(() => {
    if (pingCity) {
      const wnLocation = findWonderNetworkLocation(pingCity);
      setPingCityWonderNetwork(wnLocation);
    } else {
      setPingCityWonderNetwork(null);
    }
  }, [pingCity]);

  // Calculate data transfer time
  const calculateTransferTime = () => {
    if (!fileSize || !bandwidth) {
      setTransferError("Please enter both file size and bandwidth.");
      return;
    }
    setTransferError(null);

    const fileSizeNum = parseFloat(fileSize);
    const bandwidthNum = parseFloat(bandwidth);
    const latencyNum = parseFloat(transferLatency) || 0;

    if (isNaN(fileSizeNum) || fileSizeNum <= 0 || isNaN(bandwidthNum) || bandwidthNum <= 0) {
      setTransferError("Please enter valid positive numbers.");
      return;
    }

    // Convert file size to bytes
    let fileSizeBytes;
    switch (fileSizeUnit) {
      case "KB": fileSizeBytes = fileSizeNum * 1024; break;
      case "MB": fileSizeBytes = fileSizeNum * 1024 * 1024; break;
      case "GB": fileSizeBytes = fileSizeNum * 1024 * 1024 * 1024; break;
      case "TB": fileSizeBytes = fileSizeNum * 1024 * 1024 * 1024 * 1024; break;
      default: fileSizeBytes = fileSizeNum;
    }

    // Convert bandwidth to bits per second
    let bandwidthBps;
    switch (bandwidthUnit) {
      case "Kbps": bandwidthBps = bandwidthNum * 1000; break;
      case "Mbps": bandwidthBps = bandwidthNum * 1000000; break;
      case "Gbps": bandwidthBps = bandwidthNum * 1000000000; break;
      default: bandwidthBps = bandwidthNum;
    }

    // Calculate transfer time
    const fileSizeBits = fileSizeBytes * 8;
    const transferTimeSeconds = fileSizeBits / bandwidthBps;
    const totalTimeSeconds = transferTimeSeconds + (latencyNum / 1000);

    // Format time in human-readable format
    const formatTime = (seconds) => {
      if (seconds < 1) return `${(seconds * 1000).toFixed(2)} ms`;
      if (seconds < 60) return `${seconds.toFixed(2)} seconds`;
      if (seconds < 3600) return `${(seconds / 60).toFixed(2)} minutes`;
      if (seconds < 86400) return `${(seconds / 3600).toFixed(2)} hours`;
      return `${(seconds / 86400).toFixed(2)} days`;
    };

    setTransferResult({
      transferTime: formatTime(transferTimeSeconds),
      totalTime: formatTime(totalTimeSeconds),
      transferTimeSeconds: transferTimeSeconds,
      totalTimeSeconds: totalTimeSeconds,
      latencyImpact: latencyNum > 0 ? `${((latencyNum / 1000 / totalTimeSeconds) * 100).toFixed(2)}%` : "0%",
      throughput: `${((fileSizeBytes / transferTimeSeconds) / (1024 * 1024)).toFixed(2)} MB/s`
    });
  };

  // Auto-update map when city or distance changes
  useEffect(() => {
    if (!pingCity || !estimatedDistance) {
      setShowPingMap(false);
      setPingCityCoords(null);
      return;
    }

    getCoordinates(pingCity, (error, coords) => {
      if (error) {
        setShowPingMap(false);
        setPingCityCoords(null);
        return;
      }
      // Use the user's selected distance estimate based on their multiplier
      const radiusKm = parseFloat(estimatedDistance.km);
      setPingCityCoords({
        lat: coords.lat,
        lon: coords.lon,
        radiusKm: radiusKm
      });
      setShowPingMap(true);
    });
  }, [pingCity, estimatedDistance]);

  return (
    <div className="space-y-6 w-full max-w-4xl">
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab("latency")}
          className={`px-6 py-3 font-semibold text-sm transition-colors ${
            activeTab === "latency"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Network Latency Calculator
        </button>
        <button
          onClick={() => setActiveTab("ping")}
          className={`px-6 py-3 font-semibold text-sm transition-colors ${
            activeTab === "ping"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Ping Distance Calculator
        </button>
        <button
          onClick={() => setActiveTab("transfer")}
          className={`px-6 py-3 font-semibold text-sm transition-colors ${
            activeTab === "transfer"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Data Transfer Calculator
        </button>
      </div>

      {activeTab === "latency" && (
      <>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Network Latency Calculator</CardTitle>
          <CardDescription>Enter two addresses or cities to calculate the distance and latency.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="medium">Medium Type</Label>
              <Select value={mediumType} onValueChange={setMediumType}>
                <SelectTrigger id="medium">
                  <SelectValue placeholder="Select medium type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fiber">Fiber Optic</SelectItem>
                  <SelectItem value="copper">Copper Cable</SelectItem>
                  <SelectItem value="wireless">Wireless 5G</SelectItem>
                  <SelectItem value="satellite">Satellite (GEO)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="multiplier">Real-World Overhead Factor</Label>
              <Select value={multiplier} onValueChange={setMultiplier}>
                <SelectTrigger id="multiplier">
                  <SelectValue placeholder="Select overhead factor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1.25">1.25x - Excellent (80% efficiency)</SelectItem>
                  <SelectItem value="1.5">1.5x - Very Good (67% efficiency)</SelectItem>
                  <SelectItem value="2">2.0x - Typical (50% efficiency)</SelectItem>
                  <SelectItem value="2.5">2.5x - Below Average (40% efficiency)</SelectItem>
                  <SelectItem value="3">3.0x - Poor (33% efficiency)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={calculateLatency} className="w-full">Calculate</Button>
          {error && <p className="text-red-500">{error}</p>}
        </CardContent>

        {/* Map visualization */}
        {coordinates && (
          <CardContent>
            <div className="h-[400px] w-full rounded-lg overflow-hidden">
              <MapView coordinates={coordinates} />
            </div>
          </CardContent>
        )}

        {/* Results section */}
        <CardContent className="space-y-6">
          {distance.km && oneWayLatency && roundTripLatency ? (
            <>
              {/* Key metrics grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Distance</p>
                  <p className="text-2xl font-bold">{distance.km} km</p>
                  <p className="text-sm text-muted-foreground">{distance.miles} miles</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">One-Way Latency</p>
                  <p className="text-2xl font-bold">{oneWayLatency} ms</p>
                  <p className="text-sm text-muted-foreground">Theoretical</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Round-Trip Time (RTT)</p>
                  <p className="text-2xl font-bold">{roundTripLatency} ms</p>
                  <p className="text-sm text-muted-foreground">Theoretical</p>
                </div>
                <div className="p-4 border rounded-lg bg-primary/5">
                  <p className="text-sm text-muted-foreground">Estimated Real-World</p>
                  <p className="text-2xl font-bold text-primary">{realWorldLatency} ms</p>
                  <p className="text-sm text-muted-foreground">{multiplier}x multiplier</p>
                </div>
              </div>

              {/* Enhanced Latency Quality Section */}
              <div className="p-6 border rounded-lg bg-gradient-to-br from-background to-muted/30">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                  <h3 className="text-lg font-semibold">Latency Quality Assessment</h3>
                  <div className={`px-4 py-2 rounded-full font-semibold text-sm inline-flex items-center gap-2 ${
                    realWorldLatency < 50 ? "bg-green-100 text-green-700" :
                    realWorldLatency < 100 ? "bg-yellow-100 text-yellow-700" :
                    realWorldLatency < 200 ? "bg-orange-100 text-orange-700" :
                    "bg-red-100 text-red-700"
                  }`}>
                    <span>{realWorldLatency < 50 ? "⚡" :
                     realWorldLatency < 100 ? "✓" :
                     realWorldLatency < 200 ? "⚠" : "✗"}</span>
                    <span>{realWorldLatency < 50 ? "Excellent" :
                     realWorldLatency < 100 ? "Good" :
                     realWorldLatency < 200 ? "Fair" : "Poor"}</span>
                  </div>
                </div>

                {/* Latency value display */}
                <div className="text-center mb-6">
                  <div className={`inline-block text-5xl font-bold ${
                    realWorldLatency < 50 ? "text-green-600" :
                    realWorldLatency < 100 ? "text-yellow-600" :
                    realWorldLatency < 200 ? "text-orange-600" :
                    "text-red-600"
                  }`}>
                    {realWorldLatency}ms
                  </div>
                </div>

                {/* Use case descriptions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div className={`p-3 rounded-lg transition-all ${
                    realWorldLatency < 50
                      ? "bg-green-100 border-2 border-green-600 shadow-sm"
                      : "bg-muted/50 border border-gray-400"
                  }`}>
                    <div className={`font-semibold mb-1 text-sm ${
                      realWorldLatency < 50 ? "text-green-700" : ""
                    }`}>0-50ms</div>
                    <div className="text-muted-foreground">Gaming, VoIP, Real-time</div>
                  </div>
                  <div className={`p-3 rounded-lg transition-all ${
                    realWorldLatency >= 50 && realWorldLatency < 100
                      ? "bg-yellow-100 border-2 border-yellow-600 shadow-sm"
                      : "bg-muted/50 border border-gray-400"
                  }`}>
                    <div className={`font-semibold mb-1 text-sm ${
                      realWorldLatency >= 50 && realWorldLatency < 100 ? "text-yellow-700" : ""
                    }`}>50-100ms</div>
                    <div className="text-muted-foreground">Video calls, Web browsing</div>
                  </div>
                  <div className={`p-3 rounded-lg transition-all ${
                    realWorldLatency >= 100 && realWorldLatency < 200
                      ? "bg-orange-100 border-2 border-orange-600 shadow-sm"
                      : "bg-muted/50 border border-gray-400"
                  }`}>
                    <div className={`font-semibold mb-1 text-sm ${
                      realWorldLatency >= 100 && realWorldLatency < 200 ? "text-orange-700" : ""
                    }`}>100-200ms</div>
                    <div className="text-muted-foreground">Email, File transfer</div>
                  </div>
                  <div className={`p-3 rounded-lg transition-all ${
                    realWorldLatency >= 200
                      ? "bg-red-100 border-2 border-red-600 shadow-sm"
                      : "bg-muted/50 border border-gray-400"
                  }`}>
                    <div className={`font-semibold mb-1 text-sm ${
                      realWorldLatency >= 200 ? "text-red-700" : ""
                    }`}>200ms+</div>
                    <div className="text-muted-foreground">Noticeable delays</div>
                  </div>
                </div>
              </div>

              {/* Medium type info */}
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">Connection Details</h3>
                <p className="text-sm">
                  <span className="font-semibold">Medium:</span> {MEDIUM_TYPES[mediumType].name} - {MEDIUM_TYPES[mediumType].description}
                </p>
                <p className="text-sm mt-1">
                  <span className="font-semibold">Calculation:</span> Distance calculated using Haversine formula.
                  Latency based on signal propagation at {MEDIUM_TYPES[mediumType].speed.toLocaleString()} km/s.
                </p>
                <p className="text-sm mt-2">
                  <span className="font-semibold">Real-World Factor ({multiplier}x):</span> Accounts for routing overhead, network equipment processing delays,
                  packet queuing, and the fact that signals rarely travel in perfectly straight lines.
                  Real-world measurements typically show 1.5x-3x the theoretical minimum.
                </p>

                {/* WonderNetwork Links */}
                {(wondernetworkLinks.origin || wondernetworkLinks.destination) && (
                  <div className="mt-4 pt-4 border-t-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <ExternalLink className="h-5 w-5 text-primary" />
                      <p className="text-base font-bold text-primary">Real-World Latency Data Available</p>
                    </div>
                    <div className="flex flex-col gap-2.5 pl-7">
                      {wondernetworkLinks.origin && (
                        <a
                          href={`https://wondernetwork.com/pings/${encodeURIComponent(wondernetworkLinks.origin.displayName.toLowerCase())}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline hover:text-primary/80 transition-colors"
                        >
                          <ExternalLink className="h-4 w-4" />
                          View actual latency measurements from {wondernetworkLinks.origin.displayName}
                        </a>
                      )}
                      {wondernetworkLinks.destination && (
                        <a
                          href={`https://wondernetwork.com/pings/${encodeURIComponent(wondernetworkLinks.destination.displayName.toLowerCase())}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline hover:text-primary/80 transition-colors"
                        >
                          <ExternalLink className="h-4 w-4" />
                          View actual latency measurements from {wondernetworkLinks.destination.displayName}
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <p className="text-gray-500 text-center py-8">Enter the addresses and click Calculate to see the results</p>
          )}
        </CardContent>
      </Card>

      {/* Comparison Table */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Latency by Connection Type</CardTitle>
          <CardDescription>Theoretical latency comparison for different network mediums</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Type</th>
                  <th className="text-left py-3 px-4">Propagation Speed</th>
                  <th className="text-left py-3 px-4">Theoretical</th>
                  <th className="text-left py-3 px-4">Typical Real-World</th>
                  <th className="text-left py-3 px-4">Use Case</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b hover:bg-muted/50">
                  <td className="py-3 px-4 font-medium">Fiber Optic</td>
                  <td className="py-3 px-4">~200,000 km/s</td>
                  <td className="py-3 px-4">5ms/1000km</td>
                  <td className="py-3 px-4">10ms/1000km</td>
                  <td className="py-3 px-4">Long-distance, high-bandwidth</td>
                </tr>
                <tr className="border-b hover:bg-muted/50">
                  <td className="py-3 px-4 font-medium">Copper Cable</td>
                  <td className="py-3 px-4">~200,000 km/s</td>
                  <td className="py-3 px-4">5ms/1000km</td>
                  <td className="py-3 px-4">10ms/1000km</td>
                  <td className="py-3 px-4">Short to medium distance</td>
                </tr>
                <tr className="border-b hover:bg-muted/50">
                  <td className="py-3 px-4 font-medium">Wireless 5G</td>
                  <td className="py-3 px-4">~200,000 km/s</td>
                  <td className="py-3 px-4">5ms/1000km</td>
                  <td className="py-3 px-4">10-15ms/1000km</td>
                  <td className="py-3 px-4">Mobile, last-mile connectivity</td>
                </tr>
                <tr className="hover:bg-muted/50">
                  <td className="py-3 px-4 font-medium">Satellite (GEO)</td>
                  <td className="py-3 px-4">~300,000 km/s</td>
                  <td className="py-3 px-4">~119ms (to orbit)</td>
                  <td className="py-3 px-4">~600ms RTT</td>
                  <td className="py-3 px-4">Remote areas, maritime</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            <span className="font-semibold">Note:</span> Real-world latency is typically 1.5-3x theoretical minimums due to routing paths (signals don't travel in straight lines),
            router/switch processing delays, packet queuing, and protocol overhead. Data based on actual measurements from global network monitoring.
          </p>
        </CardContent>
      </Card>

      </>
      )}

      {activeTab === "ping" && (
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Ping Distance Calculator</CardTitle>
            <CardDescription>Enter a ping RTT (Round-Trip Time) to estimate the geographic distance.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pingRTT">Ping RTT (milliseconds)</Label>
                <Input
                  id="pingRTT"
                  type="number"
                  placeholder="Enter ping RTT in ms (e.g., 50)"
                  value={pingRTT}
                  onChange={(e) => setPingRTT(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pingCity">City (optional)</Label>
                <Input
                  id="pingCity"
                  placeholder="Enter city name (e.g., New York)"
                  value={pingCity}
                  onChange={(e) => setPingCity(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pingMedium">Medium Type</Label>
                <Select value={pingMediumType} onValueChange={setPingMediumType}>
                  <SelectTrigger id="pingMedium">
                    <SelectValue placeholder="Select medium type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fiber">Fiber Optic</SelectItem>
                    <SelectItem value="copper">Copper Cable</SelectItem>
                    <SelectItem value="wireless">Wireless 5G</SelectItem>
                    <SelectItem value="satellite">Satellite (GEO)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pingMultiplier">Real-World Overhead Factor</Label>
                <Select value={pingMultiplier} onValueChange={setPingMultiplier}>
                  <SelectTrigger id="pingMultiplier">
                    <SelectValue placeholder="Select overhead factor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1.25">1.25x - Excellent (80% efficiency)</SelectItem>
                    <SelectItem value="1.5">1.5x - Very Good (67% efficiency)</SelectItem>
                    <SelectItem value="2">2.0x - Typical (50% efficiency)</SelectItem>
                    <SelectItem value="2.5">2.5x - Below Average (40% efficiency)</SelectItem>
                    <SelectItem value="3">3.0x - Poor (33% efficiency)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button onClick={calculateDistanceFromPing} className="w-full">Calculate Distance</Button>
            {pingError && <p className="text-red-500">{pingError}</p>}

            {/* Map visualization with radius */}
            {showPingMap && pingCityCoords && (
              <div className="h-[400px] w-full rounded-lg overflow-hidden border-2 border-primary">
                <PingMapView cityCoords={pingCityCoords} />
              </div>
            )}

            {estimatedDistance && (
              <div className="space-y-4 mt-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className={`p-4 rounded-lg ${
                    parseFloat(pingMultiplier) === 3
                      ? "border-4 border-blue-600 bg-red-200"
                      : "border-2 border-red-600 bg-red-200"
                  }`}>
                    <p className="text-xs font-semibold text-red-900 mb-1">Poor (33%)</p>
                    <p className="text-lg font-bold text-red-900">{(parseFloat(estimatedDistance.theoreticalKm) / 3).toFixed(2)} km</p>
                    <p className="text-xs text-red-900">{(parseFloat(estimatedDistance.theoreticalMiles) / 3).toFixed(2)} mi</p>
                  </div>
                  <div className={`p-4 rounded-lg ${
                    parseFloat(pingMultiplier) === 2
                      ? "border-4 border-blue-600 bg-yellow-200"
                      : "border-2 border-yellow-600 bg-yellow-200"
                  }`}>
                    <p className="text-xs font-semibold text-yellow-900 mb-1">Expected (50%)</p>
                    <p className="text-lg font-bold text-yellow-900">{(parseFloat(estimatedDistance.theoreticalKm) / 2).toFixed(2)} km</p>
                    <p className="text-xs text-yellow-900">{(parseFloat(estimatedDistance.theoreticalMiles) / 2).toFixed(2)} mi</p>
                  </div>
                  <div className={`p-4 rounded-lg ${
                    parseFloat(pingMultiplier) === 1.25
                      ? "border-4 border-blue-600 bg-green-200"
                      : "border-2 border-green-600 bg-green-200"
                  }`}>
                    <p className="text-xs font-semibold text-green-900 mb-1">Excellent (80%)</p>
                    <p className="text-lg font-bold text-green-900">{(parseFloat(estimatedDistance.theoreticalKm) / 1.25).toFixed(2)} km</p>
                    <p className="text-xs text-green-900">{(parseFloat(estimatedDistance.theoreticalMiles) / 1.25).toFixed(2)} mi</p>
                  </div>
                  <div className={`p-4 rounded-lg ${
                    parseFloat(pingMultiplier) === 1
                      ? "border-4 border-blue-600 bg-purple-200"
                      : "border-2 border-purple-600 bg-purple-200"
                  }`}>
                    <p className="text-xs font-semibold text-purple-900 mb-1">Theoretical (100%)</p>
                    <p className="text-lg font-bold text-purple-900">{estimatedDistance.theoreticalKm} km</p>
                    <p className="text-xs text-purple-900">{estimatedDistance.theoreticalMiles} mi</p>
                  </div>
                </div>

                <div className="p-6 border-2 border-gray-600 rounded-lg bg-gray-100">
                  <h3 className="font-semibold text-lg mb-3">Distance Range Summary</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold">Based on your ping of {pingRTT}ms:</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-t">
                      <span className="text-sm">Minimum (Poor 33%)</span>
                      <span className="font-bold text-red-700">{(parseFloat(estimatedDistance.theoreticalKm) / 3).toFixed(2)} km ({(parseFloat(estimatedDistance.theoreticalMiles) / 3).toFixed(2)} mi)</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-t">
                      <span className="text-sm">Maximum (Theoretical 100%)</span>
                      <span className="font-bold text-purple-700">{estimatedDistance.theoreticalKm} km ({estimatedDistance.theoreticalMiles} mi)</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-t bg-blue-50 px-2 rounded">
                      <span className="text-sm font-semibold">Your Estimate ({pingMultiplier}x)</span>
                      <span className="font-bold text-blue-700 text-lg">{estimatedDistance.km} km ({estimatedDistance.miles} mi)</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold mb-2">Calculation Details</h3>
                  <p className="text-sm">
                    <span className="font-semibold">Medium:</span> {MEDIUM_TYPES[pingMediumType].name} - {MEDIUM_TYPES[pingMediumType].description}
                  </p>
                  <p className="text-sm mt-1">
                    <span className="font-semibold">Propagation Speed:</span> {MEDIUM_TYPES[pingMediumType].speed.toLocaleString()} km/s
                  </p>
                  <p className="text-sm mt-1">
                    <span className="font-semibold">Real-World Factor ({pingMultiplier}x):</span> Accounts for routing overhead, network equipment processing delays,
                    packet queuing, and the fact that signals rarely travel in perfectly straight lines.
                  </p>
                  <p className="text-sm mt-3 text-muted-foreground">
                    <span className="font-semibold">Note:</span> This is an estimate. Actual distance may vary based on
                    network routing paths, connection type, and regional network infrastructure.
                  </p>

                  {/* WonderNetwork Link for Ping Calculator */}
                  {pingCityWonderNetwork && (
                    <div className="mt-4 pt-4 border-t-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <ExternalLink className="h-5 w-5 text-primary" />
                        <p className="text-base font-bold text-primary">Real-World Ping Statistics Available</p>
                      </div>
                      <a
                        href={`https://wondernetwork.com/pings/${encodeURIComponent(pingCityWonderNetwork.displayName.toLowerCase())}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline hover:text-primary/80 transition-colors ml-7"
                      >
                        <ExternalLink className="h-4 w-4" />
                        View actual ping statistics from {pingCityWonderNetwork.displayName}
                      </a>
                    </div>
                  )}
                </div>

                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-3">Distance Interpretation</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span>0-500 km (0-310 miles)</span>
                      <span className="text-green-600 font-semibold">Local/Regional</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>500-2000 km (310-1240 miles)</span>
                      <span className="text-yellow-600 font-semibold">National</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>2000-8000 km (1240-4970 miles)</span>
                      <span className="text-orange-600 font-semibold">Continental</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>8000+ km (4970+ miles)</span>
                      <span className="text-red-600 font-semibold">Intercontinental</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "transfer" && (
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Data Transfer Calculator</CardTitle>
            <CardDescription>Calculate how long it takes to transfer data based on file size, bandwidth, and latency.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fileSize">File Size</Label>
                <div className="flex gap-2">
                  <Input
                    id="fileSize"
                    type="number"
                    placeholder="Enter file size"
                    value={fileSize}
                    onChange={(e) => setFileSize(e.target.value)}
                    className="flex-1"
                  />
                  <Select value={fileSizeUnit} onValueChange={setFileSizeUnit}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="KB">KB</SelectItem>
                      <SelectItem value="MB">MB</SelectItem>
                      <SelectItem value="GB">GB</SelectItem>
                      <SelectItem value="TB">TB</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bandwidth">Bandwidth</Label>
                <div className="flex gap-2">
                  <Input
                    id="bandwidth"
                    type="number"
                    placeholder="Enter bandwidth"
                    value={bandwidth}
                    onChange={(e) => setBandwidth(e.target.value)}
                    className="flex-1"
                  />
                  <Select value={bandwidthUnit} onValueChange={setBandwidthUnit}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Kbps">Kbps</SelectItem>
                      <SelectItem value="Mbps">Mbps</SelectItem>
                      <SelectItem value="Gbps">Gbps</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="transferLatency">Network Latency (optional)</Label>
              <Input
                id="transferLatency"
                type="number"
                placeholder="Enter latency in ms (e.g., 50)"
                value={transferLatency}
                onChange={(e) => setTransferLatency(e.target.value)}
              />
            </div>

            <Button onClick={calculateTransferTime} className="w-full">Calculate Transfer Time</Button>
            {transferError && <p className="text-red-500">{transferError}</p>}

            {transferResult && (
              <div className="space-y-4 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">Transfer Time (without latency)</p>
                    <p className="text-2xl font-bold">{transferResult.transferTime}</p>
                    <p className="text-sm text-muted-foreground">Pure data transfer</p>
                  </div>
                  <div className="p-4 border rounded-lg bg-primary/5">
                    <p className="text-sm text-muted-foreground">Total Time (with latency)</p>
                    <p className="text-2xl font-bold text-primary">{transferResult.totalTime}</p>
                    <p className="text-sm text-muted-foreground">Including network delays</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">Throughput</p>
                    <p className="text-xl font-bold">{transferResult.throughput}</p>
                    <p className="text-sm text-muted-foreground">Average transfer rate</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">Latency Impact</p>
                    <p className="text-xl font-bold">{transferResult.latencyImpact}</p>
                    <p className="text-sm text-muted-foreground">% of total time</p>
                  </div>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold mb-2">Transfer Breakdown</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>File Size:</span>
                      <span className="font-semibold">{fileSize} {fileSizeUnit}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Bandwidth:</span>
                      <span className="font-semibold">{bandwidth} {bandwidthUnit}</span>
                    </div>
                    {transferLatency && (
                      <div className="flex justify-between">
                        <span>Network Latency:</span>
                        <span className="font-semibold">{transferLatency} ms</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    <span className="font-semibold">Note:</span> This calculation assumes ideal conditions.
                    Real-world transfers may be affected by protocol overhead, packet loss, congestion, and other network factors.
                  </p>
                </div>

                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-3">Common File Sizes</h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 bg-muted rounded">
                      <div className="font-semibold">Photo (JPEG)</div>
                      <div className="text-muted-foreground">2-5 MB</div>
                    </div>
                    <div className="p-2 bg-muted rounded">
                      <div className="font-semibold">Song (MP3)</div>
                      <div className="text-muted-foreground">3-10 MB</div>
                    </div>
                    <div className="p-2 bg-muted rounded">
                      <div className="font-semibold">HD Movie</div>
                      <div className="text-muted-foreground">4-8 GB</div>
                    </div>
                    <div className="p-2 bg-muted rounded">
                      <div className="font-semibold">4K Movie</div>
                      <div className="text-muted-foreground">25-100 GB</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
