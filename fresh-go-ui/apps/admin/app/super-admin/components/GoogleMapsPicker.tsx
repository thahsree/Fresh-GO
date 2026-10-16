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
  onLocationSelect: (lat: number, lng: number, address?: string, city?: string) => void;
  onRadiusChange?: (radiusKm: number) => void;
};

type GeocodeResult = {
  address: string;
  city?: string;
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

  // Keep references to callbacks so effect listeners don't tear down map on re-render
  const onLocationSelectRef = useRef(onLocationSelect);
  onLocationSelectRef.current = onLocationSelect;

  const lastReportedCoords = useRef<{ lat: number; lng: number }>({
    lat: initialLat && initialLat !== 0 ? initialLat : DEFAULT_LAT,
    lng: initialLng && initialLng !== 0 ? initialLng : DEFAULT_LNG,
  });

  // Reverse geocoding helper: 100% Free OpenStreetMap Photon + BigDataCloud (NO API key required)
  const reverseGeocode = useCallback(async (targetLat: number, targetLng: number): Promise<GeocodeResult> => {
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
          const city = feat.city || feat.locality || feat.district || feat.county || "";
          if (parts.length > 0) return { address: parts.join(", "), city };
        }
      }
    } catch {}

    // 2. Try BigDataCloud reverse geocode (100% free, no key required)
    try {
      const bRes = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${targetLat}&longitude=${targetLng}&localityLanguage=en`,
        { signal: AbortSignal.timeout(3500) }
      );
      if (bRes.ok) {
        const bData = await bRes.json();
        const parts = [bData.locality || bData.city, bData.principalSubdivision, bData.countryName].filter(Boolean);
        const city = bData.city || bData.locality || "";
        if (parts.length > 0) return { address: parts.join(", "), city };
      }
    } catch {}

    // 3. Fallback to LocationIQ
    try {
      const res = await fetch(
        `https://us1.locationiq.com/v1/reverse?key=${LOCATIONIQ_KEY}&lat=${targetLat}&lon=${targetLng}&format=json`,
        { signal: AbortSignal.timeout(3500) }
      );
      if (res.ok) {
        const data = await res.json();
        const city = data?.address?.city || data?.address?.town || data?.address?.village || data?.address?.county || "";
        return { address: data?.display_name || "", city };
      }
    } catch {}

    return { address: `Lat: ${targetLat.toFixed(4)}, Lng: ${targetLng.toFixed(4)}` };
  }, []);

  const reverseGeocodeRef = useRef(reverseGeocode);
  reverseGeocodeRef.current = reverseGeocode;

  // Sync internal coordinates when initial props change externally (avoid interrupting smooth flyTo)
  useEffect(() => {
    if (initialLat && initialLng && initialLat !== 0 && initialLng !== 0) {
      const diffLat = Math.abs(lastReportedCoords.current.lat - initialLat);
      const diffLng = Math.abs(lastReportedCoords.current.lng - initialLng);
      if (diffLat > 0.0001 || diffLng > 0.0001) {
        lastReportedCoords.current = { lat: initialLat, lng: initialLng };
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
      lastReportedCoords.current = { lat: newLat, lng: newLng };
      setLat(newLat);
      setLng(newLng);
      circle.setLatLng(pos);
      const geo = await reverseGeocodeRef.current(newLat, newLng);
      onLocationSelectRef.current(newLat, newLng, geo.address, geo.city);
    });

    // Click map event
    map.on("click", async (e: any) => {
      const clicked = e.latlng;
      const newLat = Number(clicked.lat.toFixed(6));
      const newLng = Number(clicked.lng.toFixed(6));
      lastReportedCoords.current = { lat: newLat, lng: newLng };
      setLat(newLat);
      setLng(newLng);
      marker.setLatLng(clicked);
      circle.setLatLng(clicked);
      const geo = await reverseGeocodeRef.current(newLat, newLng);
      onLocationSelectRef.current(newLat, newLng, geo.address, geo.city);
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
  }, [leafletLoaded]);

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
        lastReportedCoords.current = { lat: foundLat, lng: foundLng };
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

        onLocationSelectRef.current(foundLat, foundLng, foundName || addressQuery);
      } else {
        setStatusMessage("⚠️ Place not found. You can click anywhere on the map to place the pin directly.");
      }
    } catch (err: any) {
      console.warn("Geocoding failed:", err);
      setStatusMessage("⚠️ Search offline. Click directly on the map to position the Hub pin.");
    } finally {
      setIsSearching(false);
    }
  };

  // Locate current position with GPS and multi-tier IP fallback
  const handleGetCurrentLocation = async () => {
    setIsLocating(true);
    setStatusMessage(null);

    let foundLat: number | null = null;
    let foundLng: number | null = null;
    let locationSource: "gps" | "network" | "ip" | null = null;
    let detectedCity: string | null = null;
    let isPermissionDenied = false;

    // Check browser permission state upfront if supported
    if (typeof navigator !== "undefined" && (navigator as any).permissions?.query) {
      try {
        const perm = await (navigator as any).permissions.query({ name: "geolocation" });
        if (perm && perm.state === "denied") {
          isPermissionDenied = true;
        }
      } catch {}
    }

    // 1. Try Browser Geolocation API (if not explicitly blocked by permission)
    if (!isPermissionDenied && typeof navigator !== "undefined" && navigator.geolocation) {
      const getBrowserPos = (enableHighAccuracy: boolean, timeoutMs: number) => {
        return new Promise<{ lat: number; lng: number; accuracy?: number } | null>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const pLat = pos.coords.latitude;
              const pLng = pos.coords.longitude;
              if (Number.isFinite(pLat) && Number.isFinite(pLng)) {
                resolve({
                  lat: Number(pLat.toFixed(6)),
                  lng: Number(pLng.toFixed(6)),
                  accuracy: pos.coords.accuracy,
                });
              } else {
                resolve(null);
              }
            },
            (err) => reject(err),
            {
              enableHighAccuracy,
              timeout: timeoutMs,
              maximumAge: 30000,
            }
          );
        });
      };

      try {
        // Fast network triangulation first (Wi-Fi / ISP, resolves in < 500ms on desktop & laptop)
        const netPos = await getBrowserPos(false, 3500);
        if (netPos) {
          foundLat = netPos.lat;
          foundLng = netPos.lng;
          locationSource = "network";
        }
      } catch (firstErr: any) {
        if (firstErr?.code === 1) {
          isPermissionDenied = true;
        } else {
          // Fallback to high accuracy GPS (e.g. mobile phones or devices with GPS chip)
          try {
            const gpsPos = await getBrowserPos(true, 4000);
            if (gpsPos) {
              foundLat = gpsPos.lat;
              foundLng = gpsPos.lng;
              locationSource = "gps";
            }
          } catch (secondErr: any) {
            if (secondErr?.code === 1) isPermissionDenied = true;
          }
        }
      }
    }

    // 2. High-speed, Multi-Provider IP Geolocation Fallback
    // If browser GPS was blocked, timed out, or running in an insecure context
    if (!foundLat || !foundLng) {
      // Source A: ipwho.is (Tested: Instant, HTTPS, CORS *)
      try {
        const res = await fetch("https://ipwho.is/", { signal: AbortSignal.timeout(3500) });
        if (res.ok) {
          const data = await res.json();
          if (data?.success && Number.isFinite(data?.latitude) && Number.isFinite(data?.longitude)) {
            foundLat = Number(Number(data.latitude).toFixed(6));
            foundLng = Number(Number(data.longitude).toFixed(6));
            detectedCity = data.city || data.region || "";
            locationSource = "ip";
          }
        }
      } catch {}

      // Source B: BigDataCloud client reverse geocode (Tested: Instant, HTTPS, CORS *)
      if (!foundLat || !foundLng) {
        try {
          const res = await fetch("https://api.bigdatacloud.net/data/reverse-geocode-client", {
            signal: AbortSignal.timeout(3500),
          });
          if (res.ok) {
            const data = await res.json();
            if (Number.isFinite(data?.latitude) && Number.isFinite(data?.longitude)) {
              foundLat = Number(Number(data.latitude).toFixed(6));
              foundLng = Number(Number(data.longitude).toFixed(6));
              detectedCity = data.city || data.locality || "";
              locationSource = "ip";
            }
          }
        } catch {}
      }

      // Source C: GeoJS (Cloudflare backend, CORS *)
      if (!foundLat || !foundLng) {
        try {
          const res = await fetch("https://get.geojs.io/v1/ip/geo.json", {
            signal: AbortSignal.timeout(3500),
          });
          if (res.ok) {
            const data = await res.json();
            const latNum = parseFloat(data?.latitude);
            const lngNum = parseFloat(data?.longitude);
            if (Number.isFinite(latNum) && Number.isFinite(lngNum)) {
              foundLat = Number(latNum.toFixed(6));
              foundLng = Number(lngNum.toFixed(6));
              detectedCity = data.city || data.region || "";
              locationSource = "ip";
            }
          }
        } catch {}
      }
    }

    // 3. Fallback to default Kasaragod Hub coordinates if completely offline
    if (!foundLat || !foundLng) {
      foundLat = DEFAULT_LAT;
      foundLng = DEFAULT_LNG;
      setStatusMessage("⚠️ Could not detect current location. You can search or click anywhere on the map to place the hub pin.");
    } else {
      // Clear, informative feedback based on resolution source
      if (locationSource === "gps") {
        setStatusMessage("📍 Pinpointed your location via device GPS.");
      } else if (locationSource === "network") {
        setStatusMessage("📍 Detected your location via Wi-Fi / network.");
      } else if (locationSource === "ip") {
        if (isPermissionDenied) {
          setStatusMessage(
            `⚠️ Browser location permission is blocked. Located approximate area via network (${detectedCity || "region"}). To enable precise GPS, click the lock/settings icon in your address bar and allow Location.`
          );
        } else {
          setStatusMessage(
            `📍 Located approximate area via network (${detectedCity || "region"}). You can click or drag the pin for exact street placement.`
          );
        }
      }
    }

    lastReportedCoords.current = { lat: foundLat, lng: foundLng };
    setLat(foundLat);
    setLng(foundLng);

    if (mapInstance.current) {
      mapInstance.current.flyTo([foundLat, foundLng], 15, { duration: 1.2 });
    }
    if (markerInstance.current) {
      markerInstance.current.setLatLng([foundLat, foundLng]);
    }
    if (circleInstance.current) {
      circleInstance.current.setLatLng([foundLat, foundLng]);
    }

    const geo = await reverseGeocodeRef.current(foundLat, foundLng);
    onLocationSelectRef.current(foundLat, foundLng, geo.address, geo.city || detectedCity || undefined);
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
            background: statusMessage.startsWith("⚠️")
              ? "#FFF3CD"
              : statusMessage.startsWith("📍")
              ? "#E8F5E9"
              : "#E4ECE9",
            color: statusMessage.startsWith("⚠️")
              ? "#856404"
              : statusMessage.startsWith("📍")
              ? "#1B5E20"
              : "#1F4D46",
            padding: "9px 12px",
            borderRadius: "8px",
            fontSize: "12px",
            fontWeight: 600,
            border: `1px solid ${
              statusMessage.startsWith("⚠️")
                ? "#FFEEBA"
                : statusMessage.startsWith("📍")
                ? "#C8E6C9"
                : "#C5D8D3"
            }`,
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          {statusMessage}
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
