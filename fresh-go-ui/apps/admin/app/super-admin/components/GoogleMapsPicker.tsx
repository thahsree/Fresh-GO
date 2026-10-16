"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  MapPin,
  Search,
  ZoomIn,
  ZoomOut,
  Info,
  Loader2,
  Crosshair,
  Sparkles,
} from "lucide-react";

const LOCATIONIQ_KEY = "pk.1714d75230cfe1d776514cf91ec30ae3";
const DEFAULT_LAT = 12.699821;
const DEFAULT_LNG = 74.947729;

type GoogleMapsPickerProps = {
  initialLat?: number;
  initialLng?: number;
  radiusKm?: number;
  onLocationSelect: (lat: number, lng: number, address?: string) => void;
  onRadiusChange?: (radiusKm: number) => void;
};

export function GoogleMapsPicker({
  initialLat,
  initialLng,
  radiusKm = 10,
  onLocationSelect,
  onRadiusChange,
}: GoogleMapsPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [lat, setLat] = useState(() => (initialLat && initialLat !== 0 ? initialLat : DEFAULT_LAT));
  const [lng, setLng] = useState(() => (initialLng && initialLng !== 0 ? initialLng : DEFAULT_LNG));
  const [radius, setRadius] = useState(radiusKm || 10);
  const [addressQuery, setAddressQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const mapInstance = useRef<any>(null);
  const markerInstance = useRef<any>(null);
  const circleInstance = useRef<any>(null);

  // Sync internal coordinates when initial props change
  useEffect(() => {
    if (initialLat && initialLng && initialLat !== 0 && initialLng !== 0) {
      setLat(initialLat);
      setLng(initialLng);
      if (markerInstance.current) {
        markerInstance.current.setLatLng([initialLat, initialLng]);
      }
      if (circleInstance.current) {
        circleInstance.current.setLatLng([initialLat, initialLng]);
      }
      if (mapInstance.current) {
        mapInstance.current.setView([initialLat, initialLng]);
      }
    }
  }, [initialLat, initialLng]);

  useEffect(() => {
    if (radiusKm) {
      setRadius(radiusKm);
      if (circleInstance.current) {
        circleInstance.current.setRadius(radiusKm * 1000);
      }
    }
  }, [radiusKm]);

  // Reverse geocoding helper: 100% Free OpenStreetMap Photon first (NO API key required)
  const reverseGeocode = useCallback(async (targetLat: number, targetLng: number): Promise<string> => {
    // 1. Try Photon (OpenStreetMap) - 100% free, no key required
    try {
      const pRes = await fetch(
        `https://photon.komoot.io/reverse?lat=${targetLat}&lon=${targetLng}`,
        { signal: AbortSignal.timeout(3500) }
      );
      if (pRes.ok) {
        const pData = await pRes.json();
        const feat = pData?.features?.[0]?.properties;
        if (feat) {
          const parts = [feat.name, feat.locality || feat.district, feat.city || feat.county, feat.state, feat.postcode]
            .filter(Boolean);
          if (parts.length > 0) return parts.join(", ");
        }
      }
    } catch {}

    // 2. Fallback to LocationIQ
    try {
      const res = await fetch(
        `https://us1.locationiq.com/v1/reverse?key=${LOCATIONIQ_KEY}&lat=${targetLat}&lon=${targetLng}&format=json`,
        { signal: AbortSignal.timeout(3500) }
      );
      if (res.ok) {
        const data = await res.json();
        return data?.display_name || "";
      }
    } catch {}

    return `Lat: ${targetLat.toFixed(4)}, Lng: ${targetLng.toFixed(4)}`;
  }, []);

  // 1. Purge any lingering Google Maps scripts from DOM and inject Leaflet CDN
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Remove any lingering Google Maps scripts to prevent "API key required" popups
    const oldGoogle = document.getElementById("google-maps-script");
    if (oldGoogle) oldGoogle.remove();
    if ((window as any).google?.maps) {
      try {
        delete (window as any).google.maps;
      } catch {}
    }

    // Inject Leaflet CSS
    if (!document.getElementById("leaflet-cdn-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-cdn-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    // Inject Leaflet JS
    if ((window as any).L) {
      setLeafletLoaded(true);
    } else if (!document.getElementById("leaflet-cdn-js")) {
      const script = document.createElement("script");
      script.id = "leaflet-cdn-js";
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.async = true;
      script.onload = () => setLeafletLoaded(true);
      document.head.appendChild(script);
    } else {
      const existing = document.getElementById("leaflet-cdn-js");
      existing?.addEventListener("load", () => setLeafletLoaded(true));
    }
  }, []);

  // 2. Initialize Leaflet Map (Zero API Key Required)
  useEffect(() => {
    if (!leafletLoaded || !mapContainerRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    // Reset container if already initialized
    if ((mapContainerRef.current as any)._leaflet_id) {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
      delete (mapContainerRef.current as any)._leaflet_id;
    }

    const initialCenter: [number, number] = [lat, lng];

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: 13,
      zoomControl: false,
    });

    // 100% Free Official OpenStreetMap Tiles (Zero watermark, zero API key required)
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    // Custom MapPin Icon
    const customPin = L.divIcon({
      className: "freshgo-hub-pin",
      html: `
        <div style="position: relative; transform: translate(-50%, -100%); display: flex; flex-direction: column; align-items: center; cursor: grab;">
          <div style="background: #E5623E; color: #FFFFFF; width: 38px; height: 38px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(0,0,0,0.35); border: 2.5px solid #FFFFFF;">
            <span style="transform: rotate(45deg); font-size: 18px;">📍</span>
          </div>
          <div style="width: 12px; height: 4px; background: rgba(0,0,0,0.35); border-radius: 50%; margin-top: -2px;"></div>
        </div>
      `,
      iconSize: [38, 42],
      iconAnchor: [19, 42],
    });

    const marker = L.marker(initialCenter, {
      draggable: true,
      icon: customPin,
    }).addTo(map);

    const circle = L.circle(initialCenter, {
      radius: radius * 1000,
      color: "#1F4D46",
      fillColor: "#2E7D5B",
      fillOpacity: 0.22,
      weight: 2.5,
    }).addTo(map);

    // Drag marker event
    marker.on("dragend", async () => {
      const pos = marker.getLatLng();
      const newLat = Number(pos.lat.toFixed(6));
      const newLng = Number(pos.lng.toFixed(6));
      setLat(newLat);
      setLng(newLng);
      circle.setLatLng(pos);
      const address = await reverseGeocode(newLat, newLng);
      onLocationSelect(newLat, newLng, address);
    });

    // Click map event
    map.on("click", async (e: any) => {
      const clicked = e.latlng;
      const newLat = Number(clicked.lat.toFixed(6));
      const newLng = Number(clicked.lng.toFixed(6));
      setLat(newLat);
      setLng(newLng);
      marker.setLatLng(clicked);
      circle.setLatLng(clicked);
      const address = await reverseGeocode(newLat, newLng);
      onLocationSelect(newLat, newLng, address);
    });

    mapInstance.current = map;
    markerInstance.current = marker;
    circleInstance.current = circle;

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [leafletLoaded, reverseGeocode, onLocationSelect]);

  // Handle radius changes
  const handleRadiusChange = (newRadius: number) => {
    setRadius(newRadius);
    if (circleInstance.current) {
      circleInstance.current.setRadius(newRadius * 1000);
    }
    if (onRadiusChange) {
      onRadiusChange(newRadius);
    }
  };

  // Search Address / Geocoding using OpenStreetMap Photon (Zero API Key Required)
  const handleSearchAddress = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!addressQuery.trim()) return;

    setIsSearching(true);
    setStatusMessage(null);
    try {
      // 1. Try free Photon search first (No API key required)
      let foundLat: number | null = null;
      let foundLng: number | null = null;
      let foundName: string | null = null;

      try {
        const pRes = await fetch(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(addressQuery)}&limit=3`,
          { signal: AbortSignal.timeout(5000) }
        );
        if (pRes.ok) {
          const pData = await pRes.json();
          const first = pData?.features?.[0];
          if (first && first.geometry?.coordinates) {
            foundLng = Number(Number(first.geometry.coordinates[0]).toFixed(6));
            foundLat = Number(Number(first.geometry.coordinates[1]).toFixed(6));
            const p = first.properties;
            foundName = [p.name, p.locality || p.district, p.city || p.county, p.state].filter(Boolean).join(", ");
          }
        }
      } catch {}

      // 2. Fallback to LocationIQ if Photon had no match
      if (!foundLat || !foundLng) {
        try {
          const res = await fetch(
            `https://us1.locationiq.com/v1/search?key=${LOCATIONIQ_KEY}&q=${encodeURIComponent(
              addressQuery
            )}&countrycodes=in&format=json`,
            { signal: AbortSignal.timeout(5000) }
          );
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
              foundLat = Number(parseFloat(data[0].lat).toFixed(6));
              foundLng = Number(parseFloat(data[0].lon).toFixed(6));
              foundName = data[0].display_name;
            }
          }
        } catch {}
      }

      if (foundLat && foundLng) {
        setLat(foundLat);
        setLng(foundLng);

        if (mapInstance.current) {
          mapInstance.current.flyTo([foundLat, foundLng], 14, { duration: 1.2 });
        }
        if (markerInstance.current) {
          markerInstance.current.setLatLng([foundLat, foundLng]);
        }
        if (circleInstance.current) {
          circleInstance.current.setLatLng([foundLat, foundLng]);
        }

        onLocationSelect(foundLat, foundLng, foundName || addressQuery);
      } else {
        setStatusMessage("Place not found. You can click anywhere on the map to place the pin directly.");
      }
    } catch (err: any) {
      console.warn("Geocoding failed:", err);
      setStatusMessage("Search offline. Click directly on the map to position the Hub pin.");
    } finally {
      setIsSearching(false);
    }
  };

  // Locate current position with GPS and IP-fallback
  const handleGetCurrentLocation = async () => {
    setIsLocating(true);
    setStatusMessage(null);

    let foundLat: number | null = null;
    let foundLng: number | null = null;

    // 1. Try HTML5 Geolocation API
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 7000,
            maximumAge: 10000,
          });
        });
        foundLat = Number(pos.coords.latitude.toFixed(6));
        foundLng = Number(pos.coords.longitude.toFixed(6));
      } catch (err: any) {
        console.warn("Browser GPS unavailable or blocked, falling back to IP geolocation...", err?.message);
      }
    }

    // 2. Fallback to IP Geolocation if browser GPS is blocked (e.g. non-HTTPS duckdns or permission denied)
    if (!foundLat || !foundLng) {
      try {
        const ipRes = await fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(4000) });
        if (ipRes.ok) {
          const ipData = await ipRes.json();
          if (ipData?.latitude && ipData?.longitude) {
            foundLat = Number(Number(ipData.latitude).toFixed(6));
            foundLng = Number(Number(ipData.longitude).toFixed(6));
          }
        }
      } catch (ipErr) {
        console.warn("IP geolocation fallback failed:", ipErr);
      }
    }

    // 3. Fallback to default Kasaragod Hub coordinates
    if (!foundLat || !foundLng) {
      foundLat = DEFAULT_LAT;
      foundLng = DEFAULT_LNG;
    }

    setLat(foundLat);
    setLng(foundLng);

    if (mapInstance.current) {
      mapInstance.current.flyTo([foundLat, foundLng], 14, { duration: 1.2 });
    }
    if (markerInstance.current) {
      markerInstance.current.setLatLng([foundLat, foundLng]);
    }
    if (circleInstance.current) {
      circleInstance.current.setLatLng([foundLat, foundLng]);
    }

    const address = await reverseGeocode(foundLat, foundLng);
    onLocationSelect(foundLat, foundLng, address);
    setIsLocating(false);
  };

  return (
    <div
      style={{
        display: "grid",
        gap: "12px",
        background: "#F6F2EA",
        borderRadius: "14px",
        padding: "16px",
        border: "1px solid #E3DDCF",
      }}
    >
      {/* Top Search & Locate Toolbar */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: 1, minWidth: "220px", position: "relative" }}>
          <Search
            size={16}
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "#5C6B66",
            }}
          />
          <input
            type="text"
            value={addressQuery}
            onChange={(e) => setAddressQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearchAddress()}
            placeholder="Search city, town, landmark or pin on map..."
            style={{
              width: "100%",
              padding: "9px 12px 9px 36px",
              borderRadius: "8px",
              border: "1px solid #E3DDCF",
              background: "#FFFFFF",
              fontSize: "13px",
              outline: "none",
            }}
          />
        </div>

        <button
          type="button"
          onClick={() => handleSearchAddress()}
          disabled={isSearching}
          style={{
            padding: "9px 14px",
            borderRadius: "8px",
            background: "#1F4D46",
            color: "#FFFFFF",
            fontSize: "12px",
            fontWeight: 700,
            border: "none",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          {isSearching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          {isSearching ? "Searching..." : "Locate Pin"}
        </button>

        <button
          type="button"
          onClick={handleGetCurrentLocation}
          disabled={isLocating}
          title="Use GPS / Device Location"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "9px 12px",
            borderRadius: "8px",
            background: isLocating ? "#C8DFD7" : "#E4ECE9",
            color: "#1F4D46",
            fontSize: "12px",
            fontWeight: 700,
            border: "none",
            cursor: isLocating ? "wait" : "pointer",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          }}
        >
          {isLocating ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Crosshair size={14} />
          )}
          {isLocating ? "Locating..." : "Use Current Location"}
        </button>
      </div>

      {statusMessage && (
        <div
          style={{
            background: "#FFF3CD",
            color: "#856404",
            padding: "8px 12px",
            borderRadius: "8px",
            fontSize: "12px",
            border: "1px solid #FFEEBA",
          }}
        >
          💡 {statusMessage}
        </div>
      )}

      {/* Map Canvas / Viewer */}
      <div
        style={{
          position: "relative",
          height: "360px",
          borderRadius: "12px",
          overflow: "hidden",
          border: "2px solid #1F4D46",
          boxShadow: "0 4px 14px rgba(0, 0, 0, 0.08)",
          background: "#E8EFE9",
        }}
      >
        <div ref={mapContainerRef} style={{ width: "100%", height: "100%", zIndex: 1 }} />

        {!leafletLoaded && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              background: "#E8EFE9",
              zIndex: 2,
              color: "#1F4D46",
              fontSize: "13px",
              fontWeight: 700,
            }}
          >
            <Loader2 size={24} className="animate-spin" />
            Loading interactive map...
          </div>
        )}

        {/* Zoom Controls */}
        <div
          style={{
            position: "absolute",
            top: "12px",
            right: "12px",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
            zIndex: 1000,
          }}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              mapInstance.current?.zoomIn();
            }}
            title="Zoom In"
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "6px",
              background: "#FFFFFF",
              border: "1px solid #E3DDCF",
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
              boxShadow: "0 2px 4px rgba(0,0,0,0.15)",
            }}
          >
            <ZoomIn size={16} color="#1F4D46" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              mapInstance.current?.zoomOut();
            }}
            title="Zoom Out"
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "6px",
              background: "#FFFFFF",
              border: "1px solid #E3DDCF",
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
              boxShadow: "0 2px 4px rgba(0,0,0,0.15)",
            }}
          >
            <ZoomOut size={16} color="#1F4D46" />
          </button>
        </div>

        {/* Interactive helper badge */}
        <div
          style={{
            position: "absolute",
            bottom: "10px",
            left: "12px",
            background: "rgba(15, 46, 41, 0.88)",
            color: "#FFFFFF",
            padding: "6px 12px",
            borderRadius: "6px",
            fontSize: "11px",
            fontWeight: 600,
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            zIndex: 1000,
            pointerEvents: "none",
          }}
        >
          <Info size={13} color="#F2C94C" />
          Click or drag pin to position Hub · Circle indicates {radius} km delivery area
        </div>
      </div>

      {/* Radius Slider & Coordinate Readouts */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.2fr 1fr",
          gap: "14px",
          alignItems: "center",
          background: "#FFFFFF",
          padding: "12px 14px",
          borderRadius: "10px",
          border: "1px solid #E3DDCF",
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "6px",
            }}
          >
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#1F4D46" }}>
              Delivery Geo-Fence Radius:
            </span>
            <span
              style={{
                fontSize: "12px",
                fontWeight: 800,
                color: "#2E7D5B",
              }}
            >
              {radius} km (Express Zone)
            </span>
          </div>
          <input
            type="range"
            min={3}
            max={30}
            step={0.5}
            value={radius}
            onChange={(e) => handleRadiusChange(parseFloat(e.target.value))}
            style={{ width: "100%", accentColor: "#2E7D5B", cursor: "pointer" }}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "10px",
              color: "#8B968F",
              marginTop: "2px",
            }}
          >
            <span>3 km (Micro)</span>
            <span>10 km (Standard)</span>
            <span>30 km (Regional)</span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "10px",
            justifyContent: "flex-end",
            alignItems: "center",
          }}
        >
          <div
            style={{
              background: "#F6F2EA",
              padding: "6px 10px",
              borderRadius: "6px",
              fontSize: "11px",
              color: "#1F4D46",
              fontWeight: 700,
            }}
          >
            Lat: {lat}
          </div>
          <div
            style={{
              background: "#F6F2EA",
              padding: "6px 10px",
              borderRadius: "6px",
              fontSize: "11px",
              color: "#1F4D46",
              fontWeight: 700,
            }}
          >
            Lng: {lng}
          </div>
        </div>
      </div>
    </div>
  );
}
