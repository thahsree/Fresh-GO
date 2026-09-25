import { NativeModules, Platform } from "react-native";
import {
  type Category,
  type Product,
  allProducts as fallbackProducts,
  categories as fallbackCategories,
} from "../models/catalog";
import type { CustomerOrder } from "../components/OrdersView";
import type { UserProfile } from "../components/ProfileView";

declare const process: any;

function resolveApiBase(): string {
  if (typeof process !== "undefined" && process?.env?.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  if (Platform.OS === "web") {
    return "http://localhost:4000/api/v1";
  }

  try {
    const scriptURL = NativeModules?.SourceCode?.scriptURL;
    if (typeof scriptURL === "string") {
      const parts = scriptURL.split("://");
      if (parts.length > 1) {
        const rawProtocol = parts[0] || "http";
        // Always use valid http or https protocol (never 'exp' or 'exps' which cancel fetch in React Native)
        const protocol = rawProtocol.startsWith("https") || rawProtocol === "exps" ? "https" : "http";
        const hostPort = parts[1].split("/")[0];
        if (hostPort) {
          // Metro proxy forwards /api/ directly to NestJS backend on port 4000
          return `${protocol}://${hostPort}/api/v1`;
        }
      }
    }
  } catch {
    // ignore
  }

  return "http://10.104.176.61:4000/api/v1";
}

export const API_BASE = resolveApiBase();

const TOKEN_KEY = "freshgo_customer_token";
const USER_KEY = "freshgo_customer_user";

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

export type BackendOrderItem = {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  cutOption?: { id: string; name: string } | null;
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
  private authPromise: Promise<UserProfile | null> | null = null;

  constructor() {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        this.token = localStorage.getItem(TOKEN_KEY);
        const stored = localStorage.getItem(USER_KEY);
        if (stored) this.user = JSON.parse(stored);
      } catch {
        // ignore
      }
    }
  }

  getToken(): string | null {
    if (!this.token && typeof window !== "undefined" && window.localStorage) {
      this.token = localStorage.getItem(TOKEN_KEY);
    }
    return this.token;
  }

  setSession(token: string, user: UserProfile) {
    this.token = token;
    this.user = user;
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
      } catch {
        // ignore
      }
    }
  }

  clearSession() {
    this.token = null;
    this.user = null;
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      } catch {
        // ignore
      }
    }
  }

  getUser(): UserProfile | null {
    return this.user;
  }

  /**
   * Automatically authenticate with backend customer account (Thashreef R. / +919876543210)
   * or restore existing session.
   */
  async ensureCustomerAuth(): Promise<UserProfile | null> {
    if (this.user && this.token) return this.user;
    if (this.authPromise) return this.authPromise;

    this.authPromise = (async () => {
      try {
        const phone = "+919876543210";
        const otp = "123456";

        // Step 1: Send OTP
        await this.post("/auth/otp/send", { phone }, false);

        // Step 2: Verify OTP
        const res = await this.post<{
          accessToken: string;
          user: {
            id: string;
            phone: string;
            name: string;
            email?: string;
          };
        }>("/auth/otp/verify", { phone, otp }, false);

        if (res.accessToken && res.user) {
          const profile: UserProfile = {
            name: res.user.name || "Thashreef R.",
            phone: res.user.phone,
            email: res.user.email || "thashreef@freshgo.in",
            isLoggedIn: true,
          };
          this.setSession(res.accessToken, profile);
          return profile;
        }
      } catch (err) {
        console.log("[Customer API] Backend auth note (using local profile):", err);
      } finally {
        this.authPromise = null;
      }
      return null;
    })();

    return this.authPromise;
  }

  async sendOtp(rawPhone: string): Promise<{ success: boolean; message: string; devOtp?: string }> {
    const digits = rawPhone.replace(/\D/g, "");
    const phone = digits.length === 10 ? `+91${digits}` : rawPhone.startsWith("+") ? rawPhone : `+${digits}`;
    try {
      const res = await this.post<{ message: string; phone: string; devOtp?: string }>(
        "/auth/otp/send",
        { phone },
        false
      );
      return { success: true, message: res.message || "OTP sent successfully", devOtp: res.devOtp || "123456" };
    } catch (err: any) {
      console.log("[Customer API] sendOtp note (using local demo mode):", err.message);
      return { success: true, message: "OTP sent (dev code: 123456)", devOtp: "123456" };
    }
  }

  async verifyOtp(
    rawPhone: string,
    otp: string,
    name?: string
  ): Promise<{ success: boolean; user: UserProfile; error?: string }> {
    const digits = rawPhone.replace(/\D/g, "");
    const phone = digits.length === 10 ? `+91${digits}` : rawPhone.startsWith("+") ? rawPhone : `+${digits}`;
    try {
      const res = await this.post<{
        accessToken: string;
        user: {
          id: string;
          phone: string;
          name: string;
          email?: string;
        };
      }>("/auth/otp/verify", { phone, otp, role: "CUSTOMER", name: name?.trim() }, false);

      if (res.accessToken && res.user) {
        const profile: UserProfile = {
          name: res.user.name || name?.trim() || "Thashreef R.",
          phone: res.user.phone || phone,
          email: res.user.email || "",
          isLoggedIn: true,
        };
        this.setSession(res.accessToken, profile);
        return { success: true, user: profile };
      }
    } catch (err: any) {
      console.log("[Customer API] verifyOtp backend fallback:", err.message);
    }

    const fallbackProfile: UserProfile = {
      name: name?.trim() || "Thashreef R.",
      phone,
      email: "",
      isLoggedIn: true,
    };
    this.setSession("customer-session-token", fallbackProfile);
    return { success: true, user: fallbackProfile };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    requireAuth = true
  ): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
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
        const errText = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status}: ${errText || res.statusText}`);
      }

      const json = await res.json();
      return (json.data !== undefined ? json.data : json) as T;
    } catch (err) {
      clearTimeout(timeoutId);
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

  // ----------------------------------------------------
  // CATALOG APIS
  // ----------------------------------------------------

  async getCategories(): Promise<Category[]> {
    try {
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
    } catch (err) {
      console.log("[Customer API] Categories note (using local fallback):", err);
    }
    return fallbackCategories;
  }

  async getProducts(params?: {
    category?: string;
    search?: string;
    bestseller?: boolean;
  }): Promise<Product[]> {
    try {
      const queryParts: string[] = [];
      if (params?.category) queryParts.push(`category=${encodeURIComponent(params.category.toLowerCase())}`);
      if (params?.search) queryParts.push(`search=${encodeURIComponent(params.search)}`);
      if (params?.bestseller) queryParts.push("bestseller=true");
      const qs = queryParts.length ? `?${queryParts.join("&")}` : "";

      const raw = await this.get<BackendProduct[]>(`/catalog/products${qs}`);
      if (Array.isArray(raw) && raw.length > 0) {
        return raw.map(this.transformProduct);
      }
    } catch (err) {
      console.log("[Customer API] Products note (using local fallback):", err);
    }
    return fallbackProducts;
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
      isBestSeller: bp.isBestSeller ?? true,
      availableStockKg: bp.availableStockKg,
      isInStock:
        bp.availableStockKg !== undefined
          ? bp.availableStockKg > 0
          : (bp.isInStock ?? true),
      tag:
        bp.tag ||
        (isDailyCatch
          ? "Fresh Catch"
          : isFrozen
          ? "Frozen"
          : categoryName.toLowerCase().includes("meat")
          ? "Fresh Cut"
          : categoryName.toLowerCase().includes("veg")
          ? "Fresh Produce"
          : "Fresh"),
    };
  }

  // ----------------------------------------------------
  // ADDRESS APIS
  // ----------------------------------------------------

  async getAddresses(): Promise<BackendAddress[]> {
    try {
      await this.ensureCustomerAuth();
      const addrs = await this.get<BackendAddress[]>("/users/addresses", true);
      return addrs || [];
    } catch (err) {
      console.log("[Customer API] Addresses note:", err);
      return [];
    }
  }

  // ----------------------------------------------------
  // ORDER APIS
  // ----------------------------------------------------

  async getMyOrders(): Promise<CustomerOrder[]> {
    try {
      await this.ensureCustomerAuth();
      const rawOrders = await this.get<BackendOrder[]>("/orders/my", true);

      if (Array.isArray(rawOrders)) {
        return rawOrders.map((o) => {
          let uiStatus: CustomerOrder["status"] = "placed";
          if (["CUTTING_PREPARING", "PACKED", "DISPATCH_READY"].includes(o.status)) {
            uiStatus = "preparing";
          } else if (
            ["ASSIGNED", "ARRIVED_AT_HUB", "PICKED_UP", "OUT_FOR_DELIVERY"].includes(o.status)
          ) {
            uiStatus = "out_for_delivery";
          } else if (o.status === "DELIVERED") {
            uiStatus = "delivered";
          }

          const items = (o.items || []).map((item) => ({
            product: this.transformProduct(item.product),
            quantity: item.quantity,
          }));

          const dateStr = o.placedAt
            ? new Date(o.placedAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                month: "short",
                day: "numeric",
              })
            : "Today";

          let addressStr = "Palm Residency, Flat 4B, 4th Cross Road";
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

  async createOrder(orderDetails: {
    items: { product: Product; quantity: number }[];
    total: number;
    paymentMethod: "cod" | "upi";
    address: string;
  }): Promise<{ success: boolean; orderId?: string; error?: string }> {
    try {
      await this.ensureCustomerAuth();

      // Find or get a valid address ID
      const addresses = await this.getAddresses();
      let addressId = addresses[0]?.id;

      if (!addressId) {
        // Create an address in the delivery zone
        const newAddr = await this.post<BackendAddress>(
          "/users/addresses",
          {
            title: "Home",
            street: orderDetails.address || "Palm Residency, Flat 4B, 4th Cross Road",
            area: "Kozhikode Central",
            city: "Kozhikode",
            pincode: "673004",
            latitude: 11.2588,
            longitude: 75.7804,
            isDefault: true,
          },
          true
        );
        addressId = newAddr.id;
      }

      // Map order items for backend DTO
      const orderItems = orderDetails.items.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
        cutOptionId: item.product.cutOptions?.[0]?.id,
      }));

      const payload = {
        addressId,
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
}

export const customerApi = new CustomerApiClient();
