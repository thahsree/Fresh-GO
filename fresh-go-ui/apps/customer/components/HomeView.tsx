import { colors } from "@fresh-food/design-tokens";
import { Plus } from "lucide-react-native";
import React, { useEffect, useRef } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  allProducts as defaultAllProducts,
  categories as defaultCategories,
  needs,
  type Category,
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
  categories?: Category[];
  products?: Product[];
  address?: string;
  onSearchChange: (value: string) => void;
  onSelectCategory: (category: string) => void;
  onAddProduct: (productId: string) => void;
  onToggleFavorite: (productId: string) => void;
  onSelectProduct: (product: Product) => void;
  onNavigateToListing: (category?: string | null, search?: string) => void;
  onPressProfile?: () => void;
};

export function HomeView({
  searchValue,
  selectedCategory,
  favorites,
  categories = defaultCategories,
  products = defaultAllProducts,
  address,
  onSearchChange,
  onSelectCategory,
  onAddProduct,
  onToggleFavorite,
  onSelectProduct,
  onNavigateToListing,
  onPressProfile,
}: HomeViewProps) {
  const matchesSearch = (name: string) =>
    name.toLowerCase().includes(searchValue.toLowerCase());
  const matchesCategory = (category: string) =>
    !selectedCategory ||
    selectedCategory === "Offers" ||
    category.toLowerCase() === selectedCategory.toLowerCase();

  const isProductFrozen = (product: Product) =>
    Boolean(product.isFlashFrozen) ||
    (!product.isDailyCatch && (
      product.category.toLowerCase() === "frozen" ||
      Boolean(product.slug?.toLowerCase().includes("frozen")) ||
      product.name.toLowerCase().includes("frozen")
    ));

  // Main Category / Fresh items
  const visibleCategoryProducts = products.filter((product) => {
    if (!matchesSearch(product.name)) return false;

    if (selectedCategory) {
      if (selectedCategory.toLowerCase() === "frozen") {
        return isProductFrozen(product);
      }
      return (
        !isProductFrozen(product) &&
        matchesCategory(product.category)
      );
    }

    // Default: Fresh today (non-frozen, non-offers)
    return (
      !isProductFrozen(product) &&
      product.category !== "Offers"
    );
  });

  // Best sellers
  const visibleBestSellers = products.filter(
    (product) =>
      product.isBestSeller &&
      matchesSearch(product.name) &&
      (selectedCategory
        ? selectedCategory.toLowerCase() === "frozen"
          ? isProductFrozen(product)
          : matchesCategory(product.category)
        : true),
  );

  // Frozen meats & ready-to-cook items
  const visibleFrozenProducts = products.filter(
    (product) =>
      isProductFrozen(product) &&
      matchesSearch(product.name),
  );

  // Offers
  const visibleOfferProducts = products.filter(
    (product) =>
      (product.category === "Offers" || product.price < 400) &&
      matchesSearch(product.name) &&
      (selectedCategory
        ? selectedCategory.toLowerCase() === "frozen"
          ? isProductFrozen(product)
          : matchesCategory(product.category)
        : true),
  );

  const offersScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    offersScrollRef.current?.scrollTo({ x: 0, y: 0, animated: false });
  }, [selectedCategory, visibleOfferProducts.length]);

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <CustomerHeader
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        address={address}
        onPressProfile={onPressProfile}
      />
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Fresh Catch &{"\n"}Daily Sourced.</Text>
        <Text style={styles.heroCopy}>
          Line-caught coastal seafood & farm-fresh cuts, delivered cold.
        </Text>
        <View style={styles.heroButtons}>
          <Pressable
            style={styles.shopButton}
            onPress={() => onNavigateToListing("Fish")}
            accessibilityRole="button"
          >
            <Text style={styles.shopButtonText}>Shop Fresh</Text>
          </Pressable>
        </View>
      </View>
      <View style={styles.categoryWrap}>
        <CategoryRail
          categories={categories}
          selectedCategory={selectedCategory}
          onSelect={(cat) => {
            if (selectedCategory?.toLowerCase() === cat.toLowerCase()) {
              onSelectCategory("");
            } else {
              onSelectCategory(cat);
            }
          }}
        />
      </View>

      {/* 1. Main Category / Fresh Items Section */}
      <SectionHeader
        title={
          selectedCategory
            ? selectedCategory.toLowerCase() === "frozen"
              ? "Frozen meats & specials ❄️"
              : selectedCategory
            : "Fresh today"
        }
        action="See all"
        onAction={() => onNavigateToListing(selectedCategory || "Fish")}
      />
      <ProductRail
        products={visibleCategoryProducts}
        favorites={favorites}
        onAddProduct={onAddProduct}
        onToggleFavorite={onToggleFavorite}
        onSelectProduct={onSelectProduct}
        resetKey={selectedCategory}
      />

      {/* 2. Best Sellers */}
      {visibleBestSellers.length > 0 && (
        <>
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
            resetKey={selectedCategory}
          />
        </>
      )}

      {/* 3. Today's Offers */}
      {visibleOfferProducts.length > 0 && (
        <>
          <SectionHeader
            title="Today's offers"
            action="See all"
            onAction={() => onNavigateToListing("Offers")}
          />
          <ScrollView
            ref={offersScrollRef}
            key={selectedCategory ? `offers-${selectedCategory}` : "offers-all"}
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
        </>
      )}

      {/* 4. Frozen Meats & Specials (Moved to BOTTOM of product lists!) */}
      {!selectedCategory && (
        <>
          <SectionHeader
            title="Frozen meats & specials ❄️"
            action="See all"
            onAction={() => onNavigateToListing("Frozen")}
          />
          <ProductRail
            products={visibleFrozenProducts}
            favorites={favorites}
            onAddProduct={onAddProduct}
            onToggleFavorite={onToggleFavorite}
            onSelectProduct={onSelectProduct}
            resetKey={selectedCategory}
          />
        </>
      )}
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
            onPress={() =>
              onNavigateToListing(
                need.includes("Frozen") ? "Frozen" : null,
                need,
              )
            }
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
  resetKey,
}: Pick<HomeViewProps, "favorites" | "onAddProduct" | "onToggleFavorite" | "onSelectProduct"> & {
  products: Product[];
  resetKey?: string | null;
}) {
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ x: 0, y: 0, animated: false });
  }, [resetKey, products.length]);

  return (
    <ScrollView
      ref={scrollRef}
      key={resetKey ? `rail-${resetKey}` : "rail-all"}
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
    marginBottom: 24,
    padding: 22,
    borderRadius: 22,
    backgroundColor: colors.primary,
    overflow: "hidden",
  },
  categoryWrap: {
    marginTop: 6,
    marginBottom: 8,
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
  heroButtons: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  shopButton: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: colors.accent,
  },
  shopButtonText: { color: "#FFFFFF", fontSize: 12.5, fontWeight: "800" },
  shopFrozenButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E0F2FE",
  },
  shopFrozenText: {
    color: colors.primaryDark,
    fontSize: 12.5,
    fontWeight: "800",
  },
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
