import { colors } from "@fresh-food/design-tokens";
import {
  AlertCircle,
  ArrowLeft,
  Building,
  CheckCircle2,
  ChevronRight,
  Clock,
  MapPin,
  Navigation,
  Search,
  Sparkles,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  acquireAccurateLocation,
  reverseGeocodeLocation,
  calculateDistanceKm,
} from "../lib/location";
import { WebView } from "react-native-webview";
import { customerApi, BackendHub } from "../lib/api";

declare const process: any;

type CustomerLocationModalProps = {
  visible: boolean;
  onClose: () => void;
  currentAddress: string;
  currentCoords: { lat: number; lng: number };
  onLocationConfirm: (coords: { lat: number; lng: number }, address: string, pincode?: string) => void;
  nearestHubName?: string;
  nearestHubCoords?: { lat: number; lng: number };
  hubs?: BackendHub[];
};

export type LocationSuggestion = {
  id: string;
  title: string;
  subtitle: string;
  lat?: number;
  lng?: number;
  placeId?: string;
  source: "google" | "osm" | "preset" | "locationiq";
  distanceKm?: number;
};

// LocationIQ Dedicated API Key (5,000 free requests/day)
const LOCATIONIQ_KEY =
  (typeof process !== "undefined" &&
    (process?.env?.EXPO_PUBLIC_LOCATIONIQ_TOKEN ||
      process?.env?.NEXT_PUBLIC_LOCATIONIQ_TOKEN)) ||
  "pk.1714d75230cfe1d776514cf91ec30ae3";

// Real fallback hubs (Kozhikode Central & Kannur City)
const DEFAULT_HUBS: BackendHub[] = [
  {
    id: "aa829d49-5bca-4892-ac5e-b0a1c0ad6b36",
    name: "FreshGo Central Hub (Mavoor Road)",
    code: "HUB-CLT-01",
    address: "Mavoor Road, Kozhikode, Kerala 673004",
    city: "Kozhikode",
    latitude: 11.2588,
    longitude: 75.7804,
    deliveryRadiusKm: 10,
    isActive: true,
  },
  {
    id: "4942d016-533c-4fa7-a820-6e64c76e12c7",
    name: "Kannur Hub",
    code: "HUB-CLT-02",
    address: "Kannur City, Kerala 670004",
    city: "Kannur",
    latitude: 11.876384,
    longitude: 75.373797,
    deliveryRadiusKm: 10,
    isActive: true,
  },
];

// Self-contained high-performance Leaflet HTML for React Native WebView on mobile
function getMobileLeafletHtml(
  lat: number,
  lng: number,
  hubs: BackendHub[]
): string {
  const circlesCode = hubs
    .map(
      (h) => `
    L.circle([${h.latitude}, ${h.longitude}], {
      radius: ${(h.deliveryRadiusKm || 10) * 1000},
      color: '#1F4D46',
      weight: 2,
      fillColor: '#2E7D5B',
      fillOpacity: 0.12
    }).addTo(map);
  `
    )
    .join("\n");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map {
      width: 100%;
      height: 100%;
      background-color: #DCE5DF;
      overflow: hidden;
      -webkit-tap-highlight-color: transparent;
      user-select: none;
      -webkit-user-select: none;
    }
    .leaflet-control-attribution { display: none !important; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var map = L.map('map', {
      center: [${lat}, ${lng}],
      zoom: 16,
      zoomControl: false,
      attributionControl: false,
      fadeAnimation: true,
      zoomAnimation: true
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: ''
    }).addTo(map);

    ${circlesCode}

    window.leafletMap = map;

    function sendToRN(payload) {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify(payload));
      }
    }

    map.on('movestart', function() {
      sendToRN({ type: 'movestart' });
    });

    map.on('moveend', function() {
      var center = map.getCenter();
      if (center && !isNaN(center.lat) && !isNaN(center.lng)) {
        sendToRN({
          type: 'moveend',
          lat: Number(center.lat.toFixed(6)),
          lng: Number(center.lng.toFixed(6))
        });
      }
    });

    map.on('click', function(e) {
      if (e && e.latlng) {
        map.panTo(e.latlng);
      }
    });

    sendToRN({ type: 'ready' });
  </script>
