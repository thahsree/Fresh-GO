"use client";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

const TOKEN_KEY = "freshgo_admin_access_token";
const USER_KEY = "freshgo_admin_user";

export type AdminUser = {
  id: string;
  phone: string;
  email?: string;
  name: string;
  role: string;
  hubId?: string;
  hub?: {
    id: string;
    name: string;
    code: string;
    city: string;
    address?: string;
  } | null;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  tint?: string;
  sortOrder: number;
};

export type BackendProduct = {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  category?: Category;
  basePrice: number;
  unit: string;
  description?: string;
  origin?: string;
  imageUrl?: string;
  isActive: boolean;
  isBestSeller?: boolean;
  isTodaysOffer?: boolean;
  originalPrice?: number;
  isDailyCatch?: boolean;
  isFlashFrozen?: boolean;
  tag?: string;
  availableStockKg?: number;
  isInStock?: boolean;
  batches?: any[];
};

export type FeaturedSectionItem = {
  id: string;
  title: string;
  subtitle?: string;
  icon?: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
  productIds: string[];
  products?: BackendProduct[];
  productCount?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type Hub = {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  deliveryRadiusKm: number;
  contactPhone?: string | null;
  adminPasswordRaw?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  admins?: Array<{
    id: string;
    name: string;
    phone: string;
    role: string;
  }>;
};

export type DeliveryPartnerItem = {
  id: string;
  userId: string;
  vehicleType: string;
  vehicleNumber?: string;
  licenseNumber?: string;
  licensePhoto?: string;
  kycStatus: "PENDING" | "VERIFIED" | "REJECTED";
  partnerId?: string;
  hubId?: string;
  isOnline: boolean;
  rating: number;
  codCashInHand: number;
  createdAt: string;
  user: {
    id: string;
    name: string;
    phone: string;
    email?: string;
    isActive: boolean;
  };
  hub?: {
    id: string;
    name: string;
    code: string;
    contactPhone?: string;
  };
};

export type SalesReportKPIs = {
  grossRevenue: number;
  deliveredRevenue: number;
  totalOrders: number;
  deliveredOrdersCount: number;
  inProgressOrdersCount: number;
  cancelledOrdersCount: number;
  aov: number;
  activeHubsCount: number;
};

export type HubSalesBreakdown = {
  hubId: string;
  hubName: string;
  hubCode: string;
  city: string;
  totalOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  grossRevenue: number;
  aov: number;
};

export type DailySalesTrend = {
  date: string;
  revenue: number;
  orders: number;
};

export type TopSellingProduct = {
  productName: string;
  category: string;
  quantitySold: number;
  revenue: number;
};

export type SalesReportResponse = {
  kpis: SalesReportKPIs;
  hubBreakdown: HubSalesBreakdown[];
  dailyTrend: DailySalesTrend[];
  topProducts: TopSellingProduct[];
  paymentMethods: Record<string, { count: number; total: number }>;
};

export type QueueOrder = {
  id: string;
  orderNumber: string;
  status: string;
  subtotal?: number;
  cuttingChargesTotal?: number;
  deliveryFee?: number;
  discountAmount?: number;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  deliveryAddress: any;
  deliveryAddressSnapshotJson?: string;
  notes?: string;
  placedAt: string;
  customer?: {
    name?: string;
    phone: string;
  };
  hub?: {
    id: string;
    name: string;
    code: string;
    city?: string;
    address?: string;
  };
  deliveryPartner?: {
    id: string;
    user?: {
      name: string;
      phone: string;
    };
  };
  items: Array<{
    id: string;
    quantity: number;
    cutName?: string;
    unitPrice: number;
    totalPrice: number;
    product: {
      name: string;
      unit: string;
      imageUrl?: string;
    };
  }>;
};

export type ActivePartner = {
  id: string;
  userId?: string;
  name?: string;
  phone?: string;
  currentLat?: number;
  currentLng?: number;
  isOnline?: boolean;
  activeOrdersCount?: number;
  rating?: number;
  vehicleType?: string;
  codCashInHand?: number;
  user?: {
    id?: string;
    name?: string;
    phone?: string;
  };
};

export type DispatchTowerResponse = {
  queueOrders: QueueOrder[];
  activePartners: ActivePartner[];
};

class ApiClient {
  private token: string | null = null;
  private user: AdminUser | null = null;
  private authPromise: Promise<AdminUser | null> | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      this.token = localStorage.getItem(TOKEN_KEY);
      const userStr = localStorage.getItem(USER_KEY);
      if (userStr) {
        try {
          this.user = JSON.parse(userStr);
        } catch {
          this.user = null;
        }
      }
    }
  }

  getToken(): string | null {
    if (!this.token && typeof window !== "undefined") {
      this.token = localStorage.getItem(TOKEN_KEY);
    }
    return this.token;
  }

  setSession(token: string, user: AdminUser) {
    this.token = token;
    this.user = user;
    if (typeof window !== "undefined") {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
  }

  clearSession() {
    this.token = null;
    this.user = null;
    if (typeof window !== "undefined") {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
  }

  getUser(): AdminUser | null {
    return this.user;
  }

  /**
   * Sends OTP to a phone number
   */
  async sendOtp(phone: string): Promise<{ message: string; devOtp?: string }> {
    return this.post("/auth/otp/send", { phone }, false);
  }

  /**
   * Logs in a Super Admin user with mobile and password
   */
  async loginSuperAdmin(phone: string, password: string): Promise<AdminUser> {
    const res = await this.post<{
      accessToken: string;
      user: AdminUser;
    }>("/auth/super-admin/login", { phone, password }, false);

    if (res.user.role !== "SUPER_ADMIN") {
      throw new Error("Access denied: Account does not have Super Admin permissions.");
    }
    this.setSession(res.accessToken, res.user);
    return res.user;
  }

  /**
   * Logs in a Hub Admin user with Hub Number / Code and password
   */
  async loginHubAdmin(hubIdentifier: string, password: string): Promise<AdminUser> {
    const res = await this.post<{
      accessToken: string;
      user: AdminUser;
    }>("/auth/hub-admin/login", { hubIdentifier, password }, false);

    this.setSession(res.accessToken, res.user);
    return res.user;
  }

  /**
   * Returns current authenticated admin user from session if valid
   */
  getAdminUser(): AdminUser | null {
    if (typeof window !== "undefined") {
      const userStr = localStorage.getItem(USER_KEY);
      const token = localStorage.getItem(TOKEN_KEY);
      if (userStr && token) {
        try {
          const u = JSON.parse(userStr);
          if (u && (u.role === "ADMIN" || u.role === "SUPER_ADMIN")) {
            this.user = u;
            this.token = token;
            return u;
          }
        } catch {
          this.user = null;
        }
      }
    }
    return null;
  }

  /**
   * Returns current authenticated super admin user from session if valid
   */
  getSuperAdminUser(): AdminUser | null {
    if (typeof window !== "undefined") {
      const userStr = localStorage.getItem(USER_KEY);
      const token = localStorage.getItem(TOKEN_KEY);
      if (userStr && token) {
        try {
          const u = JSON.parse(userStr);
          if (u && u.role === "SUPER_ADMIN") {
            this.user = u;
            this.token = token;
            return u;
          }
        } catch {
          this.user = null;
        }
      }
    }
    return null;
  }

  /**
   * Ensures the super admin is authenticated.
   * Returns session user if role is SUPER_ADMIN, otherwise null.
   */
  async ensureSuperAdminAuth(): Promise<AdminUser | null> {
    return this.getSuperAdminUser();
  }

  /**
   * Ensures the admin user is authenticated with the backend.
   * Returns session user if role is ADMIN or SUPER_ADMIN, otherwise null.
   */
  async ensureAdminAuth(): Promise<AdminUser | null> {
    return this.getAdminUser();
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

    const res = await fetch(url, { ...options, headers });
    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (res.status === 401 && requireAuth) {
        this.clearSession();
        if (typeof window !== "undefined") {
          if (window.location.pathname.startsWith("/super-admin")) {
            window.location.href = "/super-admin/login";
          } else {
            window.location.href = "/login";
          }
        }
      }

      let errorMsg = `HTTP error ${res.status}: ${res.statusText || "Request failed"}`;
      let details: string[] = [];

      if (Array.isArray(json.message)) {
        details = json.message;
        errorMsg = json.message.join(" • ");
      } else if (typeof json.message === "string") {
        errorMsg = json.message;
      } else if (json.error) {
        errorMsg = json.error;
      }

      const err = new Error(errorMsg);
      (err as any).statusCode = res.status;
      (err as any).details = details;
      throw err;
    }

    // Backend wraps response in { success: true, statusCode: 200, data: T }
    return json.data !== undefined ? json.data : json;
  }

  get<T>(endpoint: string, requireAuth = true): Promise<T> {
    return this.request<T>(endpoint, { method: "GET" }, requireAuth);
  }

  post<T>(endpoint: string, body: any, requireAuth = true): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: "POST",
        body: JSON.stringify(body),
      },
      requireAuth
    );
  }

  put<T>(endpoint: string, body: any, requireAuth = true): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: "PUT",
        body: JSON.stringify(body),
      },
      requireAuth
    );
  }

  delete<T>(endpoint: string, requireAuth = true): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE" }, requireAuth);
  }

  // --- Convenience API Modules ---

  readonly catalog = {
    getCategories: () => this.get<Category[]>("/catalog/categories", false),
    getProducts: (params?: { category?: string; search?: string }) => {
      const q = new URLSearchParams();
      if (params?.category) q.set("category", params.category);
      if (params?.search) q.set("search", params.search);
      const queryStr = q.toString() ? `?${q.toString()}` : "";
      return this.get<BackendProduct[]>(`/catalog/products${queryStr}`, false);
    },
    createProduct: (data: {
      name: string;
      categoryId: string;
      basePrice: number;
      unit: string;
      stock?: number;
      initialStockKg?: number;
      description?: string;
      image?: string;
      origin?: string;
      isBestSeller?: boolean;
      isTodaysOffer?: boolean;
      originalPrice?: number;
      isDailyCatch?: boolean;
      isFlashFrozen?: boolean;
      tag?: string;
      netWeightGrams?: number;
      grossWeightGrams?: number;
      piecesCount?: number;
      servesCount?: number;
      storageTemp?: string;
      shelfLifeDays?: number;
    }) => this.post<BackendProduct>("/catalog/products", data, true),
    updateProduct: (
      id: string,
      data: {
        name?: string;
        categoryId?: string;
        basePrice?: number;
        unit?: string;
        stock?: number;
        initialStockKg?: number;
        description?: string;
        image?: string;
        origin?: string;
        isActive?: boolean;
        isBestSeller?: boolean;
        isTodaysOffer?: boolean;
        originalPrice?: number;
        isDailyCatch?: boolean;
        isFlashFrozen?: boolean;
        tag?: string;
      }
    ) => this.put<BackendProduct>(`/catalog/products/${id}`, data, true),
    deleteProduct: (id: string) =>
      this.delete<{ id: string }>(`/catalog/products/${id}`, true),
  };

  readonly dispatch = {
    getTower: () => this.get<DispatchTowerResponse>("/dispatch/tower", true),
    assignOrder: (orderId: string, partnerProfileId?: string) =>
      this.post<{ message: string; order: QueueOrder }>(
        `/dispatch/orders/${orderId}/assign`,
        { partnerProfileId },
        true
      ),
  };

  readonly orders = {
    updateStatus: (orderId: string, status: string, notes?: string) =>
      this.put<QueueOrder>(
        `/orders/${orderId}/status`,
        { status, notes },
        true
      ),
  };

  readonly inventory = {
    getBatches: (productId?: string) =>
      this.get<any[]>(
        productId ? `/inventory/batches?productId=${productId}` : "/inventory/batches",
        true
      ),
  };

  readonly featuredSections = {
    getAll: (includeInactive = true) =>
      this.get<FeaturedSectionItem[]>(
        `/catalog/featured-sections${includeInactive ? "?all=true" : ""}`,
        false
      ),
    create: (data: {
      title: string;
      subtitle?: string;
      icon?: string;
      sortOrder?: number;
      isActive?: boolean;
      productIds?: string[];
    }) => this.post<FeaturedSectionItem>("/catalog/featured-sections", data, true),
    update: (
      id: string,
      data: {
        title?: string;
        subtitle?: string;
        icon?: string;
        sortOrder?: number;
        isActive?: boolean;
        productIds?: string[];
      }
    ) => this.put<FeaturedSectionItem>(`/catalog/featured-sections/${id}`, data, true),
    delete: (id: string) =>
      this.delete<{ id: string }>(`/catalog/featured-sections/${id}`, true),
  };

  readonly hubs = {
    getAll: () => this.get<Hub[]>("/hubs", false),
    getById: (id: string) => this.get<Hub>(`/hubs/${id}`, false),
    create: (data: {
      name: string;
      code: string;
      address: string;
      city?: string;
      latitude: number;
      longitude: number;
      deliveryRadiusKm?: number;
      contactPhone?: string;
      isActive?: boolean;
    }) => this.post<Hub>("/hubs", data, true),
    update: (
      id: string,
      data: {
        name?: string;
        code?: string;
        address?: string;
        city?: string;
        latitude?: number;
        longitude?: number;
        deliveryRadiusKm?: number;
        contactPhone?: string;
        isActive?: boolean;
      }
    ) => this.put<Hub>(`/hubs/${id}`, data, true),
    delete: (id: string) =>
      this.delete<{ id: string; message: string }>(`/hubs/${id}`, true),
    checkServiceability: (lat: number, lng: number) =>
      this.get<{
        serviceable: boolean;
        hub?: Hub;
        distanceKm?: number;
        estimatedDeliveryMinutes?: number;
        deliveryFee?: number;
        nearestDistanceKm?: number;
        nearestHub?: Partial<Hub>;
        message?: string;
      }>(`/hubs/serviceability?lat=${lat}&lng=${lng}`, false),
    notifyInterest: (data: {
      phone: string;
      email?: string;
      latitude?: number;
      longitude?: number;
      areaName?: string;
      consentGiven: boolean;
    }) => this.post<{ id: string; message: string }>("/hubs/notify-interest", data, false),
    setAdminPassword: (
      hubId: string,
      data?: { password?: string; adminPhone?: string }
    ) =>
      this.post<{
        success: boolean;
        hubId: string;
        hubName: string;
        hubNumber: string;
        hubCode: string;
        password?: string;
      }>(`/hubs/${hubId}/admin-password`, data || {}, true),
  };

  readonly deliveryPartners = {
    getAll: (hubId?: string) =>
      this.get<DeliveryPartnerItem[]>(
        hubId ? `/delivery/partners?hubId=${hubId}` : "/delivery/partners",
        true
      ),
    updateStatus: (id: string, status: "VERIFIED" | "REJECTED" | "PENDING") =>
      this.put<DeliveryPartnerItem>(
        `/delivery/partners/${id}/status`,
        { status },
        true
      ),
  };

  readonly analytics = {
    getSalesReport: (filter?: {
      startDate?: string;
      endDate?: string;
      hubId?: string;
    }) => {
      const q = new URLSearchParams();
      if (filter?.startDate) q.set("startDate", filter.startDate);
      if (filter?.endDate) q.set("endDate", filter.endDate);
      if (filter?.hubId) q.set("hubId", filter.hubId);
      const queryStr = q.toString() ? `?${q.toString()}` : "";
      return this.get<SalesReportResponse>(
        `/analytics/sales-report${queryStr}`,
        true
      );
    },
  };
}

export const api = new ApiClient();
