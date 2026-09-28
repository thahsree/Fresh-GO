import { Platform } from "react-native";
import * as Location from "expo-location";

export type DeviceLocation = {
  lat: number;
  lng: number;
  source: "gps" | "lastKnown" | "browser" | "ip" | "saved" | "fallback";
  address?: string;
  city?: string;
  district?: string;
};

const STORAGE_LAT_KEY = "freshgo_customer_lat";
const STORAGE_LNG_KEY = "freshgo_customer_lng";
const STORAGE_ADDR_KEY = "freshgo_customer_address";

// In-memory cache for fast access
let cachedLocation: DeviceLocation | null = null;

/**
 * Get previously saved location from localStorage or memory cache
 */
export function getStoredLocation(): DeviceLocation | null {
  if (cachedLocation) return cachedLocation;

  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const latStr = window.localStorage.getItem(STORAGE_LAT_KEY);
      const lngStr = window.localStorage.getItem(STORAGE_LNG_KEY);
      const addrStr = window.localStorage.getItem(STORAGE_ADDR_KEY);

      if (latStr && lngStr) {
        const lat = parseFloat(latStr);
        const lng = parseFloat(lngStr);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          cachedLocation = {
            lat,
            lng,
            source: "saved",
            address: addrStr || undefined,
          };
          return cachedLocation;
        }
      }
    } catch {
      // ignore
    }
  }

  return null;
}

/**
 * Persist confirmed location into storage
 */
export function saveStoredLocation(loc: DeviceLocation, address?: string) {
  cachedLocation = {
    ...loc,
    address: address || loc.address,
  };

  if (typeof window !== "undefined" && window.localStorage) {
    try {
      window.localStorage.setItem(STORAGE_LAT_KEY, loc.lat.toString());
      window.localStorage.setItem(STORAGE_LNG_KEY, loc.lng.toString());
      if (address || loc.address) {
        window.localStorage.setItem(STORAGE_ADDR_KEY, address || loc.address || "");
      }
    } catch {
      // ignore
    }
  }
}

/**
 * Calculate distance in km between two coordinate points
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (
    !Number.isFinite(lat1) ||
    !Number.isFinite(lon1) ||
    !Number.isFinite(lat2) ||
    !Number.isFinite(lon2)
  ) {
    return 0;
  }
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Reverse geocode coordinate into city, area, and clean address string with exact local pincode
 */
export async function reverseGeocodeLocation(
  lat: number,
  lng: number
): Promise<{ address: string; city: string; area: string; pincode?: string }> {
  const safeLat = Number(lat.toFixed(6));
  const safeLng = Number(lng.toFixed(6));

  // 1. Native Mobile Geocoder (Google Play Services on Android, Apple Maps on iOS)
  // Provides the most accurate rooftop/street-level postal code in India without third-party rate limits
  if (Platform.OS !== "web") {
    try {
      const results = await Location.reverseGeocodeAsync({
        latitude: safeLat,
        longitude: safeLng,
      });

      if (Array.isArray(results) && results.length > 0) {
        const item = results[0];
        const city = item.city || item.subregion || item.district || "Kerala";
        const area = item.district || item.street || item.subregion || city;
        const street = [item.name, item.street].filter(Boolean).join(", ");
        const formatted = [street, area, city].filter(Boolean).join(", ");
        const pincode = item.postalCode?.trim() || "";

        return {
          address: formatted || `${area}, ${city}`,
          city,
          area: street || area,
          pincode: pincode.length === 6 ? pincode : undefined,
        };
      }
    } catch (err) {
      console.warn("[location] Native reverse geocode note:", err);
    }
  }

  // 2. LocationIQ Hyperlocal Geocoder (uses official India Post pincode boundary database)
  try {
    const token =
      (typeof process !== "undefined" && process?.env?.EXPO_PUBLIC_LOCATIONIQ_TOKEN) ||
      "pk.1714d75230cfe1d776514cf91ec30ae3";
    const res = await fetch(
      `https://us1.locationiq.com/v1/reverse?key=${token}&lat=${safeLat}&lon=${safeLng}&format=json&addressdetails=1`
    );
    if (res.ok) {
      const data = await res.json();
      if (data && data.address) {
        const city =
          data.address.city ||
          data.address.town ||
          data.address.village ||
          data.address.county ||
          "Kerala";
        const area =
          data.address.suburb ||
          data.address.neighbourhood ||
          data.address.road ||
          data.address.residential ||
          city;
        const formatted =
          data.display_name?.split(",").slice(0, 3).join(", ") ||
          `${area}, ${city}`;
        const rawPincode = data.address.postcode?.replace(/\D/g, "");

        return {
          address: formatted,
          city,
          area,
          pincode: rawPincode && rawPincode.length === 6 ? rawPincode : undefined,
        };
      }
    }
  } catch {
    // fallback
  }

  // 3. OpenStreetMap Nominatim with high precision zoom=18
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${safeLat}&lon=${safeLng}&zoom=18&addressdetails=1`
    );
    if (res.ok) {
      const data = await res.json();
      if (data?.address) {
        const city =
          data.address.city ||
          data.address.town ||
          data.address.district ||
          data.address.state_district ||
          "Kerala";
        const area =
          data.address.suburb ||
          data.address.neighbourhood ||
          data.address.road ||
          city;
        const formatted =
          data.display_name?.split(",").slice(0, 3).join(", ") ||
          `${area}, ${city}`;
        const rawPincode = data.address.postcode?.replace(/\D/g, "");
        return {
          address: formatted,
          city,
          area,
          pincode: rawPincode && rawPincode.length === 6 ? rawPincode : undefined,
        };
      }
    }
  } catch {
    // fallback
  }

  // 4. BigDataCloud Fallback
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${safeLat}&longitude=${safeLng}&localityLanguage=en`
    );
    if (res.ok) {
      const data = await res.json();
      if (data && data.city) {
        const city = data.city || data.locality || "Kerala";
        const area = data.locality || data.principalSubdivision || "";
        const address = [data.locality, data.city, data.principalSubdivision, "India"]
          .filter(Boolean)
          .join(", ");
        const rawPincode = data.postcode?.replace(/\D/g, "");
        return {
          address,
          city,
          area,
          pincode: rawPincode && rawPincode.length === 6 ? rawPincode : undefined,
        };
      }
    }
  } catch {
    // fallback
  }

  return {
    address: `${safeLat}, ${safeLng}`,
    city: "Kerala",
    area: "Local Area",
  };
}

