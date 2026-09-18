import { colors, type OrderStatus } from "@fresh-food/design-tokens";
import { useState } from "react";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";
import { BottomNavigation } from "./components/BottomNavigation";
import { HomeView } from "./components/HomeView";
import { freshProducts } from "./models/catalog";

export default function App() {
  const [cart, setCart] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeNavigation, setActiveNavigation] = useState("Home");
  const [status, setStatus] = useState<OrderStatus>("pending");
  const add = (productId: string) =>
    setCart((current) => [...current, productId]);
  const toggleFavorite = (productId: string) =>
    setFavorites((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId],
    );
  const total = cart.reduce(
    (sum, productId) =>
      sum +
      (freshProducts.find((product) => product.id === productId)?.price ?? 0),
    0,
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.app}>
        {activeNavigation === "Home" ? (
          <HomeView
            searchValue={searchValue}
            selectedCategory={selectedCategory}
            favorites={favorites}
            onSearchChange={setSearchValue}
            onSelectCategory={setSelectedCategory}
            onAddProduct={add}
            onToggleFavorite={toggleFavorite}
          />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderTitle}>{activeNavigation}</Text>
            <Text style={styles.placeholderCopy}>
              Your {activeNavigation.toLowerCase()} view is ready for the next
              shopping flow.
            </Text>
            {activeNavigation === "Cart" && (
              <Text style={styles.cartTotal}>
                Rs {total.toLocaleString()} · {cart.length} items
              </Text>
            )}
            {activeNavigation === "Orders" && (
              <Text style={styles.cartTotal}>
                {status === "pending"
                  ? "No active order yet"
                  : "Order preparing"}
              </Text>
            )}
          </View>
        )}
        <BottomNavigation
          activeItem={activeNavigation}
          onSelect={setActiveNavigation}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  app: { flex: 1 },
  placeholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 36,
  },
  placeholderTitle: {
    color: colors.primaryDark,
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 8,
  },
  placeholderCopy: {
    color: colors.textMuted,
    textAlign: "center",
    fontSize: 13,
    lineHeight: 20,
  },
  cartTotal: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "800",
    marginTop: 18,
  },
});
