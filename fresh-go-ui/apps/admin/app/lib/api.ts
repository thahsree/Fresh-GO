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
  isDailyCatch?: boolean;
  isFlashFrozen?: boolean;
  tag?: string;
  availableStockKg?: number;
  isInStock?: boolean;
  batches?: any[];
};

export type QueueOrder = {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  deliveryAddress: any;
  placedAt: string;
  customer?: {
    name?: string;
    phone: string;
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
   * Ensures the admin user is authenticated with the backend.
   * If no valid token exists, automatically authenticates with the seeded admin account.
   */
  async ensureAdminAuth(): Promise<AdminUser | null> {
    if (this.user && this.token) return this.user;
    if (this.authPromise) return this.authPromise;

    this.authPromise = (async () => {
      try {
        // Attempt quick login using seeded default admin credentials
        const phone = "+919999999999";
        const otp = "123456";

        // Step 1: Send OTP
        await this.post("/auth/otp/send", { phone }, false);

        // Step 2: Verify OTP
        const res = await this.post<{
          accessToken: string;
          user: AdminUser;
        }>("/auth/otp/verify", { phone, otp }, false);

        if (res.accessToken && res.user) {
          this.setSession(res.accessToken, res.user);
          return res.user;
        }
      } catch (err) {
        console.warn("Auto-admin login warning (backend may be offline):", err);
      } finally {
        this.authPromise = null;
      }
      return null;
    })();

    return this.authPromise;
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
      // If unauthorized and requireAuth, clear expired session, re-login and retry once
      if (
        res.status === 401 &&
        requireAuth &&
        !(options.headers as any)?.["X-Freshgo-Retry"]
      ) {
        this.clearSession();
        await this.ensureAdminAuth();
        const retryHeaders = {
          ...(options.headers as Record<string, string>),
          "X-Freshgo-Retry": "1",
        };
        return this.request<T>(
          endpoint,
          { ...options, headers: retryHeaders },
          requireAuth
        );
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
}

export const api = new ApiClient();
