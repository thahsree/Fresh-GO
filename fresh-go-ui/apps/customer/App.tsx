import { colors } from "@fresh-food/design-tokens";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { BackHandler, Platform, StyleSheet, View } from "react-native";
import {
  SafeAreaProvider,
  SafeAreaView,
} from "react-native-safe-area-context";
import { AuthView } from "./components/AuthView";
import { BottomNavigation } from "./components/BottomNavigation";
import { CartView } from "./components/CartView";
import { HelpSupportView } from "./components/HelpSupportView";
import { HomeView } from "./components/HomeView";
import { type CustomerOrder, OrdersView } from "./components/OrdersView";
import { ProductDetailModal } from "./components/ProductDetailModal";
import { ProductListingView } from "./components/ProductListingView";
import { type UserProfile, ProfileView } from "./components/ProfileView";
import { SplashScreen } from "./components/SplashScreen";
import { SnackbarNotification } from "./components/SnackbarNotification";
import { BackendConnectionError } from "./components/BackendConnectionError";
import { customerApi } from "./lib/api";
import {
  dispatchOrderNotification,
  requestNotificationPermission,
  registerPushTokenWithBackend,
} from "./lib/notifications";
import { type Category, type Product } from "./models/catalog";

export default function App() {
  // Navigation: "Home" | "Cart" | "Orders" | "Profile"
  const [activeNavigation, setActiveNavigation] = useState("Home");

  // Dynamic Catalog & Categories State (Empty until loaded from backend)
  const [products, setProducts] = useState<Product[]>([]);
  const [categoriesList, setCategoriesList] = useState<Category[]>([]);

  // Cart State: { [productId]: quantity }
  const [cart, setCart] = useState<{ [productId: string]: number }>({});

  // Favorites
  const [favorites, setFavorites] = useState<string[]>([]);

  // Search & Category Filters
  const [searchValue, setSearchValue] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Product Popup Modal State
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  // Auth State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Product Listing Screen State
  const [isListingOpen, setIsListingOpen] = useState(false);
  const [listingCategory, setListingCategory] = useState<string | null>(null);
  const [listingSearch, setListingSearch] = useState("");

  // Customer Profile
  const [user, setUser] = useState<UserProfile>({
    name: "Guest",
    phone: "",
    isLoggedIn: false,
  });

  // Orders State
  const [orders, setOrders] = useState<CustomerOrder[]>([]);

  // Address State
  const [customerAddress, setCustomerAddress] = useState(
    "Select Delivery Address",
  );

  // Backend Connection & Lifecycle
  const [isInitializing, setIsInitializing] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // --------------------------------------------------------------------------
  // Backend Integration & Synchronization
  // --------------------------------------------------------------------------
  const syncWithBackend = async () => {
    try {
      setConnectionError(null);

      // 1. Fetch live categories & products from backend
      const [liveCats, liveProducts] = await Promise.all([
        customerApi.getCategories(),
        customerApi.getProducts(),
      ]);

      setProducts(liveProducts || []);
      setCategoriesList(liveCats || []);
      setConnectionError(null);

      // 2. Fetch authenticated customer details & live orders (non-blocking)
      try {
        const authUser = await customerApi.ensureCustomerAuth();
        if (authUser) setUser(authUser);

        const liveOrders = await customerApi.getMyOrders();
        if (liveOrders) setOrders(liveOrders);

        const liveAddrs = await customerApi.getAddresses();
        if (liveAddrs && liveAddrs.length > 0) {
          const defaultAddr = liveAddrs.find((a) => a.isDefault) || liveAddrs[0];
          setCustomerAddress(
            `${defaultAddr.street}, ${defaultAddr.area || defaultAddr.city}`,
          );
        }
      } catch {
        // Non-blocking
      }
    } catch (err: any) {
      console.warn("Backend synchronization error:", err?.message || err);
      setConnectionError(
        err?.message || "Could not connect to FreshGo server on port 4000.",
      );
    } finally {
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    requestNotificationPermission()
      .then(() => registerPushTokenWithBackend())
      .catch(() => {});
    syncWithBackend();
  }, []);

  // --------------------------------------------------------------------------
  // Mobile Screen & Hardware Back Navigation
  // --------------------------------------------------------------------------
  useEffect(() => {
    const handleBackNavigation = () => {
      // 1. Close Product Detail Modal
      if (isProductModalOpen) {
        setIsProductModalOpen(false);
        return true;
      }

      // 2. Close Auth (Login / Signup) Modal
      if (isAuthModalOpen) {
        setIsAuthModalOpen(false);
        return true;
      }

      // 3. Close Help & Support subview (in Profile tab)
      if (isHelpOpen) {
        setIsHelpOpen(false);
        return true;
      }

      // 4. Close Product Listing Screen
      if (isListingOpen) {
        setIsListingOpen(false);
        return true;
      }

      // 5. Navigate from sub-tabs (Cart, Orders, Profile) back to Home
      if (activeNavigation !== "Home") {
        setActiveNavigation("Home");
        return true;
      }

      // 6. Reset Category Filter on Home
      if (selectedCategory) {
        setSelectedCategory(null);
        return true;
      }

      // 7. Reset Search Query on Home
      if (searchValue) {
        setSearchValue("");
        return true;
      }

      // 8. Default system exit/minimize when on root Home screen
      return false;
    };

    // BackHandler is only supported on native platforms (Android/iOS)
    if (Platform.OS === "web") {
      return;
    }

    const backSubscription = BackHandler.addEventListener(
      "hardwareBackPress",
      handleBackNavigation,
    );

    return () => {
      backSubscription.remove();
    };
  }, [
    isProductModalOpen,
    isAuthModalOpen,
    isHelpOpen,
    isListingOpen,
    activeNavigation,
    selectedCategory,
    searchValue,
  ]);

  // Web browser back button integration (popstate)
  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;

    const handleWebPop = () => {
      if (isProductModalOpen) {
        setIsProductModalOpen(false);
      } else if (isAuthModalOpen) {
        setIsAuthModalOpen(false);
      } else if (isHelpOpen) {
        setIsHelpOpen(false);
      } else if (isListingOpen) {
        setIsListingOpen(false);
      } else if (activeNavigation !== "Home") {
        setActiveNavigation("Home");
      } else if (selectedCategory) {
        setSelectedCategory(null);
      } else if (searchValue) {
        setSearchValue("");
      }
    };

    window.addEventListener("popstate", handleWebPop);
    return () => {
      window.removeEventListener("popstate", handleWebPop);
    };
  }, [
    isProductModalOpen,
    isAuthModalOpen,
    isHelpOpen,
    isListingOpen,
    activeNavigation,
    selectedCategory,
    searchValue,
  ]);

  // Sync browser history state on web for subviews/modals
  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    const isSubState =
      isProductModalOpen ||
      isAuthModalOpen ||
      isHelpOpen ||
      isListingOpen ||
      activeNavigation !== "Home" ||
      Boolean(selectedCategory);

    if (isSubState) {
      window.history.pushState({ freshgo: "subview" }, "");
    }
  }, [
    isProductModalOpen,
    isAuthModalOpen,
    isHelpOpen,
    isListingOpen,
    activeNavigation,
    selectedCategory,
  ]);

  // Cart Operations
  const handleAddToCart = (
    productId: string,
    quantity: number = 1,
  ) => {
    const matched = products.find((p) => p.id === productId || p.slug === productId);
    const key = matched ? matched.id : productId;

    // Check available stock
    const available = matched?.availableStockKg;
    if (available !== undefined && available <= 0) {
      dispatchOrderNotification({
        orderId: "STOCK",
        status: "cancelled",
        title: "Out of Stock",
        message: `${matched?.name || "Product"} is currently out of stock.`,
      });
      return;
    }

    const currentQty = cart[key] ?? 0;
    const nextQty = currentQty + quantity;

    if (available !== undefined && nextQty > available) {
      const allowedAdd = Math.max(0, Math.floor(available - currentQty));
      dispatchOrderNotification({
        orderId: "STOCK",
        status: "cancelled",
        title: "Stock Limit Reached",
        message:
          allowedAdd > 0
            ? `Only ${allowedAdd} more ${matched?.unit || "kg"} can be added (${available} max).`
            : `You have reached the maximum available stock (${available} ${matched?.unit || "kg"}).`,
      });
      if (allowedAdd <= 0) return;
      setCart((prev) => ({
        ...prev,
        [key]: currentQty + allowedAdd,
      }));
      return;
    }

    setCart((prev) => ({
      ...prev,
      [key]: nextQty,
    }));
  };

  const handleUpdateQuantity = (productId: string, quantity: number) => {
    setCart((prev) => {
      const next = { ...prev };
      const matched = products.find((p) => p.id === productId || p.slug === productId);
      if (quantity <= 0) {
        delete next[productId];
        if (matched?.slug) delete next[matched.slug];
        if (matched?.id) delete next[matched.id];
      } else {
        const available = matched?.availableStockKg;
        const cappedQty =
          available !== undefined
            ? Math.min(Math.floor(available), quantity)
            : quantity;
        delete next[productId];
        if (matched?.slug) delete next[matched.slug];
        const key = matched ? matched.id : productId;
        next[key] = cappedQty;
      }
      return next;
    });
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart((prev) => {
      const next = { ...prev };
      const matched = products.find((p) => p.id === productId || p.slug === productId);
      delete next[productId];
      if (matched?.slug) delete next[matched.slug];
      if (matched?.id) delete next[matched.id];
      return next;
    });
  };

  const toggleFavorite = (productId: string) => {
    const matched = products.find((p) => p.id === productId || p.slug === productId);
    const key = matched ? matched.id : productId;
    setFavorites((current) =>
      current.includes(key) || (matched?.slug && current.includes(matched.slug))
        ? current.filter((id) => id !== key && id !== matched?.slug)
        : [...current, key],
    );
  };

  // Product Modal Open
  const handleOpenProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsProductModalOpen(true);
  };

  // Navigate to Product Listing
  const handleNavigateToListing = (
    category?: string | null,
    search: string = "",
  ) => {
    setListingCategory(category ?? null);
    setListingSearch(search);
    setIsListingOpen(true);
  };

  // Checkout / Place Order
  const handlePlaceOrder = async (orderDetails: {
    items: { product: Product; quantity: number }[];
    total: number;
    paymentMethod: "cod" | "upi";
    address: string;
  }) => {
    // Validate order volume does not exceed available stock
    for (const item of orderDetails.items) {
      if (
        item.product.availableStockKg !== undefined &&
        item.quantity > item.product.availableStockKg
      ) {
        dispatchOrderNotification({
          orderId: "STOCK",
          status: "cancelled",
          title: "Order Volume Exceeded",
          message: `${item.product.name} exceeds available stock (${item.product.availableStockKg} ${item.product.unit || "kg"}). Please adjust cart.`,
        });
        return;
      }
    }
    // 1. Send live order to backend
    const res = await customerApi.createOrder(orderDetails);
    const orderId = res.orderId || `FF${Math.floor(10000 + Math.random() * 90000)}`;

    const newOrder: CustomerOrder = {
      id: orderId,
      date: "Just now",
      status: "placed",
      items: orderDetails.items,
      total: orderDetails.total,
      paymentMethod: orderDetails.paymentMethod,
      deliveryAddress: orderDetails.address,
      riderName: "Ramesh K.",
      riderPhone: "+91 91234 56789",
      estimatedArrival: "Arriving in 25 mins",
    };

    setOrders((prev) => [newOrder, ...prev]);
    setCart({}); // clear cart
    setActiveNavigation("Orders"); // navigate to orders screen

    // 2. Dispatch Order Placed Notification (In-App Snackbar if active, Mobile notification if backgrounded)
    await dispatchOrderNotification({
      orderId,
      status: "placed",
      title: "Order Placed Successfully! 🎉",
      message: `Order #${orderId} confirmed · Kozhikode Central Hub is preparing your fresh cuts.`,
    });

    // 3. Schedule realistic order status milestone updates
    // Milestone 1: Confirmed & Preparing (after 8s)
    setTimeout(async () => {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, status: "preparing", estimatedArrival: "Packing at Central Hub" }
            : o,
        ),
      );
      await dispatchOrderNotification({
        orderId,
        status: "preparing",
        title: "Order Being Packed 🥩",
        message: `Order #${orderId} is being cut, vacuum-sealed & packed in cold chain.`,
      });
    }, 8000);

    // Milestone 2: Out for Delivery (after 22s)
    setTimeout(async () => {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, status: "out_for_delivery", estimatedArrival: "Arriving in 14 mins" }
            : o,
        ),
      );
      await dispatchOrderNotification({
        orderId,
        status: "out_for_delivery",
        title: "Out for Delivery 🛵",
        message: `Rider Ramesh K. has picked up your cold-chain box! Arriving in ~14 mins.`,
      });
    }, 22000);

    // Milestone 3: Delivered (after 45s)
    setTimeout(async () => {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, status: "delivered", estimatedArrival: "Delivered at doorstep" }
            : o,
        ),
      );
      await dispatchOrderNotification({
        orderId,
        status: "delivered",
        title: "Order Delivered! 🐟",
        message: `Order #${orderId} delivered at ${orderDetails.address}. Freshness guaranteed!`,
      });
    }, 45000);

    // 4. Refresh live orders from backend
    try {
      const liveOrders = await customerApi.getMyOrders();
      if (liveOrders.length > 0) {
        setOrders(liveOrders);
      }
    } catch {
      // ignore
    }
  };

  // Reorder
  const handleReorder = (items: { product: Product; quantity: number }[]) => {
    const nextCart = { ...cart };
    for (const item of items) {
      nextCart[item.product.id] =
        (nextCart[item.product.id] ?? 0) + item.quantity;
    }
    setCart(nextCart);
    setActiveNavigation("Cart");
  };

  // Total items in cart for badge
  const totalCartCount = Object.values(cart).reduce(
    (sum, qty) => sum + qty,
    0,
  );

  // 1. Initial Launch / Splash State
  if (isInitializing) {
    return (
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <SplashScreen />
      </SafeAreaProvider>
    );
  }

  // 2. Standard Customer Error Page when backend is disconnected or unreachable
  if (connectionError && products.length === 0) {
    return (
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
          <BackendConnectionError
            errorMessage={connectionError}
            onRetry={syncWithBackend}
            onOpenHelp={() => setIsHelpOpen(true)}
          />
          {isHelpOpen && (
            <HelpSupportView onBack={() => setIsHelpOpen(false)} />
          )}
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <View style={styles.app}>
          {/* Active View Container */}
          <View style={styles.viewContainer}>
            {isListingOpen ? (
              <ProductListingView
                initialCategory={listingCategory}
                initialSearch={listingSearch}
                favorites={favorites}
                categories={categoriesList}
                products={products}
                onBack={() => setIsListingOpen(false)}
                onSelectProduct={handleOpenProduct}
                onAddProduct={(id) => handleAddToCart(id, 1)}
                onToggleFavorite={toggleFavorite}
              />
            ) : (
              <>
                {activeNavigation === "Home" && (
                  <HomeView
                    searchValue={searchValue}
                    selectedCategory={selectedCategory}
                    favorites={favorites}
                    categories={categoriesList}
                    products={products}
                    address={customerAddress}
                    onSearchChange={setSearchValue}
                    onSelectCategory={setSelectedCategory}
                    onAddProduct={(id) => handleAddToCart(id, 1)}
                    onToggleFavorite={toggleFavorite}
                    onSelectProduct={handleOpenProduct}
                    onNavigateToListing={handleNavigateToListing}
                    onPressProfile={() => setActiveNavigation("Profile")}
                  />
                )}

                {activeNavigation === "Cart" && (
                  <CartView
                    cart={cart}
                    products={products}
                    deliveryAddress={customerAddress}
                    onUpdateQuantity={handleUpdateQuantity}
                    onRemoveItem={handleRemoveFromCart}
                    onExploreProducts={() => {
                      setIsListingOpen(false);
                      setActiveNavigation("Home");
                    }}
                    onPlaceOrder={handlePlaceOrder}
                  />
                )}

                {activeNavigation === "Orders" && (
                  <OrdersView
                    orders={orders}
                    onReorder={handleReorder}
                    onExploreProducts={() => {
                      setIsListingOpen(false);
                      setActiveNavigation("Home");
                    }}
                  />
                )}

                {activeNavigation === "Profile" &&
                  (isHelpOpen ? (
                    <HelpSupportView onBack={() => setIsHelpOpen(false)} />
                  ) : (
                    <ProfileView
                      user={user}
                      onOpenAuth={() => setIsAuthModalOpen(true)}
                      onLogout={() =>
                        setUser({
                          name: "Guest",
                          phone: "",
                          isLoggedIn: false,
                        })
                      }
                      onNavigateToOrders={() => {
                        setIsListingOpen(false);
                        setActiveNavigation("Orders");
                      }}
                      onOpenHelp={() => setIsHelpOpen(true)}
                    />
                  ))}
              </>
            )}
          </View>

          {/* Bottom Navigation */}
          <BottomNavigation
            activeItem={activeNavigation}
            cartCount={totalCartCount}
            onSelect={(tab) => {
              setIsListingOpen(false);
              if (tab !== "Profile") setIsHelpOpen(false);
              setActiveNavigation(tab);
            }}
          />
        </View>

        {/* Product Detail Popup Modal */}
        <ProductDetailModal
          product={selectedProduct}
          products={products}
          visible={isProductModalOpen}
          isFavorite={
            selectedProduct
              ? favorites.includes(selectedProduct.id) ||
                Boolean(selectedProduct.slug && favorites.includes(selectedProduct.slug))
              : false
          }
          onClose={() => setIsProductModalOpen(false)}
          onAddToCart={handleAddToCart}
          onToggleFavorite={toggleFavorite}
          onSelectProduct={(item) => setSelectedProduct(item)}
        />

        {/* Auth (Login / Signup) Modal */}
        <AuthView
          visible={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onSuccess={(updatedUser) => setUser(updatedUser)}
        />

        {/* Global In-App Snackbar Notification */}
        <SnackbarNotification
          onNavigateToOrders={() => {
            setIsListingOpen(false);
            setActiveNavigation("Orders");
          }}
        />

        {/* Splash Screen with freshgologo.png and white bg */}
        <SplashScreen />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  app: {
    flex: 1,
  },
  viewContainer: {
    flex: 1,
  },
});
