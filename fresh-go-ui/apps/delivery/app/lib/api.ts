export type DeliveryHub = {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  deliveryRadiusKm?: number;
  isActive?: boolean;
};

export type DeliveryUser = {
  id: string;
  phone: string;
  name: string;
  role: string;
  email?: string;
  hubId?: string;
  hub?: DeliveryHub | null;
  partnerProfile?: {
    id: string;
    vehicleType: string;
    isOnline: boolean;
    rating: number;
    completedDeliveries: number;
    codCashInHand: number;
    hubId?: string;
    hub?: DeliveryHub | null;
  } | null;
};

export type BackendOrder = {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  subtotal?: number;
  deliveryFee?: number;
  cuttingChargesTotal?: number;
  paymentMethod: string;
  paymentStatus?: string;
  placedAt?: string;
  customer: {
    name: string;
    phone: string;
  };
  items: Array<{
    id: string;
    quantity: number;
    unitPrice?: number;
    totalPrice?: number;
    product: {
      id: string;
      name: string;
      image?: string;
      unit?: string;
    };
  }>;
  hub?: DeliveryHub;
  zone?: {
    id: string;
    name: string;
  };
  deliveryAddress?: string;
  dropAddress?: string;
};

export type ActiveTrip = {
  id: string;
  orderId: string;
  partnerId: string;
  phase: "ACCEPTED" | "AT_PICKUP" | "ON_THE_WAY" | "DELIVERED" | "CANCELLED";
  distanceKm: number;
  order: BackendOrder;
  arrivedHubAt?: string;
  pickedUpAt?: string;
  completedAt?: string;
};

export type DeliveryDashboardData = {
  profile: {
    id: string;
    isOnline: boolean;
    vehicleType: string;
    rating: number;
    completedDeliveries: number;
    codCashInHand: number;
    codLimitExceeded: boolean;
    preferredZone?: string;
  };
  activeTrip: ActiveTrip | null;
  todayEarnings: number;
  recentDeliveries: Array<{
    id: string;
    phase: string;
    distanceKm: number;
    completedAt: string;
    order: {
      orderNumber: string;
      totalAmount: number;
      paymentMethod: string;
    };
  }>;
};

const TOKEN_KEY = "freshgo_delivery_token";
const USER_KEY = "freshgo_delivery_user";
const HUB_KEY = "freshgo_delivery_hub";

export function getApiBaseUrl(): string {
  // 1. Explicit env var (inlined by Next.js if NEXT_PUBLIC_API_URL is configured)
  if (typeof process !== "undefined" && process?.env?.NEXT_PUBLIC_API_URL) {
    const envUrl = process.env.NEXT_PUBLIC_API_URL.trim().replace(/\/+$/, "");
    if (envUrl.length > 0) return envUrl;
  }

  // 2. Browser runtime host inspection
  if (typeof window !== "undefined" && window.location) {
    const host = window.location.hostname;
    // Local development only
    if (host === "localhost" || host === "127.0.0.1") {
      return "http://localhost:4000/api/v1";
    }
    // Local LAN testing from another device on the same network
    if (/^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(host)) {
      return `http://${host}:4000/api/v1`;
    }
  }

  // 3. Default to production backend for all deployed environments (Vercel, AWS, etc.)
  return "https://fresh-go.duckdns.org/api/v1";
}

export function getSocketUrl(): string {
  const base = getApiBaseUrl().replace("/api/v1", "");
  return base;
}