/**
 * Multi-tier reliable device location acquisition:
 * 1. Native Expo GPS (Balanced accuracy, lastKnown cache first for instant response)
 * 2. Web browser navigator.geolocation (Low accuracy fallback for fast response)
 * 3. Client IP Geolocation (Zero-permission fallback for mobile browsers on local IP/LAN)
 */
export async function acquireAccurateLocation(options?: {
  forcePrompt?: boolean;
}): Promise<DeviceLocation | null> {
  // 1. Native Mobile (iOS / Android Expo)
  if (Platform.OS !== "web") {
    try {
      let { status } = await Location.getForegroundPermissionsAsync();
      if (status !== Location.PermissionStatus.GRANTED && options?.forcePrompt !== false) {
        const req = await Location.requestForegroundPermissionsAsync();
        status = req.status;
      }

      if (status === Location.PermissionStatus.GRANTED) {
        // A. Instant check: last known position (<20ms)
        const lastKnown = await Location.getLastKnownPositionAsync();
        if (
          lastKnown?.coords &&
          Number.isFinite(lastKnown.coords.latitude) &&
          Number.isFinite(lastKnown.coords.longitude)
        ) {
          const loc: DeviceLocation = {
            lat: Number(lastKnown.coords.latitude.toFixed(6)),
            lng: Number(lastKnown.coords.longitude.toFixed(6)),
            source: "lastKnown",
          };
          saveStoredLocation(loc);
          return loc;
        }

        // B. Active GPS fix
        const current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (
          current?.coords &&
          Number.isFinite(current.coords.latitude) &&
          Number.isFinite(current.coords.longitude)
        ) {
          const loc: DeviceLocation = {
            lat: Number(current.coords.latitude.toFixed(6)),
            lng: Number(current.coords.longitude.toFixed(6)),
            source: "gps",
          };
          saveStoredLocation(loc);
          return loc;
        }
      }
    } catch (err: any) {
      console.warn("[Location] Native Expo error:", err?.message || err);
    }
  }

  // 2. Web Browser Geolocation (Mobile browser & Desktop web)
  if (typeof navigator !== "undefined" && navigator.geolocation) {
    const getBrowserCoords = (highAccuracy: boolean, timeoutMs: number) => {
      return new Promise<{ lat: number; lng: number } | null>((resolve) => {
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
              const lat = pos.coords.latitude;
              const lng = pos.coords.longitude;
              if (Number.isFinite(lat) && Number.isFinite(lng)) {
                resolve({
                  lat: Number(lat.toFixed(6)),
                  lng: Number(lng.toFixed(6)),
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
            enableHighAccuracy: highAccuracy,
            timeout: timeoutMs,
            maximumAge: 60000,
          }
        );
      });
    };

    try {
      // First try standard network / cell location (super fast on mobile browsers)
      let coords = await getBrowserCoords(false, 4000);
      if (!coords) {
        // Try high accuracy GPS if standard didn't return
        coords = await getBrowserCoords(true, 5000);
      }

      if (coords) {
        const loc: DeviceLocation = {
          lat: coords.lat,
          lng: coords.lng,
          source: "browser",
        };
        saveStoredLocation(loc);
        return loc;
      }
    } catch (err: any) {
      console.warn("[Location] Browser geolocation error:", err?.message || err);
    }
  }

  // 3. Fallback: Client IP Geolocation
  // (Crucial for mobile browsers running via tunnel or local LAN without HTTPS GPS permissions)
  try {
    const res = await fetch("https://api.bigdatacloud.net/data/reverse-geocode-client");
    const data = await res.json();
    if (
      data &&
      Number.isFinite(data.latitude) &&
      Number.isFinite(data.longitude)
    ) {
      const loc: DeviceLocation = {
        lat: Number(data.latitude.toFixed(6)),
        lng: Number(data.longitude.toFixed(6)),
        source: "ip",
        city: data.city || data.locality,
        district: data.localityInfo?.administrative?.find((a: any) =>
          a.description?.includes("district")
        )?.name,
      };
      saveStoredLocation(loc);
      return loc;
    }
  } catch (err: any) {
    console.warn("[Location] IP fallback error:", err?.message || err);
  }

  // 4. Return cached location if any
  return getStoredLocation();
}
