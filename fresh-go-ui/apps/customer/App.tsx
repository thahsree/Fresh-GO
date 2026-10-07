import { colors } from "@fresh-food/design-tokens";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { BackHandler, LogBox, Platform, StyleSheet, View } from "react-native";
import {
  SafeAreaProvider,
  SafeAreaView,
} from "react-native-safe-area-context";

// Suppress known React Native Web deprecation notices (React Native Web internally converts shadow* to boxShadow)
LogBox.ignoreLogs([
  '"shadow*" style props are deprecated. Use "boxShadow".',
  "props.pointerEvents is deprecated. Use style.pointerEvents",
]);

if (Platform.OS === "web" && typeof window !== "undefined") {
  const origWarn = console.warn;
  console.warn = (...args: any[]) => {
    const msg = args[0];
    if (
      typeof msg === "string" &&
      (msg.includes('"shadow*" style props are deprecated') ||
        msg.includes("props.pointerEvents is deprecated"))
    ) {
      return;
    }
    origWarn.apply(console, args);
  };
}
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
import { ComingSoonView } from "./components/ComingSoonView";
import { CustomerLocationModal } from "./components/CustomerLocationModal";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { customerApi, ServiceabilityResult, BackendHub, BackendAddress } from "./lib/api";
import {
  acquireAccurateLocation,
  reverseGeocodeLocation,
  getStoredLocation,
  saveStoredLocation,
} from "./lib/location";
import {
  dispatchOrderNotification,
  requestNotificationPermission,
  registerPushTokenWithBackend,
} from "./lib/notifications";
import { type Category, type Product, categories as defaultCategories } from "./models/catalog";

