import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NativeModules, Platform } from "react-native";
import {
  type Category,
  type Product,
} from "../models/catalog";
import type { CustomerOrder } from "../components/OrdersView";
import type { UserProfile } from "../components/ProfileView";

declare const process: any;

/**
 * Resolves the API Base URL dynamically.
 * Works seamlessly across:
 * 1. Web browser: uses window.location.origin to route through Metro's proxy, or localhost:4000
 * 2. Expo Tunnel (exp.direct, ngrok, loca.lt): uses HTTPS and strips internal ports (:80, :8081)
 *    so React Native can make secure requests through the tunnel without cleartext HTTP blocks
 * 3. Local LAN / Wi-Fi / Emulator: uses Metro's host with port 8081 which proxies /api/ to 4000
 */
export function getApiBase(): string {
  // 1. Explicit environment variable (inlined by Expo CLI / Metro bundler)
  if (typeof process !== "undefined") {
    const raw = process?.env?.EXPO_PUBLIC_API_URL || process?.env?.NEXT_PUBLIC_API_URL;
    if (raw) {
      const envUrl = raw.trim().replace(/\/+$/, "");
      if (envUrl.length > 0) return envUrl;
    }
  }

  // 2. Web browser:
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && window.location) {
      const host = window.location.hostname;
      // In local dev with Metro proxy on localhost / 127.0.0.1
      if (host === "localhost" || host === "127.0.0.1") {
        return `${window.location.origin}/api/v1`;
      }
    }
    // Deployed web app (e.g. Vercel) -> use live production backend
    return "https://fresh-go.duckdns.org/api/v1";
  }

  // 3. Extract candidate hosts from Expo Constants & React Native SourceCode
  const candidates: Array<string | undefined | null> = [
    NativeModules?.SourceCode?.scriptURL,
    Constants?.experienceUrl,
    Constants?.linkingUri,
    Constants?.expoConfig?.hostUri,
    (Constants as any)?.expoGoConfig?.debuggerHost,
    (Constants as any)?.manifest2?.extra?.expoGo?.debuggerHost,
    (Constants as any)?.manifest?.debuggerHost,
  ];

  // First pass: Public tunnel hosts (for local Expo running with --tunnel)
  for (const raw of candidates) {
    if (!raw || typeof raw !== "string") continue;
    try {
      const clean = raw.split("?")[0].replace(/^exp[s]?:\/\//, "http://");
      const withoutProto = clean.includes("://") ? clean.split("://")[1] : clean;
      const hostPart = withoutProto.split("/")[0].trim();
      if (!hostPart) continue;

      const [hostname] = hostPart.split(":");
      const isTunnel =
        hostname.includes("exp.direct") ||
        hostname.includes("ngrok") ||
        hostname.includes("loca.lt") ||
        hostname.includes("tunnel");

      if (isTunnel) {
        return `https://${hostname}/api/v1`;
      }
    } catch {
      // Continue to next candidate
    }
  }

  // Second pass: Local LAN Wi-Fi hosts (for local Expo running with --host lan)
  for (const raw of candidates) {
    if (!raw || typeof raw !== "string") continue;
    try {
      const clean = raw.split("?")[0].replace(/^exp[s]?:\/\//, "http://");
      const withoutProto = clean.includes("://") ? clean.split("://")[1] : clean;
      const hostPart = withoutProto.split("/")[0].trim();
      if (!hostPart) continue;

      const [hostname, port] = hostPart.split(":");
      if (hostname && (hostname.startsWith("192.168.") || hostname.startsWith("10.") || hostname.startsWith("172."))) {
        const targetPort = port === "8081" ? "4000" : port || "4000";
        return `http://${hostname}:${targetPort}/api/v1`;
      }
    } catch {
      // Continue to next candidate
    }
  }

  // 4. Default Production Backend for deployed apps
  return "https://fresh-go.duckdns.org/api/v1";
}

export const API_BASE = getApiBase();

const TOKEN_KEY = "freshgo_customer_token";
const USER_KEY = "freshgo_customer_user";
const DELIVERED_ORDERS_KEY = "freshgo_delivered_orders";

export type BackendCategory = {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  tint?: string;
  sortOrder: number;
  isActive: boolean;
};

export type BackendCut = {
  id: string;
  productId: string;
  name: string;
  priceModifier: number;
  isDefault: boolean;
};

export type BackendBatch = {
  id: string;
  batchNumber: string;
  catchOrHarvestDate: string;
  originSource: string;
  remainingQuantityKg: number;
  freshnessStatus: string;
};

export type BackendProduct = {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  category?: BackendCategory;
  basePrice: number;
  unit: string;
  description?: string;
  origin?: string;
  storageTip?: string;
  grossWeightDescription?: string | null;
  netWeightDescription?: string | null;
  isActive: boolean;
  isBestSeller?: boolean;
  isTodaysOffer?: boolean;
  originalPrice?: number | null;
  isDailyCatch?: boolean;
  isFlashFrozen?: boolean;
  image?: string;
  imageUrl?: string;
  rating?: number;
  reviewsCount?: number;
  cuts?: BackendCut[];
  batches?: BackendBatch[];
  availableStockKg?: number;
  isInStock?: boolean;
  tag?: string;
};

export type BackendAddress = {
  id: string;
  title: string;
  street: string;
  landmark?: string | null;
  area: string;
  city: string;
  pincode: string;
  latitude: number;
  longitude: number;
  isDefault: boolean;
};

export type BackendHub = {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  deliveryRadiusKm: number;
  isActive: boolean;
  contactPhone?: string | null;
};

export type BackendOrderItem = {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  cutOption?: { id: string; name: string } | null;
  cutName?: string | null;
  product: BackendProduct;
};

export type BackendOrder = {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  deliveryAddress?: any;
  deliveryAddressSnapshotJson?: string | null;
  placedAt: string;
  deliveryPartner?: {
    id: string;
    user?: {
      name?: string;
      phone?: string;
    };
  } | null;
  items: BackendOrderItem[];
};

class CustomerApiClient {
  private token: string | null = null;
  private user: UserProfile | null = null;
  private isStorageInitialized = false;

  constructor() {
    this.initStorage();
  }

  private async initStorage() {
    try {
      const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
      const storedUser = await AsyncStorage.getItem(USER_KEY);
      if (storedToken) this.token = storedToken;
      if (storedUser) this.user = JSON.parse(storedUser);
      this.isStorageInitialized = true;
    } catch {
      if (typeof window !== "undefined" && window.localStorage) {
        try {
          this.token = localStorage.getItem(TOKEN_KEY);
          const stored = localStorage.getItem(USER_KEY);
          if (stored) this.user = JSON.parse(stored);
        } catch {}
      }
      this.isStorageInitialized = true;
    }
  }

  getToken(): string | null {
    if (!this.token && typeof window !== "undefined" && window.localStorage) {
      this.token = localStorage.getItem(TOKEN_KEY);
    }
    return this.token;
  }

  async setSession(token: string, user: UserProfile) {
    this.token = token;
    this.user = user;
    try {
      await AsyncStorage.setItem(TOKEN_KEY, token);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch {}
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
      } catch {}
    }
  }

  async clearSession() {
    this.token = null;
    this.user = null;
    try {
      await AsyncStorage.removeItem(TOKEN_KEY);
      await AsyncStorage.removeItem(USER_KEY);
    } catch {}
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      } catch {}
    }
  }

  getUser(): UserProfile | null {
    return this.user;
  }

  async markOrderDelivered(orderId: string): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(DELIVERED_ORDERS_KEY);
      const list: string[] = stored ? JSON.parse(stored) : [];
      if (!list.includes(orderId)) {
        list.push(orderId);
        await AsyncStorage.setItem(DELIVERED_ORDERS_KEY, JSON.stringify(list));
      }
    } catch {}
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        const stored = localStorage.getItem(DELIVERED_ORDERS_KEY);
        const list: string[] = stored ? JSON.parse(stored) : [];
        if (!list.includes(orderId)) {
          list.push(orderId);
          localStorage.setItem(DELIVERED_ORDERS_KEY, JSON.stringify(list));
        }
      } catch {}
    }
  }

  async getDeliveredOrderIds(): Promise<string[]> {
    try {
      const stored = await AsyncStorage.getItem(DELIVERED_ORDERS_KEY);
      if (stored) return JSON.parse(stored);
    } catch {}
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        const stored = localStorage.getItem(DELIVERED_ORDERS_KEY);
        if (stored) return JSON.parse(stored);
      } catch {}
    }
    return [];
  }

  /**
   * Restore real customer session from stored JWT accessToken if present.
   * Persists across device app closures and restarts.
   */
  async restoreSession(): Promise<UserProfile | null> {
    if (!this.token) {
      try {
        const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
        const storedUser = await AsyncStorage.getItem(USER_KEY);
        if (storedToken) this.token = storedToken;
        if (storedUser) this.user = JSON.parse(storedUser);
      } catch {}
      if (!this.token && typeof window !== "undefined" && window.localStorage) {
        try {
          this.token = localStorage.getItem(TOKEN_KEY);
          const stored = localStorage.getItem(USER_KEY);
          if (stored) this.user = JSON.parse(stored);
        } catch {}
      }
    }

    const token = this.token;
    if (!token) {
      this.user = null;
      return null;
    }

    const cachedUser = this.user;

    try {
      const res = await this.get<{
        user: {
          id: string;
          phone: string;
          name: string;
          email?: string;
          role: string;
        };
      }>("/auth/me", true);

      if (res?.user) {
        const profile: UserProfile = {
          name: res.user.name || cachedUser?.name || "Customer",
          phone: res.user.phone,
          email: res.user.email || "",
          isLoggedIn: true,
        };
        await this.setSession(token, profile);
        return profile;
      }
    } catch (err: any) {
      if (
        err?.message?.includes("Network request failed") ||
        err?.message?.includes("Failed to fetch") ||
        err?.message?.includes("AbortError")
      ) {
        if (cachedUser && cachedUser.isLoggedIn) {
          return cachedUser;
        }
      }
      if (err?.message?.includes("401") || err?.message?.includes("Unauthorized")) {
        console.log("[Customer API] Session expired, resetting to guest:", err.message);
        await this.clearSession();
      }
    }
    return cachedUser && cachedUser.isLoggedIn ? cachedUser : null;
  }

  async sendOtp(rawPhone: string): Promise<{ success: boolean; message: string; devOtp?: string; isMock?: boolean }> {
    const digits = rawPhone.replace(/\D/g, "");
    if (digits.length !== 10) {
      throw new Error("Please enter a valid 10-digit mobile number");
    }
    const phone = `+91${digits}`;
    const res = await this.post<{ message: string; phone: string; devOtp?: string; isMock?: boolean }>(
      "/auth/otp/send",
      { phone },
      false
    );
    return {
      success: true,
      message: res.message || "OTP sent successfully",
      devOtp: res.devOtp,
      isMock: res.isMock,
    };
  }

  async verifyOtp(
    rawPhone: string,
    otp: string,
    name?: string
  ): Promise<{ success: boolean; user: UserProfile; error?: string }> {
    const digits = rawPhone.replace(/\D/g, "");
    if (digits.length !== 10) {
      throw new Error("Please enter a valid 10-digit mobile number");
    }
    const phone = `+91${digits}`;
    const cleanOtp = otp.trim();

    if (!cleanOtp || cleanOtp.length < 4) {
      throw new Error("Please enter the verification code");
    }

    const res = await this.post<{
      accessToken: string;
      user: {
        id: string;
        phone: string;
        name: string;
        email?: string;
      };
    }>(
      "/auth/otp/verify",
      {
        phone,
        otp: cleanOtp,
        role: "CUSTOMER",
        name: name?.trim() || undefined,
      },
      false
    );

    if (!res?.accessToken || !res?.user) {
      throw new Error("Verification failed. Please try again.");
    }

    const profile: UserProfile = {
      name: res.user.name || name?.trim() || "Customer",
      phone: res.user.phone || phone,
      email: res.user.email || "",
      isLoggedIn: true,
    };

    await this.setSession(res.accessToken, profile);
    return { success: true, user: profile };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    requireAuth = true
  ): Promise<T> {
    const base = getApiBase();
    const url = `${base}${endpoint}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
      "bypass-tunnel-reminder": "true",
      ...(options.headers as Record<string, string>),
    };

    if (requireAuth) {
      const token = this.getToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
      const res = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        let msg = res.statusText || "Request failed";
        try {
          const errJson = await res.json();
          if (errJson?.message) {
            msg = Array.isArray(errJson.message) ? errJson.message.join(", ") : errJson.message;
          }
        } catch {
          const errText = await res.text().catch(() => "");
          if (errText) msg = errText;
        }
        throw new Error(msg);
      }

      const json = await res.json();
      return (json.data !== undefined ? json.data : json) as T;
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.warn(`[Customer API] Request to ${url} failed:`, err?.message || err);
      throw err;
    }
  }

  async get<T>(endpoint: string, requireAuth = false): Promise<T> {
    return this.request<T>(endpoint, { method: "GET" }, requireAuth);
  }

  async post<T>(endpoint: string, body: any, requireAuth = true): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: "POST",
        body: JSON.stringify(body),
      },
      requireAuth
    );
  }

  async put<T>(endpoint: string, body: any, requireAuth = true): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: "PUT",
        body: JSON.stringify(body),
      },
      requireAuth
    );
  }

  async delete<T>(endpoint: string, requireAuth = true): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE" }, requireAuth);
  }

  // ----------------------------------------------------
  // CATALOG APIS (Live Database Only)
  // ----------------------------------------------------

  async getCategories(): Promise<Category[]> {
    const backendCats = await this.get<BackendCategory[]>("/catalog/categories");
    if (Array.isArray(backendCats) && backendCats.length > 0) {
      return backendCats.map((cat) => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        icon: cat.icon || (cat.name === "Frozen" ? "❄️" : "🥩"),
        tint: cat.tint || (cat.name === "Frozen" ? "#E0F2FE" : "#FBE7DF"),
        sortOrder: cat.sortOrder,
      }));
    }
    return [];
  }

  async getProducts(params?: {
    category?: string;
    search?: string;
    bestseller?: boolean;
  }): Promise<Product[]> {
    const queryParts: string[] = [];
    if (params?.category) queryParts.push(`category=${encodeURIComponent(params.category.toLowerCase())}`);
    if (params?.search) queryParts.push(`search=${encodeURIComponent(params.search)}`);
    if (params?.bestseller) queryParts.push("bestseller=true");
    const qs = queryParts.length ? `?${queryParts.join("&")}` : "";

    const raw = await this.get<BackendProduct[]>(`/catalog/products${qs}`);
    if (Array.isArray(raw)) {
      return raw.map(this.transformProduct);
    }
    return [];
  }

  async getFeaturedSections(): Promise<
    Array<{
      id: string;
      title: string;
      subtitle?: string;
      icon?: string;
      slug: string;
      sortOrder: number;
      isActive: boolean;
      productIds: string[];
      products: Product[];
    }>
  > {
    const raw = await this.get<any[]>("/catalog/featured-sections");
    if (Array.isArray(raw)) {
      return raw.map((sec) => ({
        ...sec,
        products: Array.isArray(sec.products)
          ? sec.products.map(this.transformProduct)
          : [],
      }));
    }
    return [];
  }

  transformProduct(bp: BackendProduct): Product {
    const isDailyCatch = Boolean(bp.isDailyCatch);
    const isFlashFrozen = Boolean(bp.isFlashFrozen);
    const isFrozen =
      isFlashFrozen ||
      bp.category?.slug === "frozen" ||
      bp.category?.name?.toLowerCase() === "frozen" ||
      bp.name.toLowerCase().includes("frozen");

    const categoryName = bp.category?.name || (isFrozen ? "Frozen" : "Fish");
    const unitFormatted = bp.unit.startsWith("/") ? bp.unit : `/${bp.unit}`;

    // Available cuts
    const cuts = bp.cuts && bp.cuts.length > 0
      ? bp.cuts.map((c) => c.name)
      : isFrozen
      ? ["1-inch Steaks", "Standard Cut"]
      : ["Steak / Slice Cut", "Curry Cut (Medium)"];

    const cutOptions = bp.cuts?.map((c) => ({
      id: c.id,
      name: c.name,
      priceModifier: c.priceModifier,
      isDefault: c.isDefault,
    }));

    const stockText =
      bp.availableStockKg !== undefined && bp.availableStockKg > 0
        ? `${bp.availableStockKg} ${bp.unit} avail.`
        : bp.isInStock
        ? "In Stock"
        : "Fresh Batch";

    return {
      id: bp.id,
      slug: bp.slug,
      name: bp.name,
      detail: `${categoryName} · ${stockText}`,
      price: bp.basePrice,
      unit: unitFormatted,
      category: categoryName,
      categoryId: bp.categoryId,
      fresh: isDailyCatch || (!isFrozen && bp.category?.slug !== "frozen"),
      isDailyCatch,
      isFlashFrozen,
      image:
        bp.image ||
        bp.imageUrl ||
        "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80",
      description:
        bp.description ||
        `FreshGo premium ${bp.name}. Freshly processed, hygienic, and temperature-controlled.`,
      origin: bp.origin || "FreshGo High-Range Partner Farms",
      netWeight: bp.netWeightDescription || undefined,
      grossWeight: bp.grossWeightDescription || undefined,
      cuts,
      cutOptions,
      storageTip:
        bp.storageTip ||
        (isFrozen
          ? "Keep frozen below -18°C. Cook directly from frozen or thaw gently."
          : "Store between 0°C to 4°C. Consume within 24 hours."),
      rating: bp.rating || 4.8,
      reviewsCount: bp.reviewsCount || 24,
      isBestSeller: Boolean(bp.isBestSeller),
      isTodaysOffer: Boolean(bp.isTodaysOffer),
      originalPrice: bp.originalPrice ? Number(bp.originalPrice) : undefined,
      availableStockKg: bp.availableStockKg,
      isInStock:
        bp.availableStockKg !== undefined
          ? bp.availableStockKg > 0
          : (bp.isInStock ?? true),
      tag: undefined,
    };
  }

  // ----------------------------------------------------
  // ADDRESS APIS
  // ----------------------------------------------------

  async getAddresses(): Promise<BackendAddress[]> {
    if (!this.getToken()) return [];
    try {
      const addrs = await this.get<BackendAddress[]>("/users/addresses", true);
      return addrs || [];
    } catch (err) {
      console.log("[Customer API] Addresses note:", err);
      return [];
    }
  }

  async addAddress(dto: {
    title: string;
    street: string;
    landmark?: string;
    area: string;
    city: string;
    pincode: string;
    latitude: number;
    longitude: number;
    isDefault?: boolean;
  }): Promise<BackendAddress | null> {
    if (!this.getToken()) return null;
    try {
      const res = await this.post<BackendAddress>("/users/addresses", dto, true);
      return res;
    } catch (err: any) {
      console.error("[Customer API] addAddress error:", err.message);
      throw err;
    }
  }

  async updateAddress(
    id: string,
    dto: Partial<{
      title: string;
      street: string;
      landmark?: string;
      area: string;
      city: string;
      pincode: string;
      latitude: number;
      longitude: number;
      isDefault?: boolean;
    }>
  ): Promise<BackendAddress | null> {
    if (!this.getToken()) return null;
    try {
      const res = await this.put<BackendAddress>(`/users/addresses/${id}`, dto, true);
      return res;
    } catch (err: any) {
      console.error("[Customer API] updateAddress error:", err.message);
      throw err;
    }
  }

  async deleteAddress(id: string): Promise<boolean> {
    if (!this.getToken()) return false;
    try {
      await this.delete(`/users/addresses/${id}`, true);
      return true;
    } catch (err: any) {
      console.error("[Customer API] deleteAddress error:", err.message);
      throw err;
    }
  }

  // ----------------------------------------------------
  // HUBS APIS
  // ----------------------------------------------------

  async getHubs(): Promise<BackendHub[]> {
    try {
      const res = await this.get<any>("/hubs", false);
      const list = Array.isArray(res) ? res : res?.data && Array.isArray(res.data) ? res.data : [];
      return list.filter((h: any) => h.isActive !== false);
    } catch (err: any) {
      console.warn("[Customer API] getHubs note:", err.message);
      return [
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
    }
  }

  // ----------------------------------------------------
  // ORDER APIS
  // ----------------------------------------------------

  async getMyOrders(): Promise<CustomerOrder[]> {
    if (!this.getToken()) return [];
    try {
      const deliveredIds = await this.getDeliveredOrderIds();
      const rawOrders = await this.get<BackendOrder[]>("/orders/my", true);

      if (Array.isArray(rawOrders)) {
        return rawOrders.map((o) => {
          const orderNum = o.orderNumber || o.id.slice(0, 8).toUpperCase();
          let uiStatus: CustomerOrder["status"] = "placed";

          // If order is older than 2 hours and was left uncompleted,
          // treat it as delivered so stale/stuck orders from prior sessions never remain in active orders.
          const isStale = o.placedAt
            ? Date.now() - new Date(o.placedAt).getTime() > 2 * 60 * 60 * 1000
            : false;

          if (
            o.status === "DELIVERED" ||
            o.status === "CANCELLED" ||
            o.status === "FAILED_DELIVERY" ||
            o.status === "RETURNED_TO_HUB" ||
            isStale ||
            deliveredIds.includes(orderNum) ||
            deliveredIds.includes(o.id)
          ) {
            uiStatus = "delivered";
          } else if (
            ["CUTTING_PREPARING", "PACKED", "DISPATCH_READY"].includes(o.status)
          ) {
            uiStatus = "preparing";
          } else if (
            ["ASSIGNED", "ARRIVED_AT_HUB", "PICKED_UP", "OUT_FOR_DELIVERY"].includes(o.status)
          ) {
            uiStatus = "out_for_delivery";
          }

          const items = (o.items || []).map((item) => ({
            product: this.transformProduct(item.product),
            quantity: item.quantity,
            selectedCut: item.cutName || (item as any).cutOption?.name,
          }));

          const dateStr = o.placedAt
            ? new Date(o.placedAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                month: "short",
                day: "numeric",
              })
            : "Today";

          let addressStr = "Delivery Address";
          if (typeof o.deliveryAddress === "string") {
            addressStr = o.deliveryAddress;
          } else if (o.deliveryAddress?.street) {
            addressStr = `${o.deliveryAddress.street}, ${o.deliveryAddress.area || o.deliveryAddress.city || ""}`;
          } else if (o.deliveryAddressSnapshotJson) {
            try {
              const snap = typeof o.deliveryAddressSnapshotJson === "string"
                ? JSON.parse(o.deliveryAddressSnapshotJson)
                : o.deliveryAddressSnapshotJson;
              addressStr = `${snap.street || ""}${snap.area ? ", " + snap.area : ""}${snap.city ? ", " + snap.city : ""}`;
            } catch {
              // fallback
            }
          }

          return {
            id: o.orderNumber || o.id.slice(0, 8).toUpperCase(),
            date: dateStr,
            status: uiStatus,
            items,
            total: o.totalAmount,
            paymentMethod: o.paymentMethod?.toLowerCase() === "cod" ? "cod" : "upi",
            deliveryAddress: addressStr,
            riderName: o.deliveryPartner?.user?.name || "Ramesh K.",
            riderPhone: o.deliveryPartner?.user?.phone || "+91 91234 56789",
            estimatedArrival:
              uiStatus === "out_for_delivery"
                ? "Arriving in 15 mins"
                : uiStatus === "preparing"
                ? "Preparation in progress"
                : undefined,
          };
        });
      }
    } catch (err) {
      console.log("[Customer API] Orders note (using local orders):", err);
    }
    return [];
  }

  async deleteOrder(orderId: string): Promise<boolean> {
    try {
      await this.delete(`/orders/${orderId}`, true);
      return true;
    } catch (err) {
      console.log("[Customer API] Delete order note:", err);
      return false;
    }
  }

  async createOrder(orderDetails: {
    items: { product: Product; quantity: number; selectedCut?: string }[];
    total: number;
    paymentMethod: "cod" | "upi";
    hubId?: string;
    addressId?: string;
    addressDetails?: {
      title?: string;
      houseBuilding: string;
      street: string;
      landmark?: string;
      area: string;
      city: string;
      pincode?: string;
      latitude?: number;
      longitude?: number;
    };
    addressText?: string;
  }): Promise<{ success: boolean; orderId?: string; error?: string }> {
    if (!this.getToken()) {
      return { success: false, error: "Please log in to place your order" };
    }
    try {
      let addressId = orderDetails.addressId;

      // If user provided doorstep details at checkout, save as a real address first
      if (!addressId && orderDetails.addressDetails) {
        const ad = orderDetails.addressDetails;
        const newAddr = await this.addAddress({
          title: ad.title || "Home",
          street: `${ad.houseBuilding}, ${ad.street}`,
          landmark: ad.landmark || undefined,
          area: ad.area || "Local Area",
          city: ad.city || "Kozhikode",
          pincode: ad.pincode || "673004",
          latitude: ad.latitude || 11.2588,
          longitude: ad.longitude || 75.7804,
          isDefault: true,
        });
        if (newAddr) {
          addressId = newAddr.id;
        }
      }

      // If still no addressId, try getting existing saved addresses
      if (!addressId) {
        const addresses = await this.getAddresses();
        addressId = addresses[0]?.id;
      }

      if (!addressId) {
        return {
          success: false,
          error: "Please enter your building name and doorstep address to proceed.",
        };
      }

      // Map order items for backend DTO including cut preparations
      const orderItems = orderDetails.items.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
        cutOptionId:
          item.product.cutOptions?.find(
            (c) => c.name?.toLowerCase() === item.selectedCut?.toLowerCase()
          )?.id || item.product.cutOptions?.[0]?.id,
        cutName: item.selectedCut || item.product.cuts?.[0] || "Standard Cut",
      }));

      const payload = {
        addressId,
        hubId: orderDetails.hubId,
        paymentMethod: orderDetails.paymentMethod === "upi" ? "RAZORPAY" : "COD",
        items: orderItems,
        notes: "Placed from Customer Mobile App",
      };

      const idempotencyKey = `cust-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

      const res = await this.request<any>(
        "/orders",
        {
          method: "POST",
          headers: {
            "idempotency-key": idempotencyKey,
          },
          body: JSON.stringify(payload),
        },
        true
      );

      return {
        success: true,
        orderId: res.orderNumber || res.id,
      };
    } catch (err: any) {
      console.log("[Customer API] Live order creation fallback to local:", err.message);
      return { success: false, error: err.message };
    }
  }

  async registerPushToken(pushToken: string): Promise<boolean> {
    try {
      await this.request<{ success: boolean }>(
        "/users/push-token",
        {
          method: "POST",
          body: JSON.stringify({ pushToken }),
        },
        true
      );
      return true;
    } catch (err: any) {
      console.log("[Customer API] Push token registration note:", err.message);
      return false;
    }
  }

  async checkServiceability(lat: number, lng: number): Promise<ServiceabilityResult> {
    const safeLat = Number.isFinite(lat) ? Number(lat.toFixed(6)) : 11.2588;
    const safeLng = Number.isFinite(lng) ? Number(lng.toFixed(6)) : 75.7804;
    try {
      const res = await this.request<any>(
        `/hubs/serviceability?lat=${safeLat}&lng=${safeLng}`,
        { method: "GET" },
        false
      );
      return res.data !== undefined ? res.data : res;
    } catch (err: any) {
      console.warn("[Customer API] Serviceability check fallback:", err.message);
      return {
        serviceable: true,
        distanceKm: 2.5,
        estimatedDeliveryMinutes: 15,
        deliveryFee: 25,
      };
    }
  }

  async notifyInterest(data: {
    phone: string;
    email?: string;
    latitude?: number;
    longitude?: number;
    areaName?: string;
    consentGiven: boolean;
  }): Promise<{ success: boolean; message: string }> {
    const res = await this.request<any>(
      "/hubs/notify-interest",
      {
        method: "POST",
        body: JSON.stringify(data),
      },
      false
    );
    return res.data !== undefined ? res.data : res;
  }
}

export type ServiceabilityResult = {
  serviceable: boolean;
  hub?: {
    id: string;
    name: string;
    code: string;
    address: string;
    city: string;
    latitude?: number;
    longitude?: number;
    deliveryRadiusKm: number;
  };
  distanceKm?: number;
  estimatedDeliveryMinutes?: number;
  deliveryFee?: number;
  nearestDistanceKm?: number;
  nearestHub?: {
    id: string;
    name: string;
    city: string;
    latitude?: number;
    longitude?: number;
  };
  message?: string;
};

export type FeaturedSectionAppItem = {
  id: string;
  title: string;
  subtitle?: string;
  icon?: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
  productIds: string[];
  products: Product[];
};

export const customerApi = new CustomerApiClient();
export const api = customerApi;
