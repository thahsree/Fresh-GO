import { Platform } from "react-native";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";

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

// Immediately pre-populate cachedLocation from AsyncStorage on app boot
(async () => {
  try {
    const [latStr, lngStr, addrStr] = await Promise.all([
      AsyncStorage.getItem(STORAGE_LAT_KEY),
      AsyncStorage.getItem(STORAGE_LNG_KEY),
      AsyncStorage.getItem(STORAGE_ADDR_KEY),
    ]);
    if (latStr && lngStr) {
      const lat = parseFloat(latStr);
      const lng = parseFloat(lngStr);
      // Discard corrupt Trivandrum IP gateway cache (lat < 9.5 in North Kerala delivery zone)
      if (Number.isFinite(lat) && Number.isFinite(lng) && lat >= 9.5) {
        cachedLocation = {
          lat,
          lng,
          source: "saved",
          address: addrStr || undefined,
        };
      }
    }
  } catch {
    // ignore
  }
})();

/**
 * Get previously saved location from storage or memory cache.
 * Automatically cleans up any obsolete Trivandrum IP gateway coordinates (< 9.5° N).
 */
export function getStoredLocation(): DeviceLocation | null {
  if (cachedLocation) {
    if (cachedLocation.lat < 9.5) {
      cachedLocation = null;
    } else {
      return cachedLocation;
    }
  }

  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const latStr = window.localStorage.getItem(STORAGE_LAT_KEY);
      const lngStr = window.localStorage.getItem(STORAGE_LNG_KEY);
      const addrStr = window.localStorage.getItem(STORAGE_ADDR_KEY);

      if (latStr && lngStr) {
        const lat = parseFloat(latStr);
        const lng = parseFloat(lngStr);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          // Discard corrupt Trivandrum IP gateway coordinates (< 9.5° N)
          if (lat < 9.5) {
            window.localStorage.removeItem(STORAGE_LAT_KEY);
            window.localStorage.removeItem(STORAGE_LNG_KEY);
            window.localStorage.removeItem(STORAGE_ADDR_KEY);
            return null;
          }
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
  // Never save corrupt Trivandrum IP coordinates (< 9.5° N) for North Kerala delivery service
  if (loc.lat < 9.5) return;

  cachedLocation = {
    ...loc,
    address: address || loc.address,
  };

  const latStr = loc.lat.toString();
  const lngStr = loc.lng.toString();
  const addrToSave = address || loc.address || "";

  AsyncStorage.setItem(STORAGE_LAT_KEY, latStr).catch(() => {});
  AsyncStorage.setItem(STORAGE_LNG_KEY, lngStr).catch(() => {});
  if (addrToSave) {
    AsyncStorage.setItem(STORAGE_ADDR_KEY, addrToSave).catch(() => {});
  }

  if (typeof window !== "undefined" && window.localStorage) {
    try {
      window.localStorage.setItem(STORAGE_LAT_KEY, latStr);
      window.localStorage.setItem(STORAGE_LNG_KEY, lngStr);
      if (addrToSave) {
        window.localStorage.setItem(STORAGE_ADDR_KEY, addrToSave);
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
        const rawPincode = item.postalCode?.trim()?.replace(/\D/g, "") || "";
        const pincode = rawPincode.length === 6 ? rawPincode : undefined;

        if (formatted || area || city) {
          return {
            address: formatted || `${area}, ${city}`,
            city,
            area: street || area,
            pincode,
          };
        }
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
      // A. Check if device location services (GPS hardware toggle) are switched ON
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled && options?.forcePrompt) {
        try {
          // Native Android modal: "To continue, turn on device location, which uses Google's location service"
          await Location.enableNetworkProviderAsync();
        } catch (provErr) {
          console.warn("[Location] User declined enableNetworkProvider:", provErr);
        }
      }

      // B. Permissions check & prompt
      let { status } = await Location.getForegroundPermissionsAsync();
      if (status !== Location.PermissionStatus.GRANTED) {
        if (options?.forcePrompt) {
          const req = await Location.requestForegroundPermissionsAsync();
          status = req.status;
        } else {
          // If not forcing prompt and permission not yet granted, return stored location without guessing
          return getStoredLocation();
        }
      }

      if (status === Location.PermissionStatus.GRANTED) {
        // C. High-Accuracy active GPS fix (satellite + Wi-Fi assisted)
        try {
          const current = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
            timeInterval: 4000,
          });

          if (
            current?.coords &&
            Number.isFinite(current.coords.latitude) &&
            Number.isFinite(current.coords.longitude) &&
            (current.coords.latitude !== 0 || current.coords.longitude !== 0)
          ) {
            const loc: DeviceLocation = {
              lat: Number(current.coords.latitude.toFixed(6)),
              lng: Number(current.coords.longitude.toFixed(6)),
              source: "gps",
            };
            saveStoredLocation(loc);
            return loc;
          }
        } catch (activeErr: any) {
          console.warn("[Location] Active GPS fix note:", activeErr?.message || activeErr);
        }

        // D. Fallback to recent lastKnown position ONLY if accurate (< 1000m) and non-Trivandrum
        try {
          const lastKnown = await Location.getLastKnownPositionAsync();
          if (
            lastKnown?.coords &&
            Number.isFinite(lastKnown.coords.latitude) &&
            Number.isFinite(lastKnown.coords.longitude) &&
            (lastKnown.coords.latitude !== 0 || lastKnown.coords.longitude !== 0)
          ) {
            const acc = lastKnown.coords.accuracy;
            if ((acc == null || acc < 1000) && lastKnown.coords.latitude >= 9.5) {
              const loc: DeviceLocation = {
                lat: Number(lastKnown.coords.latitude.toFixed(6)),
                lng: Number(lastKnown.coords.longitude.toFixed(6)),
                source: "lastKnown",
              };
              saveStoredLocation(loc);
              return loc;
            }
          }
        } catch (lastKnownErr: any) {
          console.warn("[Location] Last known position note:", lastKnownErr?.message || lastKnownErr);
        }
      }

      // CRITICAL: On Native Mobile in Kerala, NEVER fall through to BigDataCloud IP Geolocation!
      // Mobile cellular carriers (Jio, Airtel 5G) route through the state telecom gateway in Trivandrum (8.52° N),
      // which misplaces customers in Kasaragod, Kannur, and Kozhikode by 400km!
      return getStoredLocation();
    } catch (err: any) {
      console.warn("[Location] Native mobile location error:", err?.message || err);
      return getStoredLocation();
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

  // 3. Fallback: Client IP Geolocation (ONLY FOR DESKTOP WEB BROWSERS WITHOUT GPS)
  if (Platform.OS === "web") {
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
      console.warn("[Location] Web IP fallback error:", err?.message || err);
    }
  }

  // 4. Return cached location if any
  return getStoredLocation();
}
