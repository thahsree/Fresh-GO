import { colors } from "@fresh-food/design-tokens";
import { Plus } from "lucide-react-native";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  bestSellers,
  categories,
  freshProducts,
  needs,
  offerProducts,
  type Product,
} from "../models/catalog";
import { CategoryRail } from "./CategoryRail";
import { CustomerHeader } from "./CustomerHeader";
import { ProductCard } from "./ProductCard";
import { SectionHeader } from "./SectionHeader";

type HomeViewProps = {
  searchValue: string;
  selectedCategory: string | null;
  favorites: string[];
  onSearchChange: (value: string) => void;
  onSelectCategory: (category: string) => void;
  onAddProduct: (productId: string) => void;
  onToggleFavorite: (productId: string) => void;
  onSelectProduct: (product: Product) => void;
  onNavigateToListing: (category?: string | null, search?: string) => void;
};

export function HomeView({
  searchValue,
  selectedCategory,
  favorites,
  onSearchChange,
  onSelectCategory,
  onAddProduct,
  onToggleFavorite,
  onSelectProduct,
  onNavigateToListing,
}: HomeViewProps) {
  const matchesSearch = (name: string) =>
    name.toLowerCase().includes(searchValue.toLowerCase());
  const matchesCategory = (category: string) =>
    !selectedCategory ||
    selectedCategory === "Offers" ||
    category === selectedCategory;

  const visibleFreshProducts = freshProducts.filter(
    (product) =>
      matchesSearch(product.name) && matchesCategory(product.category),
  );
  const visibleBestSellers = bestSellers.filter(
    (product) =>
      matchesSearch(product.name) && matchesCategory(product.category),
  );
  const visibleOfferProducts = offerProducts.filter(
    (product) =>
      matchesSearch(product.name) && matchesCategory(product.category),
  );

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <CustomerHeader
        searchValue={searchValue}
        onSearchChange={onSearchChange}
      />
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Fresh Catch.{"\n"}Every Day.</Text>
        <Text style={styles.heroCopy}>
          Line-caught this morning, cleaned your way.
        </Text>
        <Pressable
          style={styles.shopButton}
          onPress={() => onNavigateToListing("Fish")}
          accessibilityRole="button"
        >
          <Text style={styles.shopButtonText}>Shop now</Text>
        </Pressable>
      </View>
      <CategoryRail
        categories={categories}
        selectedCategory={selectedCategory}
        onSelect={onSelectCategory}
      />
      <SectionHeader
        title="Fresh today"
        action="See all"
        onAction={() => onNavigateToListing(selectedCategory)}
      />
      <ProductRail
        products={visibleFreshProducts}
        favorites={favorites}
        onAddProduct={onAddProduct}
        onToggleFavorite={onToggleFavorite}
        onSelectProduct={onSelectProduct}
      />
      <SectionHeader
        title="Best sellers"
        action="See all"
        onAction={() => onNavigateToListing(selectedCategory)}
      />
      <ProductRail
        products={visibleBestSellers}
        favorites={favorites}
        onAddProduct={onAddProduct}
        onToggleFavorite={onToggleFavorite}
        onSelectProduct={onSelectProduct}
      />
      <SectionHeader
        title="Today's offers"
        action="See all"
        onAction={() => onNavigateToListing("Offers")}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rail}
      >
        {visibleOfferProducts.map((product) => (
          <OfferCard
            key={product.id}
            product={product}
            onSelect={() => onSelectProduct(product)}
            onAdd={() => onAddProduct(product.id)}
          />
        ))}
      </ScrollView>
      <SectionHeader
        title="Shop by need"
        action="Explore all"
        onAction={() => onNavigateToListing(null)}
      />
      <View style={styles.needGrid}>
        {needs.map((need) => (
          <Pressable
            key={need}
            style={styles.needItem}
            onPress={() => onNavigateToListing(null, need)}
            accessibilityRole="button"
          >
            <Text style={styles.needText}>{need}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

function ProductRail({
  products,
  favorites,
  onAddProduct,
  onToggleFavorite,
  onSelectProduct,
}: Pick<HomeViewProps, "favorites" | "onAddProduct" | "onToggleFavorite" | "onSelectProduct"> & {
  products: Product[];
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.rail}
    >
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          isFavorite={favorites.includes(product.id)}
          onAdd={() => onAddProduct(product.id)}
          onToggleFavorite={() => onToggleFavorite(product.id)}
          onPress={() => onSelectProduct(product)}
        />
      ))}
      {products.length === 0 && (
        <Text style={styles.empty}>No products found. Try another search.</Text>
      )}
    </ScrollView>
  );
}

function OfferCard({
  product,
  onSelect,
  onAdd,
}: {
  product: Product;
  onSelect: () => void;
  onAdd: () => void;
}) {
  const originalPrice = Math.round(product.price * 1.25);
  const saving = originalPrice - product.price;

  return (
    <Pressable
      style={styles.offerCard}
      onPress={onSelect}
      accessibilityRole="button"
    >
      <Image
        source={{ uri: product.image }}
        style={styles.offerImage}
        resizeMode="cover"
      />
      <View style={styles.offerBody}>
        <Text style={styles.offerName} numberOfLines={1}>
          {product.name}
        </Text>
        <Text style={styles.offerDetail} numberOfLines={1}>
          {product.detail}
        </Text>
        <View style={styles.offerPrices}>
          <Text style={styles.was}>Rs {originalPrice}</Text>
          <Text style={styles.now}>Rs {product.price}</Text>
        </View>
        <View style={styles.offerFooter}>
          <Text style={styles.saving}>Save Rs {saving}</Text>
          <Pressable
            style={styles.offerAddButton}
            onPress={(e) => {
              e.stopPropagation();
              onAdd();
            }}
            accessibilityRole="button"
          >
            <Plus size={14} color="#FFFFFF" strokeWidth={3} />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 8 },
  hero: {
    marginHorizontal: 18,
    marginBottom: 18,
    padding: 22,
    borderRadius: 22,
    backgroundColor: colors.primary,
    overflow: "hidden",
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 21,
    lineHeight: 25,
    fontWeight: "800",
  },
  heroCopy: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12.5,
    marginTop: 4,
    marginBottom: 14,
  },
  shopButton: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: colors.accent,
  },
  shopButtonText: { color: "#FFFFFF", fontSize: 12.5, fontWeight: "800" },
  rail: { gap: 12, paddingHorizontal: 18, paddingBottom: 6 },
  offerCard: {
    width: 240,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  offerImage: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: colors.primaryTint,
  },
  offerBody: { flex: 1 },
  offerName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 2,
  },
  offerDetail: {
    color: colors.textSoft,
    fontSize: 10.5,
    marginBottom: 4,
  },
  offerPrices: { flexDirection: "row", alignItems: "baseline", gap: 6 },
  was: {
    color: colors.textSoft,
    fontSize: 11,
    textDecorationLine: "line-through",
  },
  now: { color: colors.accent, fontSize: 14, fontWeight: "800" },
  offerFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  saving: {
    color: colors.success,
    fontSize: 10,
    fontWeight: "700",
  },
  offerAddButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  needGrid: {
    paddingHorizontal: 18,
    paddingBottom: 24,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  needItem: {
    width: "47%",
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.surfaceAlt,
  },
  needText: { color: colors.primaryDark, fontSize: 12, fontWeight: "700" },
  empty: { color: colors.textMuted, fontSize: 12, paddingVertical: 24 },
});
