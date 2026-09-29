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
  if (typeof process !== "undefined" && process?.env?.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, "");
  }
  if (typeof window !== "undefined" && window.location) {
    const host = window.location.hostname;
    if (host && host !== "localhost" && host !== "127.0.0.1") {
      return `http://${host}:4000/api/v1`;
    }
  }
  return "http://localhost:4000/api/v1";
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
        if (user.hub && !this.selectedHub) {
          this.saveSelectedHub(user.hub);
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
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
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

    return res.json();
  }

  // --- Auth Endpoints ---
  async sendOtp(phone: string) {
    return this.request<{
      message: string;
      devOtp?: string;
      isMock?: boolean;
    }>("/auth/otp/send", {
      method: "POST",
      body: JSON.stringify({ phone }),
    });
  }

  async verifyOtp(phone: string, otp: string, name?: string) {
    const res = await this.request<{
      accessToken: string;
      refreshToken: string;
      user: DeliveryUser;
    }>("/auth/otp/verify", {
      method: "POST",
      body: JSON.stringify({
        phone,
        otp,
        role: "DELIVERY_PARTNER",
        name: name || "Delivery Partner",
      }),
    });

    if (res.accessToken && res.user) {
      this.saveSession(res.accessToken, res.user);
    }
    return res;
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

  async acceptOrder(orderId: string): Promise<ActiveTrip> {
    return this.request<ActiveTrip>(`/delivery/orders/${orderId}/accept`, {
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