export default function App() {
  // Navigation: "Home" | "Cart" | "Orders" | "Profile"
  const [activeNavigation, setActiveNavigation] = useState("Home");

  // Dynamic Catalog & Categories State (Initialized with standard categories, updated from backend)
  const [products, setProducts] = useState<Product[]>([]);
  const [categoriesList, setCategoriesList] = useState<Category[]>(defaultCategories);
  const [hubs, setHubs] = useState<BackendHub[]>([]);

  // Cart State: { [productId]: quantity }
  const [cart, setCart] = useState<{ [productId: string]: number }>({});
  const [cartCuts, setCartCuts] = useState<{ [productId: string]: string }>({});

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
  const [listingNeed, setListingNeed] = useState<string | null>(null);
  const [listingSectionId, setListingSectionId] = useState<string | null>(null);
  const [listingSectionTitle, setListingSectionTitle] = useState<string | null>(null);

  // Customer Profile
  const [user, setUser] = useState<UserProfile>({
    name: "Guest",
    phone: "",
    isLoggedIn: false,
  });

  // Orders State
  const [orders, setOrders] = useState<CustomerOrder[]>([]);

  // Address & Geo-Fencing (10km Radius rule)
  const storedLoc = getStoredLocation();
  const [customerAddress, setCustomerAddress] = useState(storedLoc?.address || "");
  const [customerCoords, setCustomerCoords] = useState<{ lat: number; lng: number }>({
    lat: storedLoc?.lat || 11.2588,
    lng: storedLoc?.lng || 75.7804,
  });
  const [customerPincode, setCustomerPincode] = useState<string>("");
  const [serviceability, setServiceability] = useState<ServiceabilityResult | null>(null);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  const checkLocationServiceability = async (lat: number, lng: number) => {
    const safeLat = Number.isFinite(lat) ? Number(lat.toFixed(6)) : 11.2588;
    const safeLng = Number.isFinite(lng) ? Number(lng.toFixed(6)) : 75.7804;
    try {
      const res = await customerApi.checkServiceability(safeLat, safeLng);
      setServiceability(res);
      return res;
    } catch (err) {
      console.warn("Serviceability check error:", err);
      return null;
    }
  };

  const handleToggleLocationDemo = () => {
    if (customerCoords.lat === 11.2588) {
      const outOfZone = { lat: 11.8745, lng: 75.3704 };
      setCustomerCoords(outOfZone);
      setCustomerAddress("Kannur City");
      checkLocationServiceability(outOfZone.lat, outOfZone.lng);
    } else {
      const inZone = { lat: 11.2588, lng: 75.7804 };
      setCustomerCoords(inZone);
      setCustomerAddress("Mavoor Road, Kozhikode");
      checkLocationServiceability(inZone.lat, inZone.lng);
    }
  };

  // Backend Connection & Lifecycle
  const [isInitializing, setIsInitializing] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // --------------------------------------------------------------------------
  // Backend Integration & Synchronization
  // --------------------------------------------------------------------------
  const syncWithBackend = async () => {
    try {
      setConnectionError(null);

      // 1. Fetch live categories, products, & hubs from backend
      const [liveCats, liveProducts, liveHubs] = await Promise.all([
        customerApi.getCategories(),
        customerApi.getProducts(),
        customerApi.getHubs(),
      ]);

      setProducts(liveProducts || []);
      setCategoriesList(liveCats || []);
      if (liveHubs && liveHubs.length > 0) {
        setHubs(liveHubs);
      }
      setConnectionError(null);

      // 2. Proactively get real device location first before checking serviceability
      let activeCoords = { lat: customerCoords.lat, lng: customerCoords.lng };
      try {
        const detected = await acquireAccurateLocation({ forcePrompt: false });
        if (detected && Number.isFinite(detected.lat) && Number.isFinite(detected.lng)) {
          activeCoords = { lat: detected.lat, lng: detected.lng };
          setCustomerCoords(activeCoords);

          const geo = await reverseGeocodeLocation(detected.lat, detected.lng);
          const resolvedAddress = geo.address || `${geo.area}, ${geo.city}`;
          setCustomerAddress(resolvedAddress);
          saveStoredLocation(detected, resolvedAddress);
        }
      } catch (locErr) {
        console.warn("Initial location detection error:", locErr);
      }

      // Check serviceability for the real detected coordinates
      await checkLocationServiceability(activeCoords.lat, activeCoords.lng);

      // 3. Restore customer session if previously authenticated (non-blocking)
      try {
        const authUser = await customerApi.restoreSession();
        if (authUser) {
          setUser(authUser);
          const liveOrders = await customerApi.getMyOrders();
          if (liveOrders) setOrders(liveOrders);
          await customerApi.getAddresses();
        } else {
          setUser({
            name: "Guest",
            phone: "",
            isLoggedIn: false,
          });
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

  // Real-time synchronization of customer orders from backend (No bluff timers)
  useEffect(() => {
    if (!user.isLoggedIn) return;

    let isMounted = true;
    const pollOrders = async () => {
      try {
        const liveOrders = await customerApi.getMyOrders();
        if (isMounted && Array.isArray(liveOrders)) {
          setOrders((prev) => {
            // Dispatch notification only on REAL backend status transitions
            liveOrders.forEach((newOrd) => {
              const prevOrd = prev.find((p) => p.id === newOrd.id);
              if (prevOrd && prevOrd.status !== newOrd.status) {
                if (newOrd.status === "preparing") {
                  dispatchOrderNotification({
                    orderId: newOrd.id,
                    status: "preparing",
                    title: "Order Being Prepared 🥩",
                    message: `Order #${newOrd.id} is being cut, vacuum-sealed and packed at the hub.`,
                  });
                } else if (newOrd.status === "out_for_delivery") {
                  dispatchOrderNotification({
                    orderId: newOrd.id,
                    status: "out_for_delivery",
                    title: "Out for Delivery 🛵",
                    message: `${newOrd.riderName || "Delivery Partner"} is on the way to your doorstep!`,
                  });
                } else if (newOrd.status === "delivered") {
                  dispatchOrderNotification({
                    orderId: newOrd.id,
                    status: "delivered",
                    title: "Order Delivered! 🐟",
                    message: `Order #${newOrd.id} delivered at your address. Freshness guaranteed!`,
                  });
                }
              }
            });
            return liveOrders;
          });
        }
      } catch {
        // quiet background poll error
      }
    };

    pollOrders();
    const pollInterval = setInterval(pollOrders, 5000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [user.isLoggedIn]);

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
    selectedCut?: string,
  ) => {
    const matched = products.find((p) => p.id === productId || p.slug === productId);
    const key = matched ? matched.id : productId;

    if (selectedCut) {
      setCartCuts((prev) => ({ ...prev, [key]: selectedCut }));
    }

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
        setCartCuts((cuts) => {
          const nextCuts = { ...cuts };
          delete nextCuts[productId];
          if (matched?.slug) delete nextCuts[matched.slug];
          if (matched?.id) delete nextCuts[matched.id];
          return nextCuts;
        });
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
    setCartCuts((cuts) => {
      const nextCuts = { ...cuts };
      const matched = products.find((p) => p.id === productId || p.slug === productId);
      delete nextCuts[productId];
      if (matched?.slug) delete nextCuts[matched.slug];
      if (matched?.id) delete nextCuts[matched.id];
      return nextCuts;
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
    need?: string | null,
    sectionId?: string | null,
    sectionTitle?: string | null,
  ) => {
    setListingCategory(category ?? null);
    setListingSearch(search);
    setListingNeed(need ?? null);
    setListingSectionId(sectionId ?? null);
    setListingSectionTitle(sectionTitle ?? null);
    setIsListingOpen(true);
  };

  // Checkout / Place Order
  const handlePlaceOrder = async (orderDetails: {
    items: { product: Product; quantity: number; selectedCut?: string }[];
    total: number;
    paymentMethod: "cod" | "upi";
    address: string;
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
    // Require login before placing order
    if (!user.isLoggedIn) {
      setIsAuthModalOpen(true);
      return;
    }

    // 1. Send live order to backend with hubId and cut preparations
    const targetHubId = serviceability?.hub?.id || (orderDetails as any).hubId;

    const res = await customerApi.createOrder({
      ...orderDetails,
      hubId: targetHubId,
    });
    if (!res.success) {
      dispatchOrderNotification({
        orderId: "ORDER_FAILED",
        status: "cancelled",
        title: "Could Not Place Order",
        message: res.error || "Failed to create order on server. Please try again.",
      });
      return;
    }
    const orderId = res.orderId || `FF${Math.floor(10000 + Math.random() * 90000)}`;

    const newOrder: CustomerOrder = {
      id: orderId,
      date: "Just now",
      status: "placed",
      items: orderDetails.items,
      total: orderDetails.total,
      paymentMethod: orderDetails.paymentMethod,
      deliveryAddress: orderDetails.address,
      riderName: "Express Logistics",
      riderPhone: "+91 91234 56789",
      estimatedArrival: "Order placed · Hub preparing fresh cuts",
    };

    setOrders((prev) => [newOrder, ...prev]);
    setCart({}); // clear cart
    setCartCuts({}); // clear cut preparations
    setActiveNavigation("Orders"); // navigate to orders screen

    // 2. Dispatch Order Placed Notification
    const hubName = serviceability?.hub?.name || "Express Hub";
    await dispatchOrderNotification({
      orderId,
      status: "placed",
      title: "Order Placed Successfully! 🎉",
      message: `Order #${orderId} confirmed · ${hubName} will prepare your fresh cuts.`,
    });

    // 3. Immediately refresh live orders from backend (Real updates only, no bluff timers)
    try {
      const liveOrders = await customerApi.getMyOrders();
      if (liveOrders && liveOrders.length > 0) {
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
            <ErrorBoundary onReset={() => setActiveNavigation("Home")}>
              {isListingOpen ? (
              <ProductListingView
                initialCategory={listingCategory}
                initialSearch={listingSearch}
                initialNeed={listingNeed}
                initialSectionId={listingSectionId}
                initialSectionTitle={listingSectionTitle}
                favorites={favorites}
                categories={categoriesList}
                products={products}
                onBack={() => {
                  setIsListingOpen(false);
                  setListingNeed(null);
                  setListingSectionId(null);
                  setListingSectionTitle(null);
                }}
                onSelectProduct={handleOpenProduct}
                onAddProduct={(id) => handleAddToCart(id, 1)}
                onToggleFavorite={toggleFavorite}
              />
            ) : (
              <>
                {activeNavigation === "Home" &&
                  (serviceability && !serviceability.serviceable ? (
                    <ComingSoonView
                      serviceability={serviceability}
                      customerCoordinates={customerCoords}
                      onSwitchToDemoLocation={() => {
                        const inZone = { lat: 11.2588, lng: 75.7804 };
                        setCustomerCoords(inZone);
                        setCustomerAddress("Mavoor Road, Kozhikode");
                        checkLocationServiceability(inZone.lat, inZone.lng);
                      }}
                      onRefreshLocation={() => {
                        checkLocationServiceability(
                          customerCoords.lat,
                          customerCoords.lng
                        );
                      }}
                      onOpenLocationPicker={() => setIsLocationModalOpen(true)}
                    />
                  ) : (
                    <HomeView
                      searchValue={searchValue}
                      selectedCategory={selectedCategory}
                      favorites={favorites}
                      categories={categoriesList}
                      products={products}
                      address={
                        customerAddress
                          ? serviceability?.hub?.name
                            ? `${customerAddress} (${serviceability.hub.name.split("(")[0].trim()})`
                            : customerAddress
                          : ""
                      }
                      onSearchChange={setSearchValue}
                      onSelectCategory={setSelectedCategory}
                      onAddProduct={(id) => handleAddToCart(id, 1)}
                      onToggleFavorite={toggleFavorite}
                      onSelectProduct={handleOpenProduct}
                      onNavigateToListing={handleNavigateToListing}
                      onPressProfile={() => setActiveNavigation("Profile")}
                      onPressLocation={() => setIsLocationModalOpen(true)}
                    />
                  ))}

                {activeNavigation === "Cart" && (
                  <CartView
                    cart={cart}
                    cartCuts={cartCuts}
                    products={products}
                    deliveryLocation={customerAddress}
                    deliveryCoords={customerCoords}
                    deliveryPincode={customerPincode}
                    onOpenLocationPicker={() => setIsLocationModalOpen(true)}
                    isLoggedIn={user.isLoggedIn}
                    onOpenAuth={() => setIsAuthModalOpen(true)}
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
                    onDeleteOrder={async (orderId) => {
                      setOrders((prev) => prev.filter((o) => o.id !== orderId));
                      await customerApi.deleteOrder(orderId);
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
                      onLogout={() => {
                        customerApi.clearSession();
                        setUser({
                          name: "Guest",
                          phone: "",
                          isLoggedIn: false,
                        });
                        setOrders([]);
                      }}
                      onNavigateToOrders={() => {
                        setIsListingOpen(false);
                        setActiveNavigation("Orders");
                      }}
                      onOpenHelp={() => setIsHelpOpen(true)}
                      currentAddress={customerAddress}
                      currentCoords={customerCoords}
                      currentPincode={customerPincode}
                      onSelectDeliveryAddress={(addr) => {
                        setCustomerAddress(`${addr.street}, ${addr.area}`);
                        if (addr.latitude && addr.longitude) {
                          setCustomerCoords({ lat: addr.latitude, lng: addr.longitude });
                          checkLocationServiceability(addr.latitude, addr.longitude);
                        }
                      }}
                    />
                  ))}
              </>
            )}
            </ErrorBoundary>
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
          onSuccess={async (updatedUser) => {
            setUser(updatedUser);
            setIsAuthModalOpen(false);
            try {
              const liveOrders = await customerApi.getMyOrders();
              if (liveOrders) setOrders(liveOrders);
              await customerApi.getAddresses();
            } catch {}
          }}
        />

        {/* Interactive Location Picker Modal (GPS & Interactive Map) */}
        <CustomerLocationModal
          visible={isLocationModalOpen}
          onClose={() => setIsLocationModalOpen(false)}
          currentAddress={customerAddress}
          currentCoords={customerCoords}
          nearestHubName={serviceability?.nearestHub?.name || serviceability?.hub?.name}
          nearestHubCoords={
            serviceability?.hub?.latitude && serviceability?.hub?.longitude
              ? { lat: serviceability.hub.latitude, lng: serviceability.hub.longitude }
              : serviceability?.nearestHub?.latitude && serviceability?.nearestHub?.longitude
              ? { lat: serviceability.nearestHub.latitude, lng: serviceability.nearestHub.longitude }
              : undefined
          }
          hubs={hubs}
          onLocationConfirm={(coords, address, pincode) => {
            setCustomerCoords(coords);
            setCustomerAddress(address);
            if (pincode) setCustomerPincode(pincode);
            checkLocationServiceability(coords.lat, coords.lng);
          }}
        />

        {/* Global In-App Snackbar Notification */}
        <SnackbarNotification
          onNavigateToOrders={() => {
            setIsListingOpen(false);
            setActiveNavigation("Orders");
          }}
        />

        {/* Splash Screen with FreshGologonew.png and white bg */}
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
