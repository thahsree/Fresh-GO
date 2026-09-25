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
import { customerApi } from "./lib/api";
import {
  dispatchOrderNotification,
  requestNotificationPermission,
} from "./lib/notifications";
import {
  allProducts,
  categories as defaultCategories,
  freshProducts,
  type Category,
  type Product,
} from "./models/catalog";

const INITIAL_ORDERS: CustomerOrder[] = [
  {
    id: "FF10284",
    date: "Today, 1:45 PM",
    status: "out_for_delivery",
    items: [{ product: freshProducts[0], quantity: 1 }],
    total: 735,
    paymentMethod: "cod",
    deliveryAddress: "Palm Residency, Flat 402, 4th Cross Road",
    riderName: "Ramesh K.",
    riderPhone: "+91 91234 56789",
    estimatedArrival: "Arriving in 18 mins",
  },
  {
    id: "FF10280",
    date: "18 Sep 2026, 11:20 AM",
    status: "delivered",
    items: [
      { product: freshProducts[1], quantity: 1 },
      { product: freshProducts[2], quantity: 2 },
    ],
    total: 1320,
    paymentMethod: "upi",
    deliveryAddress: "Palm Residency, Flat 402, 4th Cross Road",
  },
];

export default function App() {
  // Navigation: "Home" | "Cart" | "Orders" | "Profile"
  const [activeNavigation, setActiveNavigation] = useState("Home");

  // Dynamic Catalog & Categories State
  const [products, setProducts] = useState<Product[]>(allProducts);
  const [categoriesList, setCategoriesList] = useState<Category[]>(defaultCategories);

  // Cart State: { [productId]: quantity }
  const [cart, setCart] = useState<{ [productId: string]: number }>({
    "seer-fish": 1,
  });

  // Favorites
  const [favorites, setFavorites] = useState<string[]>([
    "seer-fish",
    "tiger-prawns",
    "frozen-tenderloin-beef",
  ]);

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

  const [user, setUser] = useState<UserProfile>({
    name: "Thashreef R.",
    phone: "+91 98765 43210",
    isLoggedIn: true,
  });

  // Orders State
  const [orders, setOrders] = useState<CustomerOrder[]>(INITIAL_ORDERS);

  // Address State
  const [customerAddress, setCustomerAddress] = useState(
    "Palm Residency, Flat 4B, 4th Cross Road",
  );

  // --------------------------------------------------------------------------
  // Backend Integration & Synchronization
  // --------------------------------------------------------------------------
  useEffect(() => {
    let isMounted = true;

    async function syncWithBackend() {
      try {
        // 1. Auto-authenticate with backend customer account
        const authUser = await customerApi.ensureCustomerAuth();
        if (authUser && isMounted) {
          setUser(authUser);
        }

        // 2. Fetch categories directly from backend database
        const liveCats = await customerApi.getCategories();
        if (liveCats && liveCats.length > 0 && isMounted) {
          setCategoriesList(liveCats);
        }

        // 3. Fetch live products directly from backend database
        const liveProducts = await customerApi.getProducts();
        if (liveProducts && liveProducts.length > 0 && isMounted) {
          setProducts(liveProducts);
        }

        // 4. Fetch live customer orders from backend database
        const liveOrders = await customerApi.getMyOrders();
        if (liveOrders && liveOrders.length > 0 && isMounted) {
          setOrders(liveOrders);
        }

        // 5. Fetch customer address from backend database
        const liveAddrs = await customerApi.getAddresses();
        if (liveAddrs && liveAddrs.length > 0 && isMounted) {
          const defaultAddr = liveAddrs.find((a) => a.isDefault) || liveAddrs[0];
          const formatted = `${defaultAddr.street}, ${defaultAddr.area || defaultAddr.city}`;
          setCustomerAddress(formatted);
        }
      } catch (err) {
        console.warn("Backend synchronization notice (running in offline mode):", err);
      }
    }

    requestNotificationPermission().catch(() => {});
    syncWithBackend();

    return () => {
      isMounted = false;
    };
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
