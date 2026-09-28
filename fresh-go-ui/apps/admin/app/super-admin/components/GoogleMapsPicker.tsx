"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  MapPin,
  Search,
  Navigation,
  Compass,
  Layers,
  ZoomIn,
  ZoomOut,
  Info,
} from "lucide-react";

type GoogleMapsPickerProps = {
  initialLat?: number;
  initialLng?: number;
  radiusKm?: number;
  onLocationSelect: (lat: number, lng: number, address?: string) => void;
  onRadiusChange?: (radiusKm: number) => void;
};

export function GoogleMapsPicker({
  initialLat = 11.2588,
  initialLng = 75.7804,
  radiusKm = 10,
  onLocationSelect,
  onRadiusChange,
}: GoogleMapsPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [lat, setLat] = useState(initialLat);
  const [lng, setLng] = useState(initialLng);
  const [radius, setRadius] = useState(radiusKm);
  const [addressQuery, setAddressQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(12);

  const googleMapInstance = useRef<any>(null);
  const markerInstance = useRef<any>(null);
  const circleInstance = useRef<any>(null);

  // Sync internal state with props if they change
  useEffect(() => {
    if (initialLat && initialLng) {
      setLat(initialLat);
      setLng(initialLng);
    }
  }, [initialLat, initialLng]);

  useEffect(() => {
    if (radiusKm) {
      setRadius(radiusKm);
    }
  }, [radiusKm]);

  // Attempt to load Google Maps JS API if key exists in env
  useEffect(() => {
    const apiKey =
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ||
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (typeof window === "undefined") return;

    if ((window as any).google?.maps) {
      setGoogleMapsLoaded(true);
      return;
    }

    if (apiKey) {
      const scriptId = "google-maps-script";
      if (!document.getElementById(scriptId)) {
        const script = document.createElement("script");
        script.id = scriptId;
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`;
        script.async = true;
        script.defer = true;
        script.onload = () => {
          setGoogleMapsLoaded(true);
        };
        script.onerror = () => {
          console.warn("Google Maps failed to load, using interactive fallback map.");
        };
        document.head.appendChild(script);
      }
    }
  }, []);

  // Initialize or update Google Map when script is available
  useEffect(() => {
    if (!googleMapsLoaded || !mapContainerRef.current || !(window as any).google?.maps) return;

    const gmaps = (window as any).google.maps;
    const center = { lat, lng };

    if (!googleMapInstance.current) {
      const map = new gmaps.Map(mapContainerRef.current, {
        center,
        zoom: 12,
        mapTypeId: "roadmap",
        disableDefaultUI: false,
        zoomControl: true,
        streetViewControl: false,
      });

      const marker = new gmaps.Marker({
        position: center,
        map,
        draggable: true,
        title: "Hub Location",
        animation: gmaps.Animation.DROP,
      });

      const circle = new gmaps.Circle({
        strokeColor: "#1F4D46",
        strokeOpacity: 0.85,
        strokeWeight: 2,
        fillColor: "#2E7D5B",
        fillOpacity: 0.22,
        map,
        center,
        radius: radius * 1000,
      });

      marker.addListener("dragend", () => {
        const pos = marker.getPosition();
        if (pos) {
          const newLat = Number(pos.lat().toFixed(6));
          const newLng = Number(pos.lng().toFixed(6));
          setLat(newLat);
          setLng(newLng);
          circle.setCenter(pos);
          onLocationSelect(newLat, newLng);
        }
      });

      map.addListener("click", (e: any) => {
        const clickedPos = e.latLng;
        marker.setPosition(clickedPos);
        circle.setCenter(clickedPos);
        const newLat = Number(clickedPos.lat().toFixed(6));
        const newLng = Number(clickedPos.lng().toFixed(6));
        setLat(newLat);
        setLng(newLng);
        onLocationSelect(newLat, newLng);
      });

      googleMapInstance.current = map;
      markerInstance.current = marker;
      circleInstance.current = circle;
    } else {
      googleMapInstance.current.setCenter(center);
      markerInstance.current.setPosition(center);
      circleInstance.current.setCenter(center);
      circleInstance.current.setRadius(radius * 1000);
    }
  }, [googleMapsLoaded, lat, lng, radius, onLocationSelect]);

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

  // Search Address / Geocoding
  const handleSearchAddress = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!addressQuery.trim()) return;

    setIsSearching(true);
    try {
      // If Google Maps is loaded with geocoder
      if ((window as any).google?.maps?.Geocoder) {
        const geocoder = new (window as any).google.maps.Geocoder();
        geocoder.geocode({ address: addressQuery }, (results: any, status: any) => {
          if (status === "OK" && results?.[0]?.geometry?.location) {
            const loc = results[0].geometry.location;
            const newLat = Number(loc.lat().toFixed(6));
            const newLng = Number(loc.lng().toFixed(6));
            const formatted = results[0].formatted_address;
            setLat(newLat);
            setLng(newLng);
            onLocationSelect(newLat, newLng, formatted);
            if (googleMapInstance.current) {
              googleMapInstance.current.panTo(loc);
              googleMapInstance.current.setZoom(13);
            }
          }
        });
      } else {
        // Fallback geocoding via OpenStreetMap Nominatim
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            addressQuery
          )}`
        );
        const data = await res.json();
        if (data && data.length > 0) {
          const first = data[0];
          const newLat = Number(parseFloat(first.lat).toFixed(6));
          const newLng = Number(parseFloat(first.lon).toFixed(6));
          setLat(newLat);
          setLng(newLng);
          onLocationSelect(newLat, newLng, first.display_name);
        }
      }
    } catch (err) {
      console.warn("Geocoding failed:", err);
    } finally {
      setIsSearching(false);
    }
  };

  // Use Current Geolocation
  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newLat = Number(pos.coords.latitude.toFixed(6));
          const newLng = Number(pos.coords.longitude.toFixed(6));
          setLat(newLat);
          setLng(newLng);
          onLocationSelect(newLat, newLng, "Current Geolocation");
          if (googleMapInstance.current) {
            googleMapInstance.current.panTo({ lat: newLat, lng: newLng });
            googleMapInstance.current.setZoom(13);
          }
        },
        (err) => {
          console.warn("Geolocation denied:", err.message);
        }
      );
    }
  };

  // Interactive Fallback Map Click handler
  const handleFallbackMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Approximate mapping centered on current lat/lng
    const deltaX = (clickX - rect.width / 2) / (rect.width / 2);
    const deltaY = (clickY - rect.height / 2) / (rect.height / 2);

    // Scaling factor based on zoom
    const degreeSpan = 0.12 / Math.pow(1.5, zoomLevel - 12);
    const newLat = Number((lat - deltaY * degreeSpan).toFixed(6));
    const newLng = Number((lng + deltaX * degreeSpan).toFixed(6));

    setLat(newLat);
    setLng(newLng);
    onLocationSelect(newLat, newLng);
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
      {/* Top Search Toolbar */}
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
            placeholder="Search address or area in Kerala (e.g. Kozhikode Beach, Calicut)..."
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
          }}
        >
          {isSearching ? "Searching..." : "Locate Pin"}
        </button>

        <button
          type="button"
          onClick={handleGetCurrentLocation}
          title="Use GPS Location"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "9px 12px",
            borderRadius: "8px",
            background: "#E4ECE9",
            color: "#1F4D46",
            fontSize: "12px",
            fontWeight: 700,
            border: "none",
            cursor: "pointer",
          }}
        >
          <Navigation size={14} />
          Current GPS
        </button>
      </div>

      {/* Map Canvas / Viewer */}
      <div
        style={{
          position: "relative",
          height: "360px",
          borderRadius: "12px",
          overflow: "hidden",
          border: "2px solid #1F4D46",
          boxShadow: "0 4px 14px rgba(0, 0, 0, 0.08)",
        }}
      >
        {googleMapsLoaded ? (
          <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />
        ) : (
          /* Interactive High-Fidelity Geo-Fence Canvas with OSM Tiles */
          <div
            onClick={handleFallbackMapClick}
            style={{
              width: "100%",
              height: "100%",
              position: "relative",
              cursor: "crosshair",
              userSelect: "none",
              background: "#E8EFE9",
              overflow: "hidden",
            }}
          >
            {/* OpenStreetMap Tile Layer as dynamic background */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage: `url('https://tile.openstreetmap.org/${zoomLevel}/${Math.floor(
                  ((lng + 180) / 360) * Math.pow(2, zoomLevel)
                )}/${Math.floor(
                  ((1 -
                    Math.log(
                      Math.tan((lat * Math.PI) / 180) +
                        1 / Math.cos((lat * Math.PI) / 180)
                    ) /
                      Math.PI) /
                    2) *
                    Math.pow(2, zoomLevel)
                )}.png')`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                opacity: 0.95,
              }}
            />

            {/* Grid Pattern overlay for precise alignment */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage:
                  "radial-gradient(#1F4D46 1px, transparent 1px), radial-gradient(#1F4D46 1px, #e5e5f7 1px)",
                backgroundSize: "40px 40px",
                backgroundPosition: "0 0, 20px 20px",
                opacity: 0.06,
              }}
            />

            {/* 10km Delivery Geo-Fence Circle Overlay */}
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: `${radius * 24}px`,
                height: `${radius * 24}px`,
                borderRadius: "50%",
                background: "rgba(46, 125, 91, 0.22)",
                border: "2.5px solid #2E7D5B",
                boxShadow: "0 0 25px rgba(46, 125, 91, 0.35)",
                pointerEvents: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  padding: "4px 8px",
                  borderRadius: "999px",
                  background: "#1F4D46",
                  color: "#FFFFFF",
                  fontSize: "11px",
                  fontWeight: 800,
                  transform: "translateY(-60px)",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
                }}
              >
                10 km Delivery Boundary
              </div>
            </div>

            {/* Center Marker Pin */}
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -100%)",
                pointerEvents: "none",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  background: "#E5623E",
                  color: "#FFFFFF",
                  width: "36px",
                  height: "36px",
                  borderRadius: "50% 50% 50% 0",
                  transform: "rotate(-45deg)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 10px rgba(0, 0, 0, 0.3)",
                  border: "2px solid #FFFFFF",
                }}
              >
                <div
                  style={{
                    transform: "rotate(45deg)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <MapPin size={18} color="#FFFFFF" />
                </div>
              </div>
              <div
                style={{
                  width: "12px",
                  height: "4px",
                  borderRadius: "50%",
                  background: "rgba(0, 0, 0, 0.35)",
                  marginTop: "-2px",
                }}
              />
            </div>

            {/* Map Controls */}
            <div
              style={{
                position: "absolute",
                top: "12px",
                right: "12px",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setZoomLevel((z) => Math.min(18, z + 1));
                }}
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "6px",
                  background: "#FFFFFF",
                  border: "1px solid #E3DDCF",
                  display: "grid",
                  placeItems: "center",
                  cursor: "pointer",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                }}
              >
                <ZoomIn size={16} color="#1F4D46" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setZoomLevel((z) => Math.max(8, z - 1));
                }}
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "6px",
                  background: "#FFFFFF",
                  border: "1px solid #E3DDCF",
                  display: "grid",
                  placeItems: "center",
                  cursor: "pointer",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                }}
              >
                <ZoomOut size={16} color="#1F4D46" />
              </button>
            </div>

            {/* Click to reposition hint */}
            <div
              style={{
                position: "absolute",
                bottom: "10px",
                left: "12px",
                background: "rgba(15, 46, 41, 0.85)",
                color: "#FFFFFF",
                padding: "6px 12px",
                borderRadius: "6px",
                fontSize: "11px",
                fontWeight: 600,
                backdropFilter: "blur(4px)",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Info size={13} color="#F2C94C" />
              Click anywhere on map to reposition Hub pin
            </div>
          </div>
        )}
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
            min={5}
            max={25}
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
            <span>5 km (Micro)</span>
            <span>10 km (Standard)</span>
            <span>25 km (Mega)</span>
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