</body>
</html>`;
}

export function CustomerLocationModal({
  visible = false,
  onClose = () => {},
  currentAddress = "",
  currentCoords = { lat: 11.2588, lng: 75.7804 },
  onLocationConfirm = () => {},
  nearestHubName,
  nearestHubCoords,
  hubs,
}: CustomerLocationModalProps) {
  // Real active hubs loaded dynamically from backend or props
  const [activeHubs, setActiveHubs] = useState<BackendHub[]>(() =>
    hubs && hubs.length > 0 ? hubs : DEFAULT_HUBS
  );

  useEffect(() => {
    if (hubs && hubs.length > 0) {
      setActiveHubs(hubs);
    } else {
      customerApi.getHubs().then((res) => {
        if (Array.isArray(res) && res.length > 0) {
          setActiveHubs(res);
        }
      }).catch(() => {});
    }
  }, [hubs, visible]);

  // View state: "search" (direct search & GPS) or "pinpoint" (Swiggy-style exact map)
  const [step, setStep] = useState<"search" | "pinpoint">("search");

  // Search input and suggestions
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isLocatingGPS, setIsLocatingGPS] = useState(false);
  const [googleMapsReady, setGoogleMapsReady] = useState(false);
  const searchInputRef = useRef<any>(null);

  // Exact Pin-on-Map state (Swiggy style)
  const [pinLat, setPinLat] = useState(() =>
    Number.isFinite(currentCoords?.lat) ? currentCoords.lat : 11.2588
  );
  const [pinLng, setPinLng] = useState(() =>
    Number.isFinite(currentCoords?.lng) ? currentCoords.lng : 75.7804
  );
  const [pinAddress, setPinAddress] = useState(
    currentAddress || "Choose your delivery location"
  );
  const [pinPincode, setPinPincode] = useState<string>("");
  const [zoomLevel, setZoomLevel] = useState(16);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [isDraggingMap, setIsDraggingMap] = useState(false);

  // Leaflet / Crisp Map Refs (Web and Mobile WebView)
  const mapContainerRef = useRef<any>(null);
  const leafletMapRef = useRef<any>(null);
  const [leafletReady, setLeafletReady] = useState(false);
  const mobileWebViewRef = useRef<any>(null);
  const isInternalMapMoveRef = useRef(false);
  const [initialMapCoords, setInitialMapCoords] = useState<{ lat: number; lng: number }>({
    lat: Number.isFinite(currentCoords?.lat) ? currentCoords.lat : 11.2588,
    lng: Number.isFinite(currentCoords?.lng) ? currentCoords.lng : 75.7804,
  });

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "movestart") {
        setIsDraggingMap(true);
      } else if (data.type === "moveend") {
        isInternalMapMoveRef.current = true;
        setIsDraggingMap(false);
        if (Number.isFinite(data.lat) && Number.isFinite(data.lng)) {
          setPinLat(data.lat);
          setPinLng(data.lng);
          debouncedReverseGeocode(data.lat, data.lng);
        }
        setTimeout(() => {
          isInternalMapMoveRef.current = false;
        }, 120);
      }
    } catch {
      // ignore parsing error
    }
  };

  // Dynamically sorted active hubs: closest to the user's current pin/detected location appears FIRST
  const sortedHubs = useMemo(() => {
    const list = activeHubs.length > 0 ? activeHubs : DEFAULT_HUBS;
    return [...list]
      .map((hub) => {
        const dist = calculateDistanceKm(pinLat, pinLng, hub.latitude, hub.longitude);
        const radius = hub.deliveryRadiusKm || 10.0;
        return {
          ...hub,
          distanceKm: dist,
          inZone: dist <= radius,
        };
      })
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [activeHubs, pinLat, pinLng]);

  // Dynamic closest hub resolution against ALL active hubs
  const nearestHubData = useMemo(() => {
    const closest = sortedHubs[0] || (activeHubs[0] || DEFAULT_HUBS[0]);
    const radius = closest.deliveryRadiusKm || 10.0;
    const inZone = closest.distanceKm <= radius;

    return {
      closestHub: closest,
      distanceKm: closest.distanceKm,
      inZone,
      name: closest.name,
    };
  }, [sortedHubs, activeHubs]);

  const isPinWithin10km = nearestHubData.inZone;
  const pinDistanceKm = nearestHubData.distanceKm;
  const currentNearestHubName = nearestHubName || nearestHubData.name;

  const hubCoords = useMemo(() => {
    if (
      nearestHubCoords &&
      Number.isFinite(nearestHubCoords.lat) &&
      Number.isFinite(nearestHubCoords.lng)
    ) {
      return nearestHubCoords;
    }
    if (nearestHubData?.closestHub) {
      return {
        lat: nearestHubData.closestHub.latitude,
        lng: nearestHubData.closestHub.longitude,
      };
    }
    return { lat: 11.2588, lng: 75.7804 };
  }, [nearestHubCoords, nearestHubData]);

  const geocodeTimerRef = useRef<any>(null);

  // Load Leaflet library & inject essential anti-blur styles for 60fps silky panning
  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;

    // 1. Inject critical Leaflet core CSS immediately into <head>
    const styleId = "leaflet-core-styles";
    if (!document.getElementById(styleId)) {
      const styleEl = document.createElement("style");
      styleEl.id = styleId;
      styleEl.textContent = `
        .leaflet-container {
          overflow: hidden !important;
          position: relative !important;
          outline: 0;
          -webkit-touch-callout: none;
          -webkit-user-select: none;
          user-select: none;
          touch-action: none;
          background-color: #E8EEE9;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        .leaflet-pane,
        .leaflet-tile,
        .leaflet-marker-icon,
        .leaflet-marker-shadow,
        .leaflet-tile-container,
        .leaflet-pane > svg,
        .leaflet-pane > canvas,
        .leaflet-zoom-box,
        .leaflet-image-layer,
        .leaflet-layer {
          position: absolute !important;
          left: 0;
          top: 0;
        }
        .leaflet-tile-container {
          pointer-events: none;
          will-change: transform;
          -webkit-backface-visibility: hidden;
          backface-visibility: hidden;
        }
        .leaflet-tile {
          user-select: none;
          -webkit-user-drag: none;
          filter: inherit;
          visibility: hidden;
          image-rendering: -webkit-optimize-contrast;
          image-rendering: auto;
          -webkit-backface-visibility: hidden;
          backface-visibility: hidden;
        }
        .leaflet-tile-loaded {
          visibility: inherit !important;
        }
        .leaflet-zoom-box {
          width: 0;
          height: 0;
          box-sizing: border-box;
          z-index: 800;
        }
        .leaflet-overlay-pane svg {
          -moz-user-select: none;
        }
        .leaflet-pane { z-index: 400; }
        .leaflet-tile-pane    { z-index: 200; }
        .leaflet-overlay-pane { z-index: 400; }
        .leaflet-shadow-pane  { z-index: 500; }
        .leaflet-marker-pane  { z-index: 600; }
        .leaflet-tooltip-pane { z-index: 650; }
        .leaflet-popup-pane   { z-index: 700; }
        .leaflet-map-pane canvas { z-index: 100; }
        .leaflet-map-pane svg    { z-index: 200; }
        .leaflet-zoom-animated {
          transform-origin: 0 0;
          will-change: transform;
        }
        @keyframes radarPulse {
          0% { transform: scale(0.95); opacity: 0.8; }
          50% { transform: scale(1.18); opacity: 0.35; }
          100% { transform: scale(0.95); opacity: 0.8; }
        }
        .pin-assembly-animated {
          transition: transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `;
      document.head.appendChild(styleEl);
    }

    // 2. Also link standard Leaflet CSS if not already present
    const linkId = "leaflet-css-cdn";
    if (!document.getElementById(linkId)) {
      const link = document.createElement("link");
      link.id = linkId;
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    // 3. Check if Leaflet JS is already on window
    if ((window as any).L) {
      setLeafletReady(true);
      return;
    }

    const scriptId = "leaflet-js-cdn";
    const existingScript = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener("load", () => setLeafletReady(true));
      return;
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;
    script.onload = () => {
      setLeafletReady(true);
    };
    document.head.appendChild(script);
  }, []);

  // Load Google Maps Autocomplete if key is available
  useEffect(() => {
    if (!visible || Platform.OS !== "web" || typeof window === "undefined") return;

    let apiKey = "";
    try {
      if (typeof process !== "undefined" && process?.env) {
        apiKey =
          process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY ||
          process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ||
          process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
          "";
      }
    } catch {
      apiKey = "";
    }

    if ((window as any).google?.maps?.places?.AutocompleteService) {
      setGoogleMapsReady(true);
      return;
    }

    if (apiKey) {
      const scriptId = "customer-google-maps-script";
      if (!document.getElementById(scriptId)) {
        const script = document.createElement("script");
        script.id = scriptId;
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`;
        script.async = true;
        script.defer = true;
        script.onload = () => {
          setGoogleMapsReady(true);
        };
        document.head.appendChild(script);
      }
    }
  }, [visible]);

  // Proactive auto-detection state
  const [isAutoDetecting, setIsAutoDetecting] = useState(false);

  const detectDeviceLocationOnOpen = async () => {
    setIsAutoDetecting(true);
    try {
      const loc = await acquireAccurateLocation({ forcePrompt: false });
      if (loc && Number.isFinite(loc.lat) && Number.isFinite(loc.lng)) {
        setPinLat(loc.lat);
        setPinLng(loc.lng);
        setInitialMapCoords({ lat: loc.lat, lng: loc.lng });
        const geo = await reverseGeocodeLocation(loc.lat, loc.lng);
        setPinAddress(geo.address || `${geo.area}, ${geo.city}`);
        if (geo.pincode) setPinPincode(geo.pincode);
      }
    } catch (err) {
      console.warn("Auto-detect location error on modal open:", err);
    } finally {
      setIsAutoDetecting(false);
    }
  };

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setStep("search");
      setSearchQuery("");
      setSuggestions([]);
      setIsLoadingSuggestions(false);
      setIsLocatingGPS(false);
      setIsDraggingMap(false);
      const safeLat = Number.isFinite(currentCoords?.lat)
        ? currentCoords.lat
        : 11.2588;
      const safeLng = Number.isFinite(currentCoords?.lng)
        ? currentCoords.lng
        : 75.7804;
      setPinLat(safeLat);
      setPinLng(safeLng);
      setInitialMapCoords({ lat: safeLat, lng: safeLng });
      setPinAddress(currentAddress || "Pinpoint your delivery location");
      setZoomLevel(16);

      // If coordinates are default Kozhikode or address is not confirmed, detect current location first!
      const isDefaultCoords =
        (Math.abs(safeLat - 11.2588) < 0.001 && Math.abs(safeLng - 75.7804) < 0.001) ||
        !currentAddress;
      if (isDefaultCoords) {
        detectDeviceLocationOnOpen();
      }

      if (Platform.OS === "web") {
        setTimeout(() => {
          try {
            searchInputRef.current?.focus?.();
          } catch {}
        }, 150);
      }
    }
  }, [visible, currentCoords, currentAddress]);

  // Synchronize Leaflet map center when coordinates update (e.g. from device GPS or suggestion tap)
  useEffect(() => {
    if (step !== "pinpoint") return;

    if (Platform.OS === "web" && leafletMapRef.current) {
      if (Number.isFinite(pinLat) && Number.isFinite(pinLng)) {
        try {
          leafletMapRef.current.setView([pinLat, pinLng], 16);
        } catch {}
      }
    } else if (Platform.OS !== "web" && mobileWebViewRef.current) {
      if (!isInternalMapMoveRef.current && Number.isFinite(pinLat) && Number.isFinite(pinLng)) {
        mobileWebViewRef.current.injectJavaScript(
          `if (window.leafletMap) { window.leafletMap.setView([${pinLat}, ${pinLng}], 16); } true;`
        );
      }
    }
  }, [pinLat, pinLng, step]);

  // Initialize & Bind Leaflet Map for Crisp 60fps Swiggy Pinpoint Experience
  useEffect(() => {
    if (
      step !== "pinpoint" ||
      !leafletReady ||
      Platform.OS !== "web" ||
      typeof window === "undefined" ||
      !mapContainerRef.current ||
      !(window as any).L
    ) {
      return;
    }

    const L = (window as any).L;

    // Destroy existing instance to prevent duplicate canvases
    if (leafletMapRef.current) {
      try {
        leafletMapRef.current.remove();
      } catch {}
      leafletMapRef.current = null;
    }

    const safeLat = Number.isFinite(pinLat) ? pinLat : 11.2588;
    const safeLng = Number.isFinite(pinLng) ? pinLng : 75.7804;

    const map = L.map(mapContainerRef.current, {
      center: [safeLat, safeLng],
      zoom: 16,
      zoomControl: false,
      attributionControl: false,
      fadeAnimation: true,
      zoomAnimation: true,
    });

    // Standard OpenStreetMap tiles (100% free, reliable, no API key required, zero watermarks)
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);

    // 10km Express Delivery Boundary Circles for all active hubs
    activeHubs.forEach((h) => {
      L.circle([h.latitude, h.longitude], {
        radius: (h.deliveryRadiusKm || 10) * 1000,
        color: "#1F4D46",
        weight: 2,
        fillColor: "#2E7D5B",
        fillOpacity: 0.12,
      }).addTo(map);
    });

    // Swiggy style lift & drop animation: pin lifts up while panning so customers clearly see the ground crosshair
    map.on("movestart", () => {
      setIsDraggingMap(true);
    });

    // As user finishes dragging the map, pin drops back down and coordinates update
    map.on("moveend", () => {
      setIsDraggingMap(false);
      const center = map.getCenter();
      if (
        center &&
        Number.isFinite(center.lat) &&
        Number.isFinite(center.lng)
      ) {
        const newLat = Number(center.lat.toFixed(6));
        const newLng = Number(center.lng.toFixed(6));
        setPinLat(newLat);
        setPinLng(newLng);
        debouncedReverseGeocode(newLat, newLng);
      }
    });

    // Clicking anywhere on the map also smoothly pans to that exact spot
    map.on("click", (e: any) => {
      if (e?.latlng && Number.isFinite(e.latlng.lat)) {
        map.panTo(e.latlng);
      }
    });

    leafletMapRef.current = map;

    // Invalidate size across render cycles to avoid any tile stretching or layout offset
    const invalidate = () => {
      if (leafletMapRef.current) {
        try {
          leafletMapRef.current.invalidateSize({ animate: false });
        } catch {}
      }
    };
    requestAnimationFrame(invalidate);
    const t1 = setTimeout(invalidate, 80);
    const t2 = setTimeout(invalidate, 250);
    window.addEventListener("resize", invalidate);

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
  }, [step, leafletReady]);

  // Debounced reverse geocoding to prevent rapid API requests during map movement
  const debouncedReverseGeocode = (lat: number, lng: number) => {
    if (geocodeTimerRef.current) {
      clearTimeout(geocodeTimerRef.current);
    }
    geocodeTimerRef.current = setTimeout(() => {
      reverseGeocode(lat, lng);
    }, 350);
  };

  // Reverse geocode coordinate to human-readable address
  const reverseGeocode = async (lat: number, lng: number) => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    setIsReverseGeocoding(true);

    // 1. LocationIQ Reverse Geocoder (High-precision doorstep POI & building names)
    if (LOCATIONIQ_KEY) {
      try {
        const res = await fetch(
          `https://us1.locationiq.com/v1/reverse?key=${LOCATIONIQ_KEY}&lat=${lat}&lon=${lng}&format=json`
        );
        const data = await res.json();
        if (data && !data.error) {
          const addr = data.address || {};
          const poi =
            addr.restaurant ||
            addr.building ||
            addr.mall ||
            addr.shop ||
            addr.hotel ||
            addr.amenity ||
            addr.leisure ||
            data.display_place;
          const road = addr.road || addr.street;
          const neighbourhood = addr.neighbourhood || addr.suburb || addr.quarter;
          const city = addr.city || addr.town || addr.county || "Kozhikode";

          const cleanParts = [poi, road, neighbourhood, city]
            .filter(Boolean)
            .filter((val, idx, arr) => arr.indexOf(val) === idx);

          const finalFormatted =
            cleanParts.length >= 2
              ? cleanParts.slice(0, 3).join(", ")
              : data.display_name
              ? data.display_name.split(",").slice(0, 3).join(",").trim()
              : `Doorstep Pin (${lat.toFixed(4)}, ${lng.toFixed(4)})`;

          const rawPincode = (data.address?.postcode || "").replace(/\D/g, "");
          if (rawPincode && rawPincode.length === 6) {
            setPinPincode(rawPincode);
          }

          setPinAddress(finalFormatted);
          setIsReverseGeocoding(false);
          return;
        }
      } catch (err) {
        console.warn("LocationIQ reverse geocode note:", err);
      }
    }

    // 2. Google Maps Geocoder if ready
    if (Platform.OS === "web" && (window as any)?.google?.maps?.Geocoder) {
      try {
        const geocoder = new (window as any).google.maps.Geocoder();
        geocoder.geocode(
          { location: { lat, lng } },
          (results: any, status: any) => {
            setIsReverseGeocoding(false);
            if (status === "OK" && results?.[0]) {
              setPinAddress(results[0].formatted_address);
              const postComp = results[0].address_components?.find((c: any) =>
                c.types?.includes("postal_code")
              );
              if (postComp?.long_name) {
                const cleanPin = postComp.long_name.replace(/\D/g, "");
                if (cleanPin.length === 6) setPinPincode(cleanPin);
              }
            }
          }
        );
        return;
      } catch {
        // fallback
      }
    }

    // 3. Nominatim fallback
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      const data = await res.json();
      if (data?.display_name) {
        const parts = data.display_name.split(",");
        const clean = parts.slice(0, 4).join(",").trim();
        setPinAddress(clean);
        const nomPin = (data.address?.postcode || "").replace(/\D/g, "");
        if (nomPin && nomPin.length === 6) {
          setPinPincode(nomPin);
        }
      }
    } catch {
      // keep coordinate text
    } finally {
      setIsReverseGeocoding(false);
    }
  };

  // Fallback geocoding search using Photon, local areas & Nominatim
  const fallbackSearch = async (query: string) => {
    const qLower = query.toLowerCase();
    const localMatches: LocationSuggestion[] = activeHubs
      .filter(
        (h: BackendHub) =>
          h.name.toLowerCase().includes(qLower) ||
          (h.address && h.address.toLowerCase().includes(qLower)) ||
          (h.code && h.code.toLowerCase().includes(qLower))
      )
      .map((h: BackendHub, idx: number) => ({
        id: `hub-match-${h.id || idx}`,
        title: h.name,
        subtitle: h.address || `${h.deliveryRadiusKm || 10}km Express Hub Zone`,
        lat: h.latitude,
        lng: h.longitude,
        distanceKm: calculateDistanceKm(h.latitude, h.longitude, hubCoords.lat, hubCoords.lng),
        source: "preset" as const,
      }));

    try {
      const photonRes = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=7&lat=${hubCoords.lat}&lon=${hubCoords.lng}`
      );
      const photonData = await photonRes.json();
      if (photonData?.features && photonData.features.length > 0) {
        const mapped: LocationSuggestion[] = photonData.features.map(
          (feat: any, idx: number) => {
            const props = feat.properties || {};
            const coords = feat.geometry?.coordinates || [75.7804, 11.2588];
            const lng = coords[0];
            const lat = coords[1];
            const name = props.name || props.street || "Location";
            const secondary = [props.city || props.district, props.state, "India"]
              .filter(Boolean)
              .join(", ");
            const dist = calculateDistanceKm(lat, lng, hubCoords.lat, hubCoords.lng);
            return {
              id: `photon-${idx}-${lat}`,
              title: name,
              subtitle: secondary || "Kerala, India",
              lat,
              lng,
              distanceKm: dist,
              source: "osm" as const,
            };
          }
        );

        const combined = [
          ...localMatches,
          ...mapped.filter(
            (m) =>
              !localMatches.some(
                (l) => l.title.toLowerCase() === m.title.toLowerCase()
              )
          ),
        ];
        setSuggestions(combined);
        return;
      }
    } catch {
      // fallback
    }

    if (localMatches.length > 0) {
      setSuggestions(localMatches);
      return;
    }

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query + " Kerala India"
        )}&countrycodes=in&limit=7`
      );
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const mapped: LocationSuggestion[] = data.map((item: any, idx: number) => {
          const parts = item.display_name.split(",");
          const title = parts[0]?.trim() || item.name;
          const subtitle = parts.slice(1, 4).join(",").trim();
          const lat = Number(parseFloat(item.lat).toFixed(6));
          const lng = Number(parseFloat(item.lon).toFixed(6));
          const dist = calculateDistanceKm(lat, lng, hubCoords.lat, hubCoords.lng);
          return {
            id: `osm-${item.place_id || idx}`,
            title,
            subtitle,
            lat,
            lng,
            distanceKm: dist,
            source: "osm" as const,
          };
        });
        setSuggestions([...localMatches, ...mapped]);
      } else {
        setSuggestions(localMatches);
      }
    } catch (err) {
      console.warn("Geocoding search failed:", err);
      setSuggestions(localMatches);
    }
  };

  // Live suggestions search effect with debouncing
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed || trimmed.length < 2) {
      setSuggestions([]);
      setIsLoadingSuggestions(false);
      return;
    }

    setIsLoadingSuggestions(true);
    const debounceTimer = setTimeout(() => {
      // 1. LocationIQ Autocomplete (Fast, dedicated 5,000 requests/day, India-optimized)
      if (LOCATIONIQ_KEY) {
        try {
          fetch(
            `https://api.locationiq.com/v1/autocomplete?key=${LOCATIONIQ_KEY}&q=${encodeURIComponent(
              trimmed
            )}&countrycodes=in&limit=8`
          )
            .then((r) => r.json())
            .then((data) => {
              if (Array.isArray(data) && data.length > 0) {
                const mapped: LocationSuggestion[] = data.map(
                  (item: any, idx: number) => {
                    const rawLat = parseFloat(item.lat);
                    const rawLng = parseFloat(item.lon);
                    const lat = Number.isFinite(rawLat)
                      ? Number(rawLat.toFixed(6))
                      : hubCoords.lat;
                    const lng = Number.isFinite(rawLng)
                      ? Number(rawLng.toFixed(6))
                      : hubCoords.lng;
                    const dist = calculateDistanceKm(
                      lat,
                      lng,
                      hubCoords.lat,
                      hubCoords.lng
                    );
                    return {
                      id: `liq-${item.place_id || idx}`,
                      title:
                        item.display_place ||
                        item.address?.name ||
                        item.display_name.split(",")[0],
                      subtitle: item.display_address || item.display_name,
                      lat,
                      lng,
                      distanceKm: dist,
                      source: "locationiq" as const,
                    };
                  }
                );
                setSuggestions(mapped);
                setIsLoadingSuggestions(false);
              } else {
                fallbackSearch(trimmed).finally(() =>
                  setIsLoadingSuggestions(false)
                );
              }
            })
            .catch(() => {
              fallbackSearch(trimmed).finally(() =>
                setIsLoadingSuggestions(false)
              );
            });
          return;
        } catch {
          // fallback
        }
      }

      // 2. Google Places Autocomplete fallback
      if (
        Platform.OS === "web" &&
        (window as any)?.google?.maps?.places?.AutocompleteService
      ) {
        try {
          const service = new (window as any).google.maps.places.AutocompleteService();
          service.getPlacePredictions(
            {
              input: trimmed,
              componentRestrictions: { country: "in" },
            },
            (predictions: any, status: any) => {
              if (
                status === (window as any).google.maps.places.PlacesServiceStatus.OK &&
                predictions &&
                predictions.length > 0
              ) {
                const mapped: LocationSuggestion[] = predictions.map((p: any) => ({
                  id: p.place_id,
                  title:
                    p.structured_formatting?.main_text ||
                    p.description.split(",")[0],
                  subtitle:
                    p.structured_formatting?.secondary_text || p.description,
                  placeId: p.place_id,
                  source: "google",
                }));
                setSuggestions(mapped);
                setIsLoadingSuggestions(false);
              } else {
                fallbackSearch(trimmed).finally(() =>
                  setIsLoadingSuggestions(false)
                );
              }
            }
          );
          return;
        } catch (err) {
          console.warn("Google Places Autocomplete error:", err);
        }
      }

      fallbackSearch(trimmed).finally(() => setIsLoadingSuggestions(false));
    }, 250);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery, hubCoords.lat, hubCoords.lng]);

  // Handle "Use Current Location" (GPS) -> Prompts system GPS permission & opens Swiggy pinpoint map
  const handleUseCurrentLocation = async () => {
    setIsLocatingGPS(true);
    try {
      const loc = await acquireAccurateLocation({ forcePrompt: true });
      if (loc && Number.isFinite(loc.lat) && Number.isFinite(loc.lng)) {
        const lat = loc.lat;
        const lng = loc.lng;

        setInitialMapCoords({ lat, lng });
        setPinLat(lat);
        setPinLng(lng);
        setStep("pinpoint");

        if (Platform.OS === "web" && leafletMapRef.current) {
          try {
            leafletMapRef.current.setView([lat, lng], 16);
          } catch {}
        } else if (Platform.OS !== "web" && mobileWebViewRef.current) {
          mobileWebViewRef.current.injectJavaScript(
            `if (window.leafletMap) { window.leafletMap.setView([${lat}, ${lng}], 16); } true;`
          );
        }

        reverseGeocodeLocation(lat, lng)
          .then((geo) => {
            setPinAddress(geo.address || `${geo.area}, ${geo.city}`);
            if (geo.pincode) setPinPincode(geo.pincode);
          })
          .catch(() => {
            setPinAddress(`${lat}, ${lng}`);
          });
      } else {
        Alert.alert(
          "Location Permission",
          "Could not detect exact GPS coordinates. Please enable device GPS permissions or choose your nearest delivery hub from the list below.",
          [{ text: "OK" }]
        );
      }
    } catch (err: any) {
      console.warn("Use current location error:", err);
      Alert.alert(
        "Location Error",
        "Could not detect location. Please choose your hub from the list below."
      );
    } finally {
      setIsLocatingGPS(false);
    }
  };

  // Re-center button on map
  const handleRecenterGPS = async () => {
    setIsLocatingGPS(true);
    try {
      const loc = await acquireAccurateLocation({ forcePrompt: true });
      if (loc && Number.isFinite(loc.lat) && Number.isFinite(loc.lng)) {
        setPinLat(loc.lat);
        setPinLng(loc.lng);
        if (Platform.OS === "web" && leafletMapRef.current) {
          try {
            leafletMapRef.current.flyTo([loc.lat, loc.lng], 16);
          } catch {}
        } else if (Platform.OS !== "web" && mobileWebViewRef.current) {
          mobileWebViewRef.current.injectJavaScript(
            `if (window.leafletMap) { window.leafletMap.flyTo([${loc.lat}, ${loc.lng}], 16); } true;`
          );
        }
        reverseGeocodeLocation(loc.lat, loc.lng)
          .then((geo) => {
            setPinAddress(geo.address || `${geo.area}, ${geo.city}`);
            if (geo.pincode) setPinPincode(geo.pincode);
          })
          .catch(() => {
            setPinAddress(`${loc.lat}, ${loc.lng}`);
          });
      }
    } catch {
      // ignore
    } finally {
      setIsLocatingGPS(false);
    }
  };

  // Zoom controls
  const handleZoomIn = () => {
    if (Platform.OS === "web" && leafletMapRef.current) {
      leafletMapRef.current.zoomIn();
    } else if (Platform.OS !== "web" && mobileWebViewRef.current) {
      mobileWebViewRef.current.injectJavaScript(
        `if (window.leafletMap) { window.leafletMap.zoomIn(); } true;`
      );
    } else {
      setZoomLevel((z) => Math.min(18, z + 1));
    }
  };

  const handleZoomOut = () => {
    if (Platform.OS === "web" && leafletMapRef.current) {
      leafletMapRef.current.zoomOut();
    } else if (Platform.OS !== "web" && mobileWebViewRef.current) {
      mobileWebViewRef.current.injectJavaScript(
        `if (window.leafletMap) { window.leafletMap.zoomOut(); } true;`
      );
    } else {
      setZoomLevel((z) => Math.max(10, z - 1));
    }
  };

  // Handle tapping a search suggestion -> opens Swiggy-style pinpoint map
  const handleSelectSuggestion = (item: LocationSuggestion) => {
    if (
      item.placeId &&
      Platform.OS === "web" &&
      (window as any)?.google?.maps?.Geocoder
    ) {
      setIsLoadingSuggestions(true);
      const geocoder = new (window as any).google.maps.Geocoder();
      geocoder.geocode({ placeId: item.placeId }, (results: any, status: any) => {
        setIsLoadingSuggestions(false);
        if (status === "OK" && results?.[0]) {
          const loc = results[0].geometry.location;
          const lat = Number(loc.lat().toFixed(6));
          const lng = Number(loc.lng().toFixed(6));
          const fullAddress = `${item.title}, ${item.subtitle}`;
          setInitialMapCoords({ lat, lng });
          setPinLat(lat);
          setPinLng(lng);
          setPinAddress(fullAddress);
          setStep("pinpoint");
        } else {
          setInitialMapCoords({ lat: hubCoords.lat, lng: hubCoords.lng });
          setPinLat(hubCoords.lat);
          setPinLng(hubCoords.lng);
          setPinAddress(item.title);
          setStep("pinpoint");
        }
      });
      return;
    }

    if (
      item.lat !== undefined &&
      item.lng !== undefined &&
      Number.isFinite(item.lat) &&
      Number.isFinite(item.lng)
    ) {
      const fullAddress = item.subtitle
        ? `${item.title}, ${item.subtitle}`
        : item.title;
      setInitialMapCoords({ lat: item.lat, lng: item.lng });
      setPinLat(item.lat);
      setPinLng(item.lng);
      setPinAddress(fullAddress);
      setStep("pinpoint");
    }
  };

  // Handle tapping a real hub -> opens Swiggy-style pinpoint map centered on that hub
  const handleSelectHub = (hub: BackendHub) => {
    setInitialMapCoords({ lat: hub.latitude, lng: hub.longitude });
    setPinLat(hub.latitude);
    setPinLng(hub.longitude);
    setPinAddress(`${hub.name}, ${hub.address}`);
    setStep("pinpoint");

    if (Platform.OS === "web" && leafletMapRef.current) {
      try {
        leafletMapRef.current.setView([hub.latitude, hub.longitude], 16);
      } catch {}
    } else if (Platform.OS !== "web" && mobileWebViewRef.current) {
      mobileWebViewRef.current.injectJavaScript(
        `if (window.leafletMap) { window.leafletMap.setView([${hub.latitude}, ${hub.longitude}], 16); } true;`
      );
    }
  };

  // Final Confirmation: Save location & close modal
  const handleConfirmLocation = () => {
    const finalLat = Number.isFinite(pinLat) ? pinLat : 11.2588;
    const finalLng = Number.isFinite(pinLng) ? pinLng : 75.7804;
    onLocationConfirm({ lat: finalLat, lng: finalLng }, pinAddress, pinPincode);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* STEP 1: DIRECT SEARCH & GPS SELECTION */}
          {step === "search" ? (
            <>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerTitleWrap}>
                  <MapPin size={20} color={colors.primary} />
                  <Text style={styles.headerTitle}>Select Delivery Location</Text>
                </View>
                <Pressable
                  style={styles.closeButton}
                  onPress={onClose}
                  accessibilityLabel="Close location picker"
                >
                  <X size={18} color={colors.textMuted} />
                </Pressable>
              </View>

              {/* Direct Search Bar with live Google Maps suggestions */}
              <View style={styles.searchBarContainer}>
                <View style={styles.searchInputWrap}>
                  <Search size={18} color={colors.primary} />
                  <TextInput
                    ref={searchInputRef}
                    style={styles.searchInput}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search area, street, landmark, city..."
                    placeholderTextColor={colors.textSoft}
                    returnKeyType="search"
                    autoCorrect={false}
                  />
                  {isLoadingSuggestions ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : searchQuery.length > 0 ? (
                    <Pressable
                      onPress={() => setSearchQuery("")}
                      style={styles.clearSearchBtn}
                    >
                      <X size={14} color={colors.textSoft} />
                    </Pressable>
                  ) : null}
                </View>
              </View>

              {/* Current Address Tag (Only when user has already selected an address) */}
              {currentAddress && currentAddress.trim().length > 0 ? (
                <View style={styles.currentAddressTag}>
                  <Text style={styles.currentAddressLabel}>SELECTED LOCATION:</Text>
                  <Text style={styles.currentAddressValue} numberOfLines={1}>
                    {currentAddress}
                  </Text>
                </View>
              ) : null}

              <ScrollView
                style={styles.scrollArea}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {/* Active Search Suggestions */}
                {searchQuery.trim().length >= 2 ? (
                  <View style={styles.sectionWrap}>
                    <View style={styles.suggestionsHeader}>
                      <View style={styles.suggestionTitleWrap}>
                        <Sparkles size={14} color={colors.primary} />
                        <Text style={styles.sectionHeaderTitle}>
                          {LOCATIONIQ_KEY
                            ? "LOCATIONIQ LIVE SUGGESTIONS"
                            : googleMapsReady
                            ? "GOOGLE MAPS SUGGESTIONS"
                            : "MATCHING LOCATIONS"}
                        </Text>
                      </View>
                      <Text style={styles.suggestionCount}>
                        {suggestions.length} found
                      </Text>
                    </View>

                    {suggestions.length === 0 && !isLoadingSuggestions ? (
                      <View style={styles.emptyState}>
                        <AlertCircle size={28} color={colors.textSoft} />
                        <Text style={styles.emptyStateTitle}>
                          No locations found for "{searchQuery}"
                        </Text>
                        <Text style={styles.emptyStateDesc}>
                          Try typing a landmark, beach, or neighborhood (e.g.,
                          Kozhikode, Mavoor, Beach, HiLITE, Palayam).
                        </Text>
                      </View>
                    ) : (
                      suggestions.map((item) => (
                        <Pressable
                          key={item.id}
                          style={styles.suggestionItem}
                          onPress={() => handleSelectSuggestion(item)}
                        >
                          <View style={styles.suggestionIconWrap}>
                            <MapPin size={18} color={colors.primary} />
                          </View>
                          <View style={styles.suggestionDetails}>
                            <Text style={styles.suggestionMainText} numberOfLines={1}>
                              {item.title}
                            </Text>
                            <Text
                              style={styles.suggestionSecondaryText}
                              numberOfLines={1}
                            >
                              {item.subtitle}
                            </Text>
                          </View>
                          {item.distanceKm !== undefined && (
                            <View
                              style={[
                                styles.distanceBadge,
                                item.distanceKm <= 10.0
                                  ? styles.distanceBadgeGreen
                                  : styles.distanceBadgeOrange,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.distanceBadgeText,
                                  item.distanceKm <= 10.0
                                    ? styles.distanceBadgeTextGreen
                                    : styles.distanceBadgeTextOrange,
                                ]}
                              >
                                {item.distanceKm <= 10.0 ? "10km Zone" : `${item.distanceKm}km`}
                              </Text>
                            </View>
                          )}
                          <ChevronRight size={16} color={colors.textSoft} />
                        </Pressable>
                      ))
                    )}
                  </View>
                ) : (
                  /* DEFAULT: USE CURRENT LOCATION (GPS) + POPULAR HUBS */
                  <>
                    {/* Option 1: Use Current Location (GPS) -> Opens Swiggy Pinpoint Map */}
                    <Pressable
                      style={styles.gpsOptionCard}
                      onPress={handleUseCurrentLocation}
                      disabled={isLocatingGPS}
                    >
                      <View style={styles.gpsIconCircle}>
                        {isLocatingGPS ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Navigation size={22} color="#FFFFFF" />
                        )}
                      </View>
                      <View style={styles.gpsContent}>
                        <Text style={styles.gpsTitle}>Use Current Location</Text>
                        <Text style={styles.gpsSubtitle}>
                          {isLocatingGPS
                            ? "Acquiring GPS location..."
                            : "Pinpoint on map with device GPS for exact doorstep delivery"}
                        </Text>
                      </View>
                      <ChevronRight size={18} color={colors.primary} />
                    </Pressable>

                    {/* Divider */}
                    <View style={styles.dividerWrap}>
                      <View style={styles.dividerLine} />
                      <Text style={styles.dividerText}>ACTIVE HUBS & DELIVERY ZONES</Text>
                      <View style={styles.dividerLine} />
                    </View>

                    {/* Proactive GPS auto-detect status banner */}
                    {isAutoDetecting && (
                      <View style={styles.autoDetectBanner}>
                        <ActivityIndicator size="small" color={colors.primary} />
                        <Text style={styles.autoDetectText}>
                          Detecting your location to show nearest delivery hub...
                        </Text>
                      </View>
                    )}

                    {/* Active Real Hubs Quick Select (Sorted nearest first) */}
                    <View style={styles.presetList}>
                      {sortedHubs.map((hub, idx) => {
                        return (
                          <Pressable
                            key={hub.id || hub.name}
                            style={[
                              styles.presetItem,
                              idx === 0 && hub.inZone && styles.presetItemNearest,
                            ]}
                            onPress={() => handleSelectHub(hub)}
                          >
                            <View
                              style={[
                                styles.presetIcon,
                                idx === 0 && hub.inZone && styles.presetIconNearest,
                              ]}
                            >
                              <Building
                                size={16}
                                color={idx === 0 && hub.inZone ? "#FFFFFF" : colors.primary}
                              />
                            </View>
                            <View style={styles.presetDetails}>
                              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                <Text style={styles.presetName} numberOfLines={1}>
                                  {hub.name}
                                </Text>
                                {idx === 0 && hub.inZone && (
                                  <View style={styles.nearestPill}>
                                    <Text style={styles.nearestPillText}>NEAREST</Text>
                                  </View>
                                )}
                              </View>
                              <Text style={styles.presetArea} numberOfLines={1}>
                                {hub.address} · {hub.city}
                              </Text>
                            </View>
                            <View
                              style={[
                                styles.zoneBadge,
                                hub.inZone ? styles.zoneBadgeGreen : styles.zoneBadgeMuted,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.zoneBadgeText,
                                  hub.inZone ? styles.zoneBadgeTextGreen : styles.zoneBadgeTextMuted,
                                ]}
                              >
                                {hub.distanceKm > 0
                                  ? `${hub.distanceKm}km away`
                                  : `${hub.deliveryRadiusKm || 10}km Zone`}
                              </Text>
                            </View>
                            <ChevronRight size={16} color={colors.textSoft} />
                          </Pressable>
                        );
                      })}
                    </View>
                  </>
                )}
              </ScrollView>
            </>
          ) : (
            /* STEP 2: SWIGGY-STYLE EXACT PINPOINT ON MAP SCREEN (CRISP & UNBLURRED) */
            <View style={styles.pinpointContainer}>
              {/* Header with Back to Search */}
              <View style={styles.header}>
                <Pressable
                  style={styles.backButton}
                  onPress={() => setStep("search")}
                >
                  <ArrowLeft size={18} color={colors.primaryDark} />
                  <Text style={styles.backButtonText}>Back to Search</Text>
                </Pressable>
                <Pressable style={styles.closeButton} onPress={onClose}>
                  <X size={18} color={colors.textMuted} />
                </Pressable>
              </View>

              {/* Crisp Native Map Container with Swiggy Center Pin Overlay */}
              <View style={styles.mapCanvasWrap}>
                {Platform.OS === "web" ? (
                  <div
                    ref={mapContainerRef}
                    style={{
                      width: "100%",
                      height: "100%",
                      backgroundColor: "#DCE5DF",
                    }}
                  />
                ) : (
                  <WebView
                    ref={mobileWebViewRef}
                    source={{
                      html: getMobileLeafletHtml(
                        initialMapCoords.lat,
                        initialMapCoords.lng,
                        activeHubs
                      ),
                    }}
                    style={styles.mobileWebView}
                    onMessage={handleWebViewMessage}
                    javaScriptEnabled
                    domStorageEnabled
                    startInLoadingState
                    renderLoading={() => (
                      <View style={styles.webViewLoader}>
                        <ActivityIndicator size="small" color={colors.primary} />
                      </View>
                    )}
                    showsHorizontalScrollIndicator={false}
                    showsVerticalScrollIndicator={false}
                    scrollEnabled={false}
                    bounces={false}
                    overScrollMode="never"
                  />
                )}

                {/* 1. Precision Ground Target Reticle (Always anchored at exact map center 50%, 50%) */}
                <View
                  style={[
                    styles.groundReticleWrap,
                    { pointerEvents: "none" as any },
                  ]}
                >
                  {/* Radar Pulse Ring */}
                  <View
                    style={[
                      styles.radarRing,
                      isDraggingMap && styles.radarRingDragging,
                    ]}
                  />
                  {/* 4 Crosshair Surveyor Ticks */}
                  <View
                    style={[
                      styles.crosshairTick,
                      styles.crosshairTickTop,
                      isDraggingMap && styles.crosshairTickDragging,
                    ]}
                  />
                  <View
                    style={[
                      styles.crosshairTick,
                      styles.crosshairTickBottom,
                      isDraggingMap && styles.crosshairTickDragging,
                    ]}
                  />
                  <View
                    style={[
                      styles.crosshairTick,
                      styles.crosshairTickLeft,
                      isDraggingMap && styles.crosshairTickDragging,
                    ]}
                  />
                  <View
                    style={[
                      styles.crosshairTick,
                      styles.crosshairTickRight,
                      isDraggingMap && styles.crosshairTickDragging,
                    ]}
                  />
                  {/* Center Bullseye Core Dot */}
                  <View
                    style={[
                      styles.bullseyeDot,
                      isDraggingMap && styles.bullseyeDotDragging,
                    ]}
                  />
                  {/* Ground Contact Shadow */}
                  <View
                    style={[
                      styles.groundShadow,
                      isDraggingMap && styles.groundShadowDragging,
                    ]}
                  />
                </View>

                {/* 2. Swiggy/Google Maps Elevated Needle Pin + Floating Tooltip */}
                <View
                  style={[
                    styles.pinAssemblyWrap,
                    isDraggingMap && styles.pinAssemblyLifted,
                    { pointerEvents: "none" as any },
                  ]}
                >
                  {/* Live Tooltip Bubble */}
                  <View
                    style={[
                      styles.swiggyTooltip,
                      isDraggingMap && styles.swiggyTooltipDragging,
                    ]}
                  >
                    <View
                      style={[
                        styles.livePulseDot,
                        isDraggingMap && styles.livePulseDotDragging,
                      ]}
                    />
                    <Text style={styles.swiggyTooltipText} numberOfLines={1}>
                      {isDraggingMap
                        ? "Point at your building or gate"
                        : "Order will be delivered here"}
                    </Text>
                    <View
                      style={[
                        styles.swiggyTooltipArrow,
                        isDraggingMap && styles.swiggyTooltipArrowDragging,
                      ]}
                    />
                  </View>

                  {/* Pin Head Teardrop */}
                  <View
                    style={[
                      styles.pinHead,
                      isDraggingMap && styles.pinHeadDragging,
                    ]}
                  >
                    <View style={styles.pinHeadInner}>
                      <MapPin size={17} color="#FFFFFF" />
                    </View>
                  </View>

                  {/* Sharp Needle Tip pointing directly down into Bullseye */}
                  <View
                    style={[
                      styles.pinNeedle,
                      isDraggingMap && styles.pinNeedleDragging,
                    ]}
                  />
                </View>

                {/* Tap / drag instruction hint pill (Top Left to avoid colliding with GPS button) */}
                <View
                  style={[
                    styles.mapHintBadge,
                    { pointerEvents: "none" as any },
                  ]}
                >
                  <Sparkles size={11} color="#F2C94C" />
                  <Text style={styles.mapHintText} numberOfLines={1}>
                    Drag map to position pin
                  </Text>
                </View>

                {/* Map Zoom Controls (Top Right) */}
                <View style={styles.mapControls}>
                  <Pressable
                    style={styles.mapControlButton}
                    onPress={handleZoomIn}
                  >
                    <ZoomIn size={16} color={colors.primaryDark} />
                  </Pressable>
                  <Pressable
                    style={styles.mapControlButton}
                    onPress={handleZoomOut}
                  >
                    <ZoomOut size={16} color={colors.primaryDark} />
                  </Pressable>
                </View>

                {/* Floating Action: Re-center to GPS (Bottom Right) */}
                <Pressable
                  style={styles.recenterGpsButton}
                  onPress={handleRecenterGPS}
                  disabled={isLocatingGPS}
                >
                  {isLocatingGPS ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <>
                      <Navigation size={14} color={colors.primary} />
                      <Text style={styles.recenterGpsText}>My GPS</Text>
                    </>
                  )}
                </Pressable>
              </View>

              {/* Serviceability & Distance Status Card */}
              <View
                style={[
                  styles.serviceStatusCard,
                  isPinWithin10km
                    ? styles.serviceStatusCardGreen
                    : styles.serviceStatusCardOrange,
                ]}
              >
                {isPinWithin10km ? (
                  <CheckCircle2 size={18} color="#2E7D5B" />
                ) : (
                  <AlertCircle size={18} color="#BE4436" />
                )}
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.serviceStatusTitle,
                      isPinWithin10km
                        ? styles.serviceStatusTitleGreen
                        : styles.serviceStatusTitleOrange,
                    ]}
                    numberOfLines={1}
                  >
                    {isPinWithin10km
                      ? "15-Minute Express Delivery Available"
                      : "Outside 10km Express Zone"}
                  </Text>
                  <Text style={styles.serviceStatusDesc} numberOfLines={1}>
                    {isPinWithin10km
                      ? `${pinDistanceKm} km from ${currentNearestHubName} · Doorstep dispatch`
                      : `${pinDistanceKm} km from ${currentNearestHubName} · Service launching soon`}
                  </Text>
                </View>
              </View>

              {/* Selected Pin Address Preview */}
              <View style={styles.addressPreviewWrap}>
                <View style={styles.addressPreviewHeaderRow}>
                  <Text style={styles.addressPreviewLabel}>DELIVERING TO:</Text>
                  {isReverseGeocoding && (
                    <ActivityIndicator size="small" color={colors.primary} />
                  )}
                </View>
                <Text
                  style={styles.addressPreviewText}
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  {pinAddress}
                </Text>
              </View>

              {/* Confirm Location Button */}
              <Pressable
                style={styles.confirmLocationButton}
                onPress={handleConfirmLocation}
              >
                <Text style={styles.confirmLocationButtonText}>
                  Confirm Location & Proceed
                </Text>
                <CheckCircle2 size={18} color="#FFFFFF" />
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 46, 41, 0.65)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: Platform.OS === "ios" ? 38 : 24,
    maxHeight: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.primaryDark,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.primaryDark,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBarContainer: {
    marginTop: 14,
    marginBottom: 8,
  },
  searchInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1.5,
    borderColor: colors.primary,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    padding: 0,
    fontWeight: "600",
  },
  clearSearchBtn: {
    padding: 4,
  },
  currentAddressTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EAF3EE",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
  },
  currentAddressLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.primary,
    letterSpacing: 0.5,
  },
  currentAddressValue: {
    flex: 1,
    fontSize: 11,
    fontWeight: "700",
    color: colors.primaryDark,
  },
  scrollArea: {
    maxHeight: 460,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  sectionWrap: {
    marginTop: 4,
  },
  suggestionsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    marginTop: 4,
  },
  suggestionTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sectionHeaderTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.textSoft,
    letterSpacing: 0.8,
  },
  suggestionCount: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primary,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: colors.background,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  suggestionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryTint,
    alignItems: "center",
    justifyContent: "center",
  },
  suggestionDetails: {
    flex: 1,
  },
  suggestionMainText: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.primaryDark,
    marginBottom: 2,
  },
  suggestionSecondaryText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  distanceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  distanceBadgeGreen: {
    backgroundColor: "#E3F1E9",
  },
  distanceBadgeOrange: {
    backgroundColor: "#FBE7E3",
  },
  distanceBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  distanceBadgeTextGreen: {
    color: "#2E7D5B",
  },
  distanceBadgeTextOrange: {
    color: "#BE4436",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 36,
    paddingHorizontal: 20,
    gap: 8,
  },
  emptyStateTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
  },
  emptyStateDesc: {
    fontSize: 12,
    color: colors.textSoft,
    textAlign: "center",
    lineHeight: 18,
  },
  gpsOptionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F2F8F5",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: colors.primary,
    gap: 14,
    marginTop: 4,
  },
  gpsIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  gpsContent: {
    flex: 1,
  },
  gpsTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.primaryDark,
    marginBottom: 2,
  },
  gpsSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 15,
  },
  dividerWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.textSoft,
    letterSpacing: 0.8,
  },
  presetList: {
    gap: 8,
  },
  presetItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  presetIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: colors.primaryTint,
    alignItems: "center",
    justifyContent: "center",
  },
  presetDetails: {
    flex: 1,
  },
  presetName: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primaryDark,
    marginBottom: 2,
  },
  presetArea: {
    fontSize: 11,
    color: colors.textMuted,
  },
  zoneBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  zoneBadgeGreen: {
    backgroundColor: "#E3F1E9",
  },
  zoneBadgeOrange: {
    backgroundColor: "#FBE7E3",
  },
  zoneBadgeMuted: {
    backgroundColor: "#F1F1F1",
  },
  zoneBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  zoneBadgeTextGreen: {
    color: "#2E7D5B",
  },
  zoneBadgeTextOrange: {
    color: "#BE4436",
  },
  zoneBadgeTextMuted: {
    color: "#7E8B85",
  },
  autoDetectBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#EBF3EF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#D2E4DA",
  },
  autoDetectText: {
    fontSize: 11,
    color: colors.primaryDark,
    fontWeight: "600",
    flexShrink: 1,
  },
  presetItemNearest: {
    borderColor: colors.primary,
    backgroundColor: "#F4F8F5",
  },
  presetIconNearest: {
    backgroundColor: colors.primary,
  },
  nearestPill: {
    backgroundColor: "#2E7D5B",
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  nearestPillText: {
    color: "#FFFFFF",
    fontSize: 8.5,
    fontWeight: "900",
    letterSpacing: 0.5,
  },

  /* Pinpoint Map Screen Styles (Swiggy style - Crisp Multi-tile) */
  pinpointContainer: {
    marginTop: 4,
    gap: 10,
  },
  mapCanvasWrap: {
    height: 245,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: colors.primary,
    marginTop: 6,
    position: "relative",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  mapFallbackBg: {
    flex: 1,
    backgroundColor: "#DCE5DF",
  },
  mobileWebView: {
    flex: 1,
    backgroundColor: "#DCE5DF",
  },
  webViewLoader: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#DCE5DF",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
  },
  /* Ground Target Reticle */
  groundReticleWrap: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 36,
    height: 36,
    transform: [{ translateX: -18 }, { translateY: -18 }],
    alignItems: "center",
    justifyContent: "center",
    zIndex: 998,
  },
  radarRing: {
    position: "absolute",
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "rgba(31, 77, 70, 0.45)",
    backgroundColor: "rgba(31, 77, 70, 0.08)",
  },
  radarRingDragging: {
    borderColor: "#E03546",
    backgroundColor: "rgba(224, 53, 70, 0.16)",
    transform: [{ scale: 1.2 }],
  },
  crosshairTick: {
    position: "absolute",
    backgroundColor: "#1F4D46",
  },
  crosshairTickDragging: {
    backgroundColor: "#E03546",
  },
  crosshairTickTop: {
    top: -5,
    width: 2,
    height: 6,
  },
  crosshairTickBottom: {
    bottom: -5,
    width: 2,
    height: 6,
  },
  crosshairTickLeft: {
    left: -5,
    width: 6,
    height: 2,
  },
  crosshairTickRight: {
    right: -5,
    width: 6,
    height: 2,
  },
  bullseyeDot: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#1F4D46",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
    zIndex: 2,
  },
  bullseyeDotDragging: {
    backgroundColor: "#E03546",
    transform: [{ scale: 1.3 }],
  },
  groundShadow: {
    position: "absolute",
    bottom: 2,
    width: 20,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    zIndex: 1,
  },
  groundShadowDragging: {
    width: 14,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(0, 0, 0, 0.15)",
    bottom: 4,
  },
  /* Pin Assembly */
  pinAssemblyWrap: {
    position: "absolute",
    top: "50%",
    left: "50%",
    // Needle tip at (19, 48). translateX: -19, translateY: -48 centers needle tip directly on (0, 0)
    transform: [{ translateX: -19 }, { translateY: -48 }],
    alignItems: "center",
    justifyContent: "flex-end",
    zIndex: 1000,
    width: 38,
  },
  pinAssemblyLifted: {
    // Lifts up 14px into the air during drag, exposing the exact ground reticle
    transform: [{ translateX: -19 }, { translateY: -62 }],
  },
  swiggyTooltip: {
    position: "absolute",
    top: -34,
    width: 176,
    left: -69,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#1F4D46",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  swiggyTooltipDragging: {
    backgroundColor: "#1C2D27",
    borderColor: "rgba(224, 53, 70, 0.6)",
    borderWidth: 1,
  },
  livePulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#4ADE80",
  },
  livePulseDotDragging: {
    backgroundColor: "#F59E0B",
  },
  swiggyTooltipText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.1,
    textAlign: "center",
    flexShrink: 1,
  },
  swiggyTooltipArrow: {
    position: "absolute",
    bottom: -4,
    left: "50%",
    marginLeft: -4,
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderTopWidth: 4,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#1F4D46",
  },
  swiggyTooltipArrowDragging: {
    borderTopColor: "#1C2D27",
  },
  pinHead: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#BE4436",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 6,
    zIndex: 2,
  },
  pinHeadDragging: {
    backgroundColor: "#E03546",
    transform: [{ scale: 1.05 }],
  },
  pinHeadInner: {
    alignItems: "center",
    justifyContent: "center",
  },
  pinNeedle: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 12,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#BE4436",
    marginTop: -2,
    zIndex: 1,
  },
  pinNeedleDragging: {
    borderTopColor: "#E03546",
  },
  recenterGpsButton: {
    position: "absolute",
    bottom: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 1001,
  },
  recenterGpsText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.primaryDark,
  },
  mapControls: {
    position: "absolute",
    top: 10,
    right: 10,
    gap: 6,
    zIndex: 1001,
  },
  mapControlButton: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  mapHintBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(15, 46, 41, 0.88)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    maxWidth: "60%",
    zIndex: 1001,
  },
  mapHintText: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#FFFFFF",
    flexShrink: 1,
  },
  serviceStatusCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  serviceStatusCardGreen: {
    backgroundColor: "#E3F1E9",
    borderColor: "#C4E2D2",
  },
  serviceStatusCardOrange: {
    backgroundColor: "#FBE7E3",
    borderColor: "#F4C4BC",
  },
  serviceStatusTitle: {
    fontSize: 11.5,
    fontWeight: "800",
    flexShrink: 1,
  },
  serviceStatusTitleGreen: {
    color: "#2E7D5B",
  },
  serviceStatusTitleOrange: {
    color: "#BE4436",
  },
  serviceStatusDesc: {
    fontSize: 10.5,
    color: colors.textMuted,
    marginTop: 1,
    flexShrink: 1,
  },
  addressPreviewWrap: {
    backgroundColor: colors.background,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addressPreviewHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  addressPreviewLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.primary,
    letterSpacing: 0.5,
  },
  addressPreviewText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primaryDark,
    lineHeight: 16,
  },
  confirmLocationButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  confirmLocationButtonText: {
    color: "#FFFFFF",
    fontSize: 13.5,
    fontWeight: "800",
  },
});