class DeliveryApiClient {
  private token: string | null = null;
  private user: DeliveryUser | null = null;
  private selectedHub: DeliveryHub | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      try {
        this.token = localStorage.getItem(TOKEN_KEY);
        const storedUser = localStorage.getItem(USER_KEY);
        if (storedUser) this.user = JSON.parse(storedUser);
        const storedHub = localStorage.getItem(HUB_KEY);
        if (storedHub) this.selectedHub = JSON.parse(storedHub);
      } catch {
        // ignore
      }
    }
  }

  getToken(): string | null {
    if (!this.token && typeof window !== "undefined") {
      this.token = localStorage.getItem(TOKEN_KEY);
    }
    return this.token;
  }

  getUser(): DeliveryUser | null {
    if (!this.user && typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(USER_KEY);
        if (stored) this.user = JSON.parse(stored);
      } catch {
        // ignore
      }
    }
    return this.user;
  }

  getSelectedHub(): DeliveryHub | null {
    if (!this.selectedHub && typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(HUB_KEY);
        if (stored) this.selectedHub = JSON.parse(stored);
      } catch {
        // ignore
      }
    }
    return this.selectedHub;
  }

  saveSession(token: string, user: DeliveryUser) {
    this.token = token;
    this.user = user;
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        const partnerHub = user.hub || user.partnerProfile?.hub;
        if (partnerHub) {
          this.saveSelectedHub(partnerHub);
        }
      } catch {
        // ignore
      }
    }
  }

  saveSelectedHub(hub: DeliveryHub) {
    this.selectedHub = hub;
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(HUB_KEY, JSON.stringify(hub));
      } catch {
        // ignore
      }
    }
  }

  clearSession() {
    this.token = null;
    this.user = null;
    this.selectedHub = null;
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem(HUB_KEY);
      } catch {
        // ignore
      }
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${getApiBaseUrl()}${endpoint}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    const token = this.getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(url, { ...options, headers });

    if (!res.ok) {
      let errorMsg = `Server error ${res.status}`;
      try {
        const errJson = await res.json();
        errorMsg = errJson.message || errJson.error || errorMsg;
      } catch {
        // ignore
      }
      throw new Error(errorMsg);
    }

    const json = await res.json().catch(() => ({}));
    return (json && json.data !== undefined) ? json.data : json;
  }

  async loginPartner(phone: string, partnerId: string): Promise<{ accessToken: string; user: DeliveryUser }> {
    const raw = await this.request<any>("/auth/delivery/login", {
      method: "POST",
      body: JSON.stringify({ phone, partnerId }),
    });

    const res = raw?.data || raw;
    if (res?.accessToken && res?.user) {
      this.saveSession(res.accessToken, res.user);
    }
    return res;
  }

  async registerPartner(payload: {
    phone: string;
    name?: string;
    hubId: string;
    vehicleType?: string;
    vehicleNumber?: string;
    licenseNumber?: string;
    licensePhoto?: string;
  }) {
    return this.request<{
      message: string;
      partnerId: string;
      kycStatus: string;
      hub: { id: string; name: string; code: string; address?: string };
      instructions: string;
    }>("/auth/delivery/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async getMe() {
    const res = await this.request<{ user: DeliveryUser }>("/auth/me");
    if (res.user) {
      this.user = res.user;
      if (typeof window !== "undefined") {
        localStorage.setItem(USER_KEY, JSON.stringify(res.user));
      }
    }
    return res.user;
  }

  // --- Hubs Endpoints ---
  async getHubs(): Promise<DeliveryHub[]> {
    return this.request<DeliveryHub[]>("/hubs");
  }

  // --- Delivery Partner Endpoints ---
  async getDashboard(): Promise<DeliveryDashboardData> {
    return this.request<DeliveryDashboardData>("/delivery/dashboard");
  }

  async getAvailableOrders(hubId?: string): Promise<BackendOrder[]> {
    const query = hubId ? `?hubId=${encodeURIComponent(hubId)}` : "";
    return this.request<BackendOrder[]>(`/delivery/available-orders${query}`);
  }

  async acceptOrder(orderId: string | any): Promise<ActiveTrip> {
    let cleanId = "";
    if (typeof orderId === "string") {
      cleanId = orderId.trim();
    } else if (orderId && typeof orderId === "object") {
      cleanId = orderId.id || orderId.orderId || orderId.orderNumber || "";
    }
    const finalId =
      cleanId && cleanId !== "[object Object]"
        ? encodeURIComponent(cleanId)
        : "current";
    return this.request<ActiveTrip>(`/delivery/orders/${finalId}/accept`, {
      method: "POST",
    });
  }

  async updateTripPhase(
    tripId: string,
    phase: "ACCEPTED" | "AT_PICKUP" | "ON_THE_WAY" | "DELIVERED",
    distanceKm?: number
  ): Promise<ActiveTrip> {
    return this.request<ActiveTrip>(`/delivery/trips/${tripId}/phase`, {
      method: "PUT",
      body: JSON.stringify({ phase, distanceKm }),
    });
  }

  async updateOnlineStatus(isOnline: boolean) {
    return this.request("/users/partner/profile", {
      method: "PUT",
      body: JSON.stringify({ isOnline }),
    });
  }

  async reportIssue(dto: {
    tripId?: string;
    orderId?: string;
    category: string;
    description: string;
    priority?: string;
  }) {
    return this.request("/delivery/issues", {
      method: "POST",
      body: JSON.stringify(dto),
    });
  }
}

export const deliveryApi = new DeliveryApiClient();
