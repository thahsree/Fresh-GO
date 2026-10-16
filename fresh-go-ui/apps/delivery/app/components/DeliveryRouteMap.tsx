"use client";

import React, { useEffect, useRef, useState } from "react";
import { ExternalLink, Navigation, Compass, RefreshCw } from "lucide-react";

type DeliveryRouteMapProps = {
  pickupAddress: string;
  dropAddress: string;
  hubLat?: number;
  hubLng?: number;
  dropLat?: number;
  dropLng?: number;
  phase: "accepted" | "at-pickup" | "on-the-way";
  eta?: string;
  distance?: string;
};

export function DeliveryRouteMap({
  pickupAddress,
  dropAddress,
  hubLat,
  hubLng,
  dropLat,
  dropLng,
  phase,
  eta: initialEta,
  distance: initialDistance,
}: DeliveryRouteMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const routeLayerRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);

  const [isLeafletLoaded, setIsLeafletLoaded] = useState(false);
  const [riderLocation, setRiderLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distanceKm: number; durationMin: number } | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);

  // Resolved coordinates
  const hubCoords = {
    lat: typeof hubLat === "number" && !isNaN(hubLat) && hubLat !== 0
      ? hubLat
      : (riderLocation?.lat || 0),
    lng: typeof hubLng === "number" && !isNaN(hubLng) && hubLng !== 0
      ? hubLng
      : (riderLocation?.lng || 0),
  };

  const customerCoords = {
    lat: typeof dropLat === "number" && !isNaN(dropLat) && dropLat !== 0
      ? dropLat
      : (hubCoords.lat !== 0 ? hubCoords.lat + 0.008 : 0),
    lng: typeof dropLng === "number" && !isNaN(dropLng) && dropLng !== 0
      ? dropLng
      : (hubCoords.lng !== 0 ? hubCoords.lng + 0.008 : 0),
  };

  // 1. Get Live Rider Location if available
  useEffect(() => {
    if (typeof window !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setRiderLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        (err) => {
          console.warn("[DeliveryRouteMap] Geolocation not available or permission denied:", err.message);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, []);

  // 2. Load Leaflet CDN script & CSS safely
  useEffect(() => {
    if (typeof window === "undefined") return;

    if ((window as any).L) {
      setIsLeafletLoaded(true);
      return;
    }

    // Leaflet CSS
    const existingLink = document.getElementById("leaflet-delivery-css");
    if (!existingLink) {
      const link = document.createElement("link");
      link.id = "leaflet-delivery-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    // Leaflet JS
    const existingScript = document.getElementById("leaflet-delivery-js");
    if (existingScript) {
      existingScript.addEventListener("load", () => setIsLeafletLoaded(true));
      return;
    }

    const script = document.createElement("script");
    script.id = "leaflet-delivery-js";
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;
    script.onload = () => setIsLeafletLoaded(true);
    document.body.appendChild(script);
  }, []);

  // 3. Initialize and Render Real Route on Leaflet Map
  useEffect(() => {
    if (!isLeafletLoaded || !mapContainerRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    // Initialize Map if not already created
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false,
      }).setView([hubCoords.lat, hubCoords.lng], 14);

      // OpenStreetMap Tiles
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map);

      // Zoom control in bottom right
      L.control.zoom({ position: "bottomright" }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear previous layers
    if (markersLayerRef.current) {
      map.removeLayer(markersLayerRef.current);
    }
    if (routeLayerRef.current) {
      map.removeLayer(routeLayerRef.current);
    }

    const markersGroup = L.layerGroup().addTo(map);
    markersLayerRef.current = markersGroup;

    // Custom Icon Creators
    const createMarkerIcon = (bg: string, label: string, iconHtml: string) =>
      L.divIcon({
        className: "custom-delivery-pin",
        html: `
          <div style="
            display: flex;
            align-items: center;
            gap: 5px;
            background: ${bg};
            color: #ffffff;
            padding: 4px 8px;
            border-radius: 999px;
            font-size: 11px;
            font-weight: 800;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            border: 2px solid #ffffff;
            white-space: nowrap;
          ">
            <span>${iconHtml}</span>
            <span>${label}</span>
          </div>
        `,
        iconSize: [80, 28],
        iconAnchor: [40, 14],
      });

    // 1. Hub Marker
    const hubMarker = L.marker([hubCoords.lat, hubCoords.lng], {
      icon: createMarkerIcon("#1F4D46", "Hub Pickup", "🏪"),
    })
      .bindPopup(`<b>FreshGo Hub</b><br/>${pickupAddress}`)
      .addTo(markersGroup);

    // 2. Customer Drop Marker
    const customerMarker = L.marker([customerCoords.lat, customerCoords.lng], {
      icon: createMarkerIcon("#E05A47", "Customer Drop", "📍"),
    })
      .bindPopup(`<b>Delivery Address</b><br/>${dropAddress}`)
      .addTo(markersGroup);

    // 3. Optional Rider Marker
    if (riderLocation) {
      L.marker([riderLocation.lat, riderLocation.lng], {
        icon: createMarkerIcon("#0E8345", "You", "🛵"),
      })
        .bindPopup("<b>Your Live Position</b>")
        .addTo(markersGroup);
    }

    // Determine current navigation segment:
    // If phase === "accepted", route is from Rider/Hub to Hub.
    // If phase === "on-the-way", route is from Hub to Customer.
    const startPoint =
      phase === "accepted" && riderLocation
        ? [riderLocation.lat, riderLocation.lng]
        : [hubCoords.lat, hubCoords.lng];
    const endPoint =
      phase === "on-the-way"
        ? [customerCoords.lat, customerCoords.lng]
        : [hubCoords.lat, hubCoords.lng];

    const osrmOrigin = `${startPoint[1]},${startPoint[0]}`;
    const osrmDest = `${customerCoords.lng},${customerCoords.lat}`;

    // Fit bounds initially so both points are in view
    const bounds = L.latLngBounds([
      [hubCoords.lat, hubCoords.lng],
      [customerCoords.lat, customerCoords.lng],
      ...(riderLocation ? [[riderLocation.lat, riderLocation.lng]] : []),
    ]);
    map.fitBounds(bounds, { padding: [40, 40] });

    // 4. Fetch Real Road Navigation Geometry from OSRM
    setIsLoadingRoute(true);
    fetch(
      `https://router.project-osrm.org/route/v1/driving/${osrmOrigin};${osrmDest}?overview=full&geometries=geojson`
    )
      .then((res) => res.json())
      .then((data) => {
        setIsLoadingRoute(false);
        if (data.code === "Ok" && data.routes?.[0]) {
          const route = data.routes[0];
          const distKm = Math.round((route.distance / 1000) * 10) / 10;
          const durMin = Math.max(5, Math.round(route.duration / 60));
          setRouteInfo({ distanceKm: distKm, durationMin: durMin });

          // Convert GeoJSON coordinates [lng, lat] to Leaflet [lat, lng]
          const latLngs = route.geometry.coordinates.map((coord: [number, number]) => [
            coord[1],
            coord[0],
          ]);

          // Draw Glowing Street Route
          const polyline = L.polyline(latLngs, {
            color: "#0E8345",
            weight: 5,
            opacity: 0.9,
            lineJoin: "round",
          }).addTo(map);

          routeLayerRef.current = polyline;
          map.fitBounds(polyline.getBounds(), { padding: [40, 40] });
        } else {
          // Fallback to straight dashed line connecting points
          const fallbackLine = L.polyline(
            [
              [hubCoords.lat, hubCoords.lng],
              [customerCoords.lat, customerCoords.lng],
            ],
            {
              color: "#0E8345",
              weight: 4,
              dashArray: "6, 8",
              opacity: 0.85,
            }
          ).addTo(map);
          routeLayerRef.current = fallbackLine;
        }
      })
      .catch((err) => {
        setIsLoadingRoute(false);
        console.warn("[DeliveryRouteMap] OSRM routing fallback:", err);
        const fallbackLine = L.polyline(
          [
            [hubCoords.lat, hubCoords.lng],
            [customerCoords.lat, customerCoords.lng],
          ],
          {
            color: "#0E8345",
            weight: 4,
            dashArray: "6, 8",
            opacity: 0.85,
          }
        ).addTo(map);
        routeLayerRef.current = fallbackLine;
      });
  }, [
    isLeafletLoaded,
    hubCoords.lat,
    hubCoords.lng,
    customerCoords.lat,
    customerCoords.lng,
    riderLocation,
    phase,
  ]);

  const targetAddress =
    phase === "on-the-way" ? dropAddress : pickupAddress;
  const targetCoords =
    phase === "on-the-way" ? customerCoords : hubCoords;

  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${hubCoords.lat},${hubCoords.lng}&destination=${customerCoords.lat},${customerCoords.lng}&travelmode=driving`;

  const displayDistance = routeInfo?.distanceKm ? `${routeInfo.distanceKm} km` : initialDistance || "3.5 km";
  const displayEta = routeInfo?.durationMin ? `${routeInfo.durationMin} mins` : initialEta || "15 min";

  return (
    <div style={{ position: "relative", marginBottom: "16px", borderRadius: "16px", overflow: "hidden", border: "1px solid #D8E5DC" }}>
      {/* Live Map Canvas */}
      <div
        ref={mapContainerRef}
        style={{
          width: "100%",
          height: "230px",
          backgroundColor: "#e8efe7",
        }}
      />

      {/* Top Floating Badge: Live Status & Distance */}
      <div
        style={{
          position: "absolute",
          top: "12px",
          left: "12px",
          zIndex: 500,
          display: "flex",
          alignItems: "center",
          gap: "8px",
          backgroundColor: "rgba(255, 255, 255, 0.95)",
          padding: "6px 12px",
          borderRadius: "999px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.12)",
          backdropFilter: "blur(6px)",
        }}
      >
        <span
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            backgroundColor: "#0E8345",
            display: "inline-block",
            boxShadow: "0 0 0 3px rgba(14, 131, 69, 0.2)",
          }}
        />
        <span style={{ fontSize: "11px", fontWeight: "800", color: "#1F4D46" }}>
          Live Route · {displayDistance} ({displayEta})
        </span>
      </div>

      {/* Top Floating Action: Open in Google Maps */}
      <a
        href={googleMapsUrl}
        target="_blank"
        rel="noreferrer"
        style={{
          position: "absolute",
          top: "12px",
          right: "12px",
          zIndex: 500,
          display: "flex",
          alignItems: "center",
          gap: "5px",
          backgroundColor: "#1F4D46",
          color: "#ffffff",
          padding: "6px 12px",
          borderRadius: "999px",
          fontSize: "11px",
          fontWeight: "800",
          textDecoration: "none",
          boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
        }}
      >
        <Navigation size={13} />
        Google Maps
        <ExternalLink size={11} />
      </a>

      {/* Bottom Info Bar: Target Waypoint */}
      <div
        style={{
          position: "absolute",
          bottom: "10px",
          left: "12px",
          right: "12px",
          zIndex: 500,
          backgroundColor: "rgba(255, 255, 255, 0.96)",
          padding: "8px 12px",
          borderRadius: "10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden" }}>
          <Compass size={16} color="#1F4D46" style={{ flexShrink: 0 }} />
          <div style={{ overflow: "hidden" }}>
            <p style={{ margin: 0, fontSize: "10px", fontWeight: "800", color: "#64748B", textTransform: "uppercase" }}>
              {phase === "on-the-way" ? "Drop-off Destination" : "Pickup Location"}
            </p>
            <p style={{ margin: 0, fontSize: "11px", fontWeight: "700", color: "#1E293B", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {targetAddress}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
