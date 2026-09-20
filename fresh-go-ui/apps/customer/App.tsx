import { colors } from "@fresh-food/design-tokens";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
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
import {
  allProducts,
  freshProducts,
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

  // Cart State: { [productId]: quantity }
  const [cart, setCart] = useState<{ [productId: string]: number }>({
    "seer-fish": 1,
  });

  // Favorites
  const [favorites, setFavorites] = useState<string[]>([
    "seer-fish",
    "tiger-prawns",
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
    email: "thashreef@freshgo.in",
    isLoggedIn: true,
  });

  // Orders State
  const [orders, setOrders] = useState<CustomerOrder[]>(INITIAL_ORDERS);

  // Cart Operations
  const handleAddToCart = (
    productId: string,
    quantity: number = 1,
  ) => {
    setCart((prev) => ({
      ...prev,
      [productId]: (prev[productId] ?? 0) + quantity,
    }));
  };

  const handleUpdateQuantity = (productId: string, quantity: number) => {
    setCart((prev) => {
      const next = { ...prev };
      if (quantity <= 0) {
        delete next[productId];
      } else {
        next[productId] = quantity;
      }
      return next;
    });
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  };

  const toggleFavorite = (productId: string) => {
    setFavorites((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId],
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
  const handlePlaceOrder = (orderDetails: {
    items: { product: Product; quantity: number }[];
    total: number;
    paymentMethod: "cod" | "upi";
    address: string;
  }) => {
    const newOrder: CustomerOrder = {
      id: `FF${Math.floor(10000 + Math.random() * 90000)}`,
      date: "Just now",
      status: "placed",
      items: orderDetails.items,
      total: orderDetails.total,
      paymentMethod: orderDetails.paymentMethod,
      deliveryAddress: orderDetails.address,
      riderName: "Suresh M.",
      riderPhone: "+91 98877 66554",
      estimatedArrival: "Arriving in 25 mins",
    };

    setOrders((prev) => [newOrder, ...prev]);
    setCart({}); // clear cart
    setActiveNavigation("Orders"); // navigate to orders screen
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
                    onSearchChange={setSearchValue}
                    onSelectCategory={setSelectedCategory}
                    onAddProduct={(id) => handleAddToCart(id, 1)}
                    onToggleFavorite={toggleFavorite}
                    onSelectProduct={handleOpenProduct}
                    onNavigateToListing={handleNavigateToListing}
                  />
                )}

                {activeNavigation === "Cart" && (
                  <CartView
                    cart={cart}
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
                          email: "",
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
          visible={isProductModalOpen}
          isFavorite={
            selectedProduct ? favorites.includes(selectedProduct.id) : false
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
