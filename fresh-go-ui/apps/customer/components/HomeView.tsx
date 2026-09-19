import { colors } from "@fresh-food/design-tokens";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  bestSellers,
  categories,
  freshProducts,
  needs,
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
};

export function HomeView({
  searchValue,
  selectedCategory,
  favorites,
  onSearchChange,
  onSelectCategory,
  onAddProduct,
  onToggleFavorite,
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
          onPress={() => onSelectCategory("Fish")}
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
      <SectionHeader title="Fresh today" action="See all" />
      <ProductRail
        products={visibleFreshProducts}
        favorites={favorites}
        onAddProduct={onAddProduct}
        onToggleFavorite={onToggleFavorite}
      />
      <SectionHeader title="Best sellers" action="See all" />
      <ProductRail
        products={visibleBestSellers}
        favorites={favorites}
        onAddProduct={onAddProduct}
        onToggleFavorite={onToggleFavorite}
      />
      <SectionHeader title="Today's offers" action="See all" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rail}
      >
        <OfferCard
          name="Pomfret · 500 g pack"
          was="Rs 460"
          now="Rs 368"
          saving="You save Rs 92"
        />
        <OfferCard
          name="Family Meat Pack"
          was="Rs 1,240"
          now="Rs 999"
          saving="You save Rs 241"
        />
      </ScrollView>
      <SectionHeader title="Shop by need" />
      <View style={styles.needGrid}>
        {needs.map((need) => (
          <View key={need} style={styles.needItem}>
            <Text style={styles.needText}>{need}</Text>
          </View>
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
}: Pick<HomeViewProps, "favorites" | "onAddProduct" | "onToggleFavorite"> & {
  products: typeof freshProducts;
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
        />
      ))}
      {products.length === 0 && (
        <Text style={styles.empty}>No products found. Try another search.</Text>
      )}
    </ScrollView>
  );
}

function OfferCard({
  name,
  was,
  now,
  saving,
}: {
  name: string;
  was: string;
  now: string;
  saving: string;
}) {
  return (
    <View style={styles.offerCard}>
      <View style={styles.offerImage} />
      <View style={styles.offerBody}>
        <Text style={styles.offerName}>{name}</Text>
        <View style={styles.offerPrices}>
          <Text style={styles.was}>{was}</Text>
          <Text style={styles.now}>{now}</Text>
        </View>
        <Text style={styles.saving}>{saving}</Text>
      </View>
    </View>
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
    width: 200,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: "row",
    gap: 10,
  },
  offerImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: colors.accentTint,
  },
  offerBody: { flex: 1 },
  offerName: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 3,
  },
  offerPrices: { flexDirection: "row", alignItems: "baseline", gap: 6 },
  was: {
    color: colors.textSoft,
    fontSize: 11,
    textDecorationLine: "line-through",
  },
  now: { color: colors.accent, fontSize: 13, fontWeight: "800" },
  saving: {
    color: colors.success,
    fontSize: 9.5,
    fontWeight: "700",
    marginTop: 3,
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
