"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  MapPin,
  Search,
  ZoomIn,
  ZoomOut,
  Loader2,
  Crosshair,
  Navigation,
  X,
  Building,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Info,
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

type LocationSuggestion = {
  id: string;
  title: string;
  subtitle: string;
  lat: number;
  lng: number;
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
  const leafletMapRef = useRef<any>(null);
  const circleRef = useRef<any>(null);

  const [lat, setLat] = useState(() => (initialLat && initialLat !== 0 ? initialLat : DEFAULT_LAT));
  const [lng, setLng] = useState(() => (initialLng && initialLng !== 0 ? initialLng : DEFAULT_LNG));
  const [radius, setRadius] = useState(radiusKm || 10);
  const [currentAddress, setCurrentAddress] = useState("");
  const [currentCity, setCurrentCity] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [isLocatingGPS, setIsLocatingGPS] = useState(false);
  const [isDraggingMap, setIsDraggingMap] = useState(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [leafletReady, setLeafletReady] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "warning" | "info" } | null>(null);

  const geocodeTimerRef = useRef<any>(null);
  const searchDebounceRef = useRef<any>(null);
  const isInternalMapMoveRef = useRef(false);

  // Keep references to parent callback so map listeners don't rebind
  const onLocationSelectRef = useRef(onLocationSelect);
  onLocationSelectRef.current = onLocationSelect;

  const lastCoordsRef = useRef<{ lat: number; lng: number }>({
    lat: initialLat && initialLat !== 0 ? initialLat : DEFAULT_LAT,
    lng: initialLng && initialLng !== 0 ? initialLng : DEFAULT_LNG,
  });

  // 1. Inject Leaflet CDN and essential anti-blur / 60fps styles (identical to Customer App)
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Remove legacy Google script if present to prevent watermarks or API key prompts
    const oldGoogle = document.getElementById("google-maps-script");
    if (oldGoogle) oldGoogle.remove();
    if ((window as any).google?.maps) {
      try {
        delete (window as any).google.maps;
      } catch {}
    }

    // Inject core Leaflet styles
    const styleId = "freshgo-leaflet-core-styles";
    if (!document.getElementById(styleId)) {
      const styleEl = document.createElement("style");
      styleEl.id = styleId;
      styleEl.textContent = `
        .leaflet-container {
          overflow: hidden !important;
          position: relative !important;
          outline: 0;
          user-select: none;
          touch-action: none;
          background-color: #E8EEE9;
          font-family: inherit;
        }
        .leaflet-tile {
          user-select: none;
          -webkit-user-drag: none;
          image-rendering: auto;
          will-change: transform;
        }
        .leaflet-control-attribution {
          display: none !important;
        }
      `;
      document.head.appendChild(styleEl);
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
      setLeafletReady(true);
    } else if (!document.getElementById("leaflet-cdn-js")) {
      const script = document.createElement("script");
      script.id = "leaflet-cdn-js";
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.async = true;
      script.onload = () => setLeafletReady(true);
      document.head.appendChild(script);
    } else {
      const existing = document.getElementById("leaflet-cdn-js");
      existing?.addEventListener("load", () => setLeafletReady(true));
    }
  }, []);

  // 2. Reverse Geocode (LocationIQ with OpenStreetMap Nominatim fallback)
  const reverseGeocode = useCallback(async (targetLat: number, targetLng: number) => {
    if (!Number.isFinite(targetLat) || !Number.isFinite(targetLng)) return;
    setIsReverseGeocoding(true);

    let addressStr = "";
    let cityStr = "";

    // A. LocationIQ Reverse Geocoder (High-precision Indian address & city)
    try {
      const res = await fetch(
        `https://us1.locationiq.com/v1/reverse?key=${LOCATIONIQ_KEY}&lat=${targetLat}&lon=${targetLng}&format=json&addressdetails=1`,
        { signal: AbortSignal.timeout(3500) }
      );
      if (res.ok) {
        const data = await res.json();
        if (data && data.address) {
          const addr = data.address;
          cityStr = addr.city || addr.town || addr.village || addr.county || addr.state_district || "";
          const road = addr.road || addr.street || "";
          const neighbourhood = addr.suburb || addr.neighbourhood || addr.quarter || "";
          const cleanParts = [road, neighbourhood, cityStr].filter(Boolean);
          addressStr = cleanParts.length > 0 ? cleanParts.join(", ") : data.display_name?.split(",").slice(0, 3).join(", ") || "";
        }
      }
    } catch {}

    // B. OpenStreetMap Nominatim Fallback
    if (!addressStr) {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${targetLat}&lon=${targetLng}&zoom=18&addressdetails=1`,
          { signal: AbortSignal.timeout(3500) }
        );
        if (res.ok) {
          const data = await res.json();
          if (data && data.address) {
            cityStr = data.address.city || data.address.town || data.address.village || data.address.county || "";
            addressStr = data.display_name?.split(",").slice(0, 3).join(", ") || "";
          }
        }
      } catch {}
    }

    if (!addressStr) {
      addressStr = `Hub Pin (${targetLat.toFixed(4)}, ${targetLng.toFixed(4)})`;
    }

    setCurrentAddress(addressStr);
    setCurrentCity(cityStr);
    setIsReverseGeocoding(false);
    onLocationSelectRef.current(targetLat, targetLng, addressStr, cityStr);
  }, []);

  // Debounced reverse geocoding to prevent excessive requests while panning
  const debouncedReverseGeocode = useCallback(
    (targetLat: number, targetLng: number) => {
      if (geocodeTimerRef.current) {
        clearTimeout(geocodeTimerRef.current);
      }
      geocodeTimerRef.current = setTimeout(() => {
        reverseGeocode(targetLat, targetLng);
      }, 350);
    },
    [reverseGeocode]
  );

  // 3. Initialize Swiggy / Customer App Style Leaflet Map
  useEffect(() => {
    if (!leafletReady || !mapContainerRef.current || !(window as any).L) return;
    const L = (window as any).L;

    // Reset container if already initialized
    if ((mapContainerRef.current as any)._leaflet_id) {
      if (leafletMapRef.current) {
        try {
          leafletMapRef.current.remove();
        } catch {}
        leafletMapRef.current = null;
      }
      delete (mapContainerRef.current as any)._leaflet_id;
    }

    const initialCenter: [number, number] = [lat, lng];

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: 15,
      zoomControl: false,
      attributionControl: false,
      fadeAnimation: true,
      zoomAnimation: true,
    });

    // 100% Free Official OpenStreetMap Tiles (Clean, zero API key, zero watermarks)
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "",
    }).addTo(map);

    // 10km Express Delivery Coverage Circle (Centered on initial pin)
    const circle = L.circle(initialCenter, {
      radius: radius * 1000,
      color: "#1F4D46",
      weight: 2,
      fillColor: "#2E7D5B",
      fillOpacity: 0.16,
    }).addTo(map);

    circleRef.current = circle;

    // Swiggy style lift & drop animation: pin lifts up while panning so admin clearly sees ground target
    map.on("movestart", () => {
      setIsDraggingMap(true);
    });

    // When panning stops: pin drops back down and center coordinates are updated
    map.on("moveend", () => {
      setIsDraggingMap(false);
      const center = map.getCenter();
      if (center && Number.isFinite(center.lat) && Number.isFinite(center.lng)) {
        const newLat = Number(center.lat.toFixed(6));
        const newLng = Number(center.lng.toFixed(6));
        isInternalMapMoveRef.current = true;
        setLat(newLat);
        setLng(newLng);
        lastCoordsRef.current = { lat: newLat, lng: newLng };

        // Keep geo-fence circle centered on the pinpoint
        if (circleRef.current) {
          circleRef.current.setLatLng([newLat, newLng]);
        }

        debouncedReverseGeocode(newLat, newLng);
        setTimeout(() => {
          isInternalMapMoveRef.current = false;
        }, 120);
      }
    });

    // Clicking anywhere on the map also smoothly pans that spot under the center pin
    map.on("click", (e: any) => {
      if (e?.latlng && Number.isFinite(e.latlng.lat)) {
        map.panTo(e.latlng);
      }
    });

    leafletMapRef.current = map;

    // Invalidate size to guarantee crisp, non-blurred tiles on initial render
    const invalidate = () => {
      if (leafletMapRef.current) {
        try {
          leafletMapRef.current.invalidateSize({ animate: false });
        } catch {}
      }
    };
    requestAnimationFrame(invalidate);
    const t1 = setTimeout(invalidate, 100);
    const t2 = setTimeout(invalidate, 300);
    window.addEventListener("resize", invalidate);

    // Initial reverse geocode on mount
    reverseGeocode(lat, lng);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener("resize", invalidate);
      if (leafletMapRef.current) {
        try {
          leafletMapRef.current.remove();
        } catch {}
        leafletMapRef.current = null;
      }
    };
  }, [leafletReady]);

  // Sync external prop coordinate changes (only if different from current center)
  useEffect(() => {
    if (initialLat && initialLng && initialLat !== 0 && initialLng !== 0) {
      const diffLat = Math.abs(lastCoordsRef.current.lat - initialLat);
      const diffLng = Math.abs(lastCoordsRef.current.lng - initialLng);
      if (diffLat > 0.0001 || diffLng > 0.0001) {
        lastCoordsRef.current = { lat: initialLat, lng: initialLng };
        setLat(initialLat);
        setLng(initialLng);

        if (leafletMapRef.current && !isInternalMapMoveRef.current) {
          leafletMapRef.current.setView([initialLat, initialLng], 15);
        }
        if (circleRef.current) {
          circleRef.current.setLatLng([initialLat, initialLng]);
        }
      }
    }
  }, [initialLat, initialLng]);

  // Sync delivery radius slider changes
  useEffect(() => {
    if (radiusKm) {
      setRadius(radiusKm);
      if (circleRef.current) {
        circleRef.current.setRadius(radiusKm * 1000);
      }
    }
  }, [radiusKm]);

  const handleRadiusChange = (newRadius: number) => {
    setRadius(newRadius);
    if (circleRef.current) {
      circleRef.current.setRadius(newRadius * 1000);
    }
    if (onRadiusChange) {
      onRadiusChange(newRadius);
    }
  };

  // 4. Exact Customer App Location Acquisition Method (Network first, then hardware GPS)
  const handleUseCurrentLocation = async () => {
    setIsLocatingGPS(true);
    setStatusMessage(null);

    const getBrowserCoords = (enableHighAccuracy: boolean, timeoutMs: number) => {
      return new Promise<{ lat: number; lng: number } | null>((resolve) => {
        if (typeof navigator === "undefined" || !navigator.geolocation) {
          return resolve(null);
        }

        let isDone = false;
        const timer = setTimeout(() => {
          if (!isDone) {
            isDone = true;
            resolve(null);
          }
        }, timeoutMs);

        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (!isDone) {
              isDone = true;
              clearTimeout(timer);
              const pLat = pos.coords.latitude;
              const pLng = pos.coords.longitude;
              if (Number.isFinite(pLat) && Number.isFinite(pLng)) {
                resolve({
                  lat: Number(pLat.toFixed(6)),
                  lng: Number(pLng.toFixed(6)),
                });
              } else {
                resolve(null);
              }
            }
          },
          () => {
            if (!isDone) {
              isDone = true;
              clearTimeout(timer);
              resolve(null);
            }
          },
          {
            enableHighAccuracy,
            timeout: timeoutMs,
            maximumAge: 30000,
          }
        );
      });
    };

    try {
      // Step A: Standard network / Wi-Fi triangulation (super fast on desktop & laptop, < 500ms)
      let coords = await getBrowserCoords(false, 3500);

      // Step B: Active GPS fix if standard didn't return (e.g. mobile or GPS hardware)
      if (!coords) {
        coords = await getBrowserCoords(true, 4500);
      }

      if (coords && Number.isFinite(coords.lat) && Number.isFinite(coords.lng)) {
        const foundLat = coords.lat;
        const foundLng = coords.lng;

        setLat(foundLat);
        setLng(foundLng);
        lastCoordsRef.current = { lat: foundLat, lng: foundLng };

        if (leafletMapRef.current) {
          leafletMapRef.current.flyTo([foundLat, foundLng], 16, { duration: 1.2 });
        }
        if (circleRef.current) {
          circleRef.current.setLatLng([foundLat, foundLng]);
        }

        setStatusMessage({
          text: "📍 Device location pinpointed. Delivery geo-fence centered.",
          type: "success",
        });

        reverseGeocode(foundLat, foundLng);
      } else {
        setStatusMessage({
          text: "⚠️ Location access was not granted or unavailable. Please allow Location permissions in your browser or search your town above.",
          type: "warning",
        });
      }
    } catch (err: any) {
      console.warn("Location error:", err);
      setStatusMessage({
        text: "⚠️ Location detection failed. You can search or pan the map to set the Hub pin.",
        type: "warning",
      });
    } finally {
      setIsLocatingGPS(false);
    }
  };

  // 5. Live Autocomplete Search (LocationIQ Autocomplete)
  const handleSearchInputChange = (text: string) => {
    setSearchQuery(text);
    if (!text.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    searchDebounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `https://api.locationiq.com/v1/autocomplete?key=${LOCATIONIQ_KEY}&q=${encodeURIComponent(
            text.trim()
          )}&countrycodes=in&limit=6`,
          { signal: AbortSignal.timeout(4000) }
        );
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            const mapped: LocationSuggestion[] = data.map((item: any, idx: number) => {
              const rawLat = parseFloat(item.lat);
              const rawLng = parseFloat(item.lon);
              const itemCity = item.address?.city || item.address?.town || item.address?.county || item.address?.state || "";
              return {
                id: `liq-${item.place_id || idx}`,
                title: item.display_place || item.address?.name || item.display_name.split(",")[0],
                subtitle: item.display_address || item.display_name,
                lat: Number(rawLat.toFixed(6)),
                lng: Number(rawLng.toFixed(6)),
                city: itemCity,
              };
            });
            setSuggestions(mapped);
            setShowSuggestions(true);
          }
        }
      } catch (err) {
        console.warn("Autocomplete error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 280);
  };

  const handleSelectSuggestion = (item: LocationSuggestion) => {
    setSearchQuery(item.title);
    setShowSuggestions(false);
    setSuggestions([]);

    const targetLat = item.lat;
    const targetLng = item.lng;

    setLat(targetLat);
    setLng(targetLng);
    lastCoordsRef.current = { lat: targetLat, lng: targetLng };

    if (leafletMapRef.current) {
      leafletMapRef.current.flyTo([targetLat, targetLng], 15, { duration: 1 });
    }
    if (circleRef.current) {
      circleRef.current.setLatLng([targetLat, targetLng]);
    }

    setCurrentAddress(item.subtitle);
    if (item.city) setCurrentCity(item.city);

    onLocationSelectRef.current(targetLat, targetLng, item.subtitle, item.city);
    setStatusMessage({
      text: `📍 Centered on ${item.title}. Drag map to fine-tune exact building/gate placement.`,
      type: "info",
    });
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
      {/* 1. Top Search & Use Current Location Toolbar */}
      <div style={{ position: "relative" }}>
        <div
          style={{
            display: "flex",
            gap: "8px",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          {/* Autocomplete Search Input */}
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
              value={searchQuery}
              onChange={(e) => handleSearchInputChange(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              placeholder="Search town, landmark, city, building or gate in India..."
              style={{
                width: "100%",
                padding: "9px 36px 9px 36px",
                borderRadius: "8px",
                border: "1px solid #E3DDCF",
                background: "#FFFFFF",
                fontSize: "13px",
                outline: "none",
                color: "#1F4D46",
                fontWeight: 600,
              }}
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSuggestions([]);
                  setShowSuggestions(false);
                }}
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#8B968F",
                  padding: "4px",
                }}
              >
                <X size={14} />
              </button>
            ) : isSearching ? (
              <Loader2
                size={14}
                className="animate-spin"
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#1F4D46",
                }}
              />
            ) : null}
          </div>

          {/* Use Current Location Button */}
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={isLocatingGPS}
            title="Use device GPS / network location"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "9px 14px",
              borderRadius: "8px",
              background: isLocatingGPS ? "#C8DFD7" : "#1F4D46",
              color: "#FFFFFF",
              fontSize: "12px",
              fontWeight: 700,
              border: "none",
              cursor: isLocatingGPS ? "wait" : "pointer",
              boxShadow: "0 2px 6px rgba(31, 77, 70, 0.2)",
              transition: "all 0.2s ease",
            }}
          >
            {isLocatingGPS ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Navigation size={14} />
            )}
            {isLocatingGPS ? "Detecting GPS..." : "Use Current Location"}
          </button>
        </div>

        {/* Live Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              marginTop: "4px",
              background: "#FFFFFF",
              borderRadius: "8px",
              border: "1px solid #E3DDCF",
              boxShadow: "0 6px 20px rgba(0,0,0,0.12)",
              zIndex: 2000,
              maxHeight: "220px",
              overflowY: "auto",
            }}
          >
            {suggestions.map((item) => (
              <div
                key={item.id}
                onClick={() => handleSelectSuggestion(item)}
                style={{
                  padding: "10px 14px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  borderBottom: "1px solid #F0ECE4",
                  transition: "background 0.15s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#F6F2EA")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#FFFFFF")}
              >
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "6px",
                    background: "#E4ECE9",
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                  }}
                >
                  <MapPin size={14} color="#1F4D46" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: 700,
                      color: "#1F4D46",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {item.title}
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#6B7C75",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {item.subtitle}
                  </div>
                </div>
                <ChevronRight size={14} color="#8B968F" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Status / Alert Banner */}
      {statusMessage && (
        <div
          style={{
            background:
              statusMessage.type === "warning"
                ? "#FFF3CD"
                : statusMessage.type === "success"
                ? "#E8F5E9"
                : "#E4ECE9",
            color:
              statusMessage.type === "warning"
                ? "#856404"
                : statusMessage.type === "success"
                ? "#1B5E20"
                : "#1F4D46",
            padding: "8px 12px",
            borderRadius: "8px",
            fontSize: "12px",
            fontWeight: 600,
            border: `1px solid ${
              statusMessage.type === "warning"
                ? "#FFEEBA"
                : statusMessage.type === "success"
                ? "#C8E6C9"
                : "#C5D8D3"
            }`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "8px",
          }}
        >
          <span>{statusMessage.text}</span>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "inherit",
              padding: 0,
            }}
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* 2. Customer App Crisp Leaflet Map Container with Swiggy Center Pin */}
      <div
        style={{
          position: "relative",
          height: "380px",
          borderRadius: "12px",
          overflow: "hidden",
          border: "2px solid #1F4D46",
          boxShadow: "0 4px 14px rgba(0, 0, 0, 0.08)",
          background: "#E8EEE9",
        }}
      >
        {/* Leaflet DOM Node */}
        <div ref={mapContainerRef} style={{ width: "100%", height: "100%", zIndex: 1 }} />

        {/* Loading Spinner until Leaflet CDN is loaded */}
        {!leafletReady && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              background: "#E8EEE9",
              zIndex: 2,
              color: "#1F4D46",
              fontSize: "13px",
              fontWeight: 700,
            }}
          >
            <Loader2 size={24} className="animate-spin" />
            Loading interactive map engine...
          </div>
        )}

        {/* ============================================================== */}
        {/* 1. Precision Ground Target Reticle (Anchored exactly at 50%, 50%) */}
        {/* ============================================================== */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: "36px",
            height: "36px",
            transform: "translate(-50%, -50%)",
            pointerEvents: "none",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Radar Pulse Ring */}
          <div
            style={{
              position: "absolute",
              width: isDraggingMap ? "32px" : "24px",
              height: isDraggingMap ? "32px" : "24px",
              borderRadius: "50%",
              border: "1.5px dashed rgba(31, 77, 70, 0.45)",
              transition: "all 0.2s ease",
            }}
          />
          {/* Ground Contact Shadow */}
          <div
            style={{
              position: "absolute",
              bottom: "1px",
              width: isDraggingMap ? "14px" : "20px",
              height: isDraggingMap ? "4px" : "6px",
              borderRadius: "50%",
              background: isDraggingMap ? "rgba(0,0,0,0.18)" : "rgba(0,0,0,0.35)",
              transition: "all 0.2s ease",
            }}
          />
          {/* Center Bullseye Dot */}
          <div
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: "#1F4D46",
              boxShadow: "0 0 0 2px #FFFFFF",
            }}
          />
        </div>

        {/* ============================================================== */}
        {/* 2. Swiggy Elevated Pin Assembly (Needle tip points at exact 50%, 50%) */}
        {/* ============================================================== */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: isDraggingMap ? "translate(-19px, -62px)" : "translate(-19px, -48px)",
            pointerEvents: "none",
            zIndex: 1001,
            width: "38px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            transition: "transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        >
          {/* Live Floating Tooltip Bubble */}
          <div
            style={{
              position: "absolute",
              top: "-34px",
              width: "186px",
              left: "-74px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              background: isDraggingMap ? "#1C2D27" : "#1F4D46",
              padding: "5px 10px",
              borderRadius: "16px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
              border: isDraggingMap ? "1px solid rgba(224, 53, 70, 0.6)" : "1px solid transparent",
            }}
          >
            <div
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                background: isDraggingMap ? "#F59E0B" : "#4ADE80",
              }}
            />
            <span
              style={{
                fontSize: "10.5px",
                fontWeight: 800,
                color: "#FFFFFF",
                letterSpacing: "0.1px",
                whiteSpace: "nowrap",
              }}
            >
              {isDraggingMap ? "Aligning hub location..." : "Hub Pin Position"}
            </span>
            {/* Arrow Pointer */}
            <div
              style={{
                position: "absolute",
                bottom: "-4px",
                left: "50%",
                marginLeft: "-4px",
                width: 0,
                height: 0,
                borderLeft: "4px solid transparent",
                borderRight: "4px solid transparent",
                borderTop: isDraggingMap ? "4px solid #1C2D27" : "4px solid #1F4D46",
              }}
            />
          </div>

          {/* Pin Head Teardrop */}
          <div
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "50%",
              background: isDraggingMap ? "#E03546" : "#BE4436",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "2.5px solid #FFFFFF",
              boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
              zIndex: 2,
              transform: isDraggingMap ? "scale(1.06)" : "scale(1)",
              transition: "all 0.2s ease",
            }}
          >
            <Building size={18} color="#FFFFFF" />
          </div>

          {/* Pin Needle Tip */}
          <div
            style={{
              width: 0,
              height: 0,
              borderLeft: "6px solid transparent",
              borderRight: "6px solid transparent",
              borderTop: isDraggingMap ? "12px solid #E03546" : "12px solid #BE4436",
              marginTop: "-2px",
              zIndex: 1,
            }}
          />
        </div>

        {/* Floating Controls Overlay */}
        {/* Top-Right: Zoom Controls */}
        <div
          style={{
            position: "absolute",
            top: "12px",
            right: "12px",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
            zIndex: 1002,
          }}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              leafletMapRef.current?.zoomIn();
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
              leafletMapRef.current?.zoomOut();
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

        {/* Bottom-Right: Recenter GPS Floating Button */}
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={isLocatingGPS}
          title="Recenter on My GPS Location"
          style={{
            position: "absolute",
            bottom: "12px",
            right: "12px",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            background: "#FFFFFF",
            color: "#1F4D46",
            border: "1px solid #E3DDCF",
            borderRadius: "20px",
            padding: "7px 12px",
            fontSize: "11px",
            fontWeight: 800,
            cursor: isLocatingGPS ? "wait" : "pointer",
            boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
            zIndex: 1002,
          }}
        >
          {isLocatingGPS ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Crosshair size={13} color="#1F4D46" />
          )}
          {isLocatingGPS ? "Locating..." : "My Location"}
        </button>

        {/* Bottom-Left: Interactive Hint Badge */}
        <div
          style={{
            position: "absolute",
            bottom: "12px",
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
            zIndex: 1002,
            pointerEvents: "none",
            maxWidth: "65%",
          }}
        >
          <Info size={13} color="#F2C94C" />
          <span>Drag map to align Hub gate under pin · Circle indicates {radius} km delivery zone</span>
        </div>
      </div>

      {/* 3. Address Readout & Reverse Geocode Banner */}
      <div
        style={{
          background: "#FFFFFF",
          padding: "10px 14px",
          borderRadius: "10px",
          border: "1px solid #E3DDCF",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: 0 }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              background: "#E4ECE9",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            {isReverseGeocoding ? (
              <Loader2 size={16} className="animate-spin" color="#1F4D46" />
            ) : (
              <MapPin size={16} color="#1F4D46" />
            )}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: "10px", fontWeight: 800, color: "#5C6B66", letterSpacing: "0.5px" }}>
              CURRENT PINPOINT ADDRESS & CITY:
            </div>
            <div
              style={{
                fontSize: "13px",
                fontWeight: 700,
                color: "#1F4D46",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {currentAddress || `Lat: ${lat}, Lng: ${lng}`}
            </div>
          </div>
        </div>

        {currentCity && (
          <div
            style={{
              background: "#E4ECE9",
              color: "#1F4D46",
              padding: "4px 10px",
              borderRadius: "6px",
              fontSize: "11px",
              fontWeight: 800,
              flexShrink: 0,
            }}
          >
            {currentCity}
          </div>
        )}
      </div>

      {/* 4. Radius Slider & Coordinate Readouts */}
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
