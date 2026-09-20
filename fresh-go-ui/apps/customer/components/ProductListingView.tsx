import { colors, radius } from "@fresh-food/design-tokens";
import {
  ArrowLeft,
  ArrowUpDown,
  Check,
  Filter,
  Heart,
  Plus,
  Search,
  SlidersHorizontal,
  Star,
  X,
} from "lucide-react-native";
import React, { useMemo, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  allProducts,
  categories,
  type Product,
} from "../models/catalog";

type SortOption =
  | "featured"
  | "price_asc"
  | "price_desc"
  | "rating"
  | "fresh_only";

type PriceFilter = "all" | "under_300" | "300_700" | "above_700";

type ProductListingViewProps = {
  initialCategory?: string | null;
  initialSearch?: string;
  favorites: string[];
  onBack: () => void;
  onSelectProduct: (product: Product) => void;
  onAddProduct: (productId: string) => void;
  onToggleFavorite: (productId: string) => void;
};

export function ProductListingView({
  initialCategory = null,
  initialSearch = "",
  favorites,
  onBack,
  onSelectProduct,
  onAddProduct,
  onToggleFavorite,
}: ProductListingViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    initialCategory,
  );
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [sortBy, setSortBy] = useState<SortOption>("featured");
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("all");
  const [onlyFresh, setOnlyFresh] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  // Filter & Sort Logic
  const filteredProducts = useMemo(() => {
    let list = [...allProducts];

    // Category Filter
    if (selectedCategory && selectedCategory !== "All") {
      list = list.filter(
        (p) => p.category.toLowerCase() === selectedCategory.toLowerCase(),
      );
    }

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.detail.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q),
      );
    }

    // Price Filter
    if (priceFilter === "under_300") {
      list = list.filter((p) => p.price < 300);
    } else if (priceFilter === "300_700") {
      list = list.filter((p) => p.price >= 300 && p.price <= 700);
    } else if (priceFilter === "above_700") {
      list = list.filter((p) => p.price > 700);
    }

    // Fresh Only
    if (onlyFresh) {
      list = list.filter((p) => p.fresh === true);
    }

    // Sorting
    if (sortBy === "price_asc") {
      list.sort((a, b) => a.price - b.price);
    } else if (sortBy === "price_desc") {
      list.sort((a, b) => b.price - a.price);
    } else if (sortBy === "rating") {
      list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    } else if (sortBy === "fresh_only") {
      list.sort((a, b) => (b.fresh ? 1 : 0) - (a.fresh ? 1 : 0));
    }

    return list;
  }, [selectedCategory, searchQuery, priceFilter, onlyFresh, sortBy]);

  const resetFilters = () => {
    setSelectedCategory(null);
    setSearchQuery("");
    setPriceFilter("all");
    setOnlyFresh(false);
    setSortBy("featured");
  };

  const hasActiveFilters =
    selectedCategory !== null ||
    priceFilter !== "all" ||
    onlyFresh ||
    sortBy !== "featured" ||
    searchQuery.trim() !== "";

  return (
    <View style={styles.screen}>
      {/* Top Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.backBtn}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <ArrowLeft size={20} color={colors.primaryDark} />
        </Pressable>

        <View style={styles.searchWrapper}>
          <Search size={15} color={colors.textSoft} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search fish, meat, greens..."
            placeholderTextColor={colors.textSoft}
            style={styles.searchInput}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")}>
              <X size={14} color={colors.textSoft} />
            </Pressable>
          )}
        </View>

        <Pressable
          style={[
            styles.filterBtn,
            hasActiveFilters && styles.filterBtnActive,
          ]}
          onPress={() => setIsFilterModalOpen(true)}
          accessibilityRole="button"
        >
          <SlidersHorizontal
            size={18}
            color={hasActiveFilters ? "#FFFFFF" : colors.primaryDark}
          />
        </Pressable>
      </View>

      {/* Category Pills Bar */}
      <View style={styles.categoryBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRail}
        >
          <Pressable
            style={[
              styles.catChip,
              !selectedCategory && styles.catChipActive,
            ]}
            onPress={() => setSelectedCategory(null)}
          >
            <Text
              style={[
                styles.catChipText,
                !selectedCategory && styles.catChipTextActive,
              ]}
            >
              All ({allProducts.length})
            </Text>
          </Pressable>

          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.name;
            return (
              <Pressable
                key={cat.name}
                style={[
                  styles.catChip,
                  isSelected && styles.catChipActive,
                ]}
                onPress={() =>
                  setSelectedCategory(isSelected ? null : cat.name)
                }
              >
                <Text style={styles.catIcon}>{cat.icon}</Text>
                <Text
                  style={[
                    styles.catChipText,
                    isSelected && styles.catChipTextActive,
                  ]}
                >
                  {cat.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Results Meta & Active Filter Pills */}
      <View style={styles.metaBar}>
        <Text style={styles.resultCount}>
          Showing {filteredProducts.length}{" "}
          {filteredProducts.length === 1 ? "product" : "products"}
        </Text>

        <Pressable
          style={styles.sortToggle}
          onPress={() => setIsFilterModalOpen(true)}
        >
          <ArrowUpDown size={12} color={colors.primary} />
          <Text style={styles.sortToggleText}>
            {sortBy === "featured"
              ? "Sort"
              : sortBy === "price_asc"
              ? "Price: Low to High"
              : sortBy === "price_desc"
              ? "Price: High to Low"
              : "Top Rated"}
          </Text>
        </Pressable>
      </View>

      {/* Products Grid */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.gridContainer}
      >
        {filteredProducts.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No matching products</Text>
            <Text style={styles.emptySub}>
              We couldn't find any items matching your filters.
            </Text>
            <Pressable style={styles.resetBtn} onPress={resetFilters}>
              <Text style={styles.resetBtnText}>Clear All Filters</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.grid}>
            {filteredProducts.map((product) => {
              const isFav = favorites.includes(product.id);
              return (
                <Pressable
                  key={product.id}
                  style={styles.productCard}
                  onPress={() => onSelectProduct(product)}
                  accessibilityRole="button"
                >
                  {/* Image Container */}
                  <View style={styles.cardImageWrapper}>
                    <Image
                      source={{ uri: product.image }}
                      style={styles.cardImage}
                      resizeMode="cover"
                    />

                    {product.fresh && (
                      <View style={styles.freshTag}>
                        <View style={styles.freshDot} />
                        <Text style={styles.freshTagText}>Fresh</Text>
                      </View>
                    )}

                    <Pressable
                      style={styles.favoriteBtn}
                      onPress={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(product.id);
                      }}
                      accessibilityLabel="Favorite"
                    >
                      <Heart
                        size={12}
                        color={isFav ? colors.accent : colors.primaryDark}
                        fill={isFav ? colors.accent : "transparent"}
                      />
                    </Pressable>
                  </View>

                  {/* Body */}
                  <View style={styles.cardBody}>
                    <View style={styles.categoryRow}>
                      <Text style={styles.categoryLabel}>
                        {product.category}
                      </Text>
                      {product.rating && (
                        <View style={styles.ratingBadge}>
                          <Star size={10} color="#F5A623" fill="#F5A623" />
                          <Text style={styles.ratingText}>{product.rating}</Text>
                        </View>
                      )}
                    </View>

                    <Text style={styles.productTitle} numberOfLines={1}>
                      {product.name}
                    </Text>
                    <Text style={styles.productDetail} numberOfLines={1}>
                      {product.detail}
                    </Text>

                    {/* Price and Add */}
                    <View style={styles.priceRow}>
                      <View>
                        <Text style={styles.priceText}>
                          Rs {product.price}
                        </Text>
                        <Text style={styles.unitText}>{product.unit}</Text>
                      </View>

                      <Pressable
                        style={styles.addBtn}
                        onPress={(e) => {
                          e.stopPropagation();
                          onAddProduct(product.id);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel="Add to cart"
                      >
                        <Plus size={16} color="#FFFFFF" strokeWidth={3} />
                      </Pressable>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Filter & Sort Bottom Sheet Modal */}
      <Modal
        visible={isFilterModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsFilterModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setIsFilterModalOpen(false)}
          />
          <View style={styles.sheetContent}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Filter & Sort</Text>
              <Pressable
                style={styles.sheetCloseBtn}
                onPress={() => setIsFilterModalOpen(false)}
              >
                <X size={18} color={colors.primaryDark} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Sort By */}
              <Text style={styles.sheetSectionTitle}>Sort By</Text>
              <View style={styles.optionsList}>
                {[
                  { key: "featured", label: "Featured & Popular" },
                  { key: "price_asc", label: "Price: Low to High" },
                  { key: "price_desc", label: "Price: High to Low" },
                  { key: "rating", label: "Customer Rating (High to Low)" },
                  { key: "fresh_only", label: "Daily Catch First" },
                ].map(({ key, label }) => {
                  const isSelected = sortBy === key;
                  return (
                    <Pressable
                      key={key}
                      style={[
                        styles.optionRow,
                        isSelected && styles.optionRowSelected,
                      ]}
                      onPress={() => setSortBy(key as SortOption)}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          isSelected && styles.optionTextSelected,
                        ]}
                      >
                        {label}
                      </Text>
                      {isSelected && (
                        <Check size={16} color={colors.primary} strokeWidth={3} />
                      )}
                    </Pressable>
                  );
                })}
              </View>

              {/* Price Range */}
              <Text style={styles.sheetSectionTitle}>Price Range</Text>
              <View style={styles.priceChips}>
                {[
                  { key: "all", label: "Any Price" },
                  { key: "under_300", label: "Under Rs 300" },
                  { key: "300_700", label: "Rs 300 – Rs 700" },
                  { key: "above_700", label: "Above Rs 700" },
                ].map(({ key, label }) => {
                  const isSelected = priceFilter === key;
                  return (
                    <Pressable
                      key={key}
                      style={[
                        styles.filterPill,
                        isSelected && styles.filterPillActive,
                      ]}
                      onPress={() => setPriceFilter(key as PriceFilter)}
                    >
                      <Text
                        style={[
                          styles.filterPillText,
                          isSelected && styles.filterPillTextActive,
                        ]}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Daily Fresh Only Toggle */}
              <Text style={styles.sheetSectionTitle}>Quality Tag</Text>
              <Pressable
                style={[
                  styles.optionRow,
                  onlyFresh && styles.optionRowSelected,
                ]}
                onPress={() => setOnlyFresh((f) => !f)}
              >
                <Text
                  style={[
                    styles.optionText,
                    onlyFresh && styles.optionTextSelected,
                  ]}
                >
                  ⚡ Daily Morning Catch Only
                </Text>
                {onlyFresh && (
                  <Check size={16} color={colors.primary} strokeWidth={3} />
                )}
              </Pressable>
            </ScrollView>

            {/* Apply & Reset Buttons */}
            <View style={styles.sheetActions}>
              <Pressable style={styles.sheetResetBtn} onPress={resetFilters}>
                <Text style={styles.sheetResetText}>Reset</Text>
              </Pressable>
              <Pressable
                style={styles.sheetApplyBtn}
                onPress={() => setIsFilterModalOpen(false)}
              >
                <Text style={styles.sheetApplyText}>
                  Show {filteredProducts.length} Results
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  searchWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 38,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 12.5,
    padding: 0,
  },
  filterBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  filterBtnActive: {
    backgroundColor: colors.primary,
  },
  categoryBar: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 8,
  },
  categoryRail: {
    paddingHorizontal: 16,
    gap: 8,
  },
  catChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
  },
  catChipActive: {
    backgroundColor: colors.primary,
  },
  catIcon: {
    fontSize: 12,
  },
  catChipText: {
    color: colors.text,
    fontSize: 11.5,
    fontWeight: "700",
  },
  catChipTextActive: {
    color: "#FFFFFF",
  },
  metaBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  resultCount: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
  sortToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.primaryTint,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  sortToggleText: {
    color: colors.primary,
    fontSize: 11.5,
    fontWeight: "700",
  },
  gridContainer: {
    paddingHorizontal: 16,
    paddingBottom: 28,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
  },
  productCard: {
    width: "48%",
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  cardImageWrapper: {
    width: "100%",
    height: 120,
    position: "relative",
    backgroundColor: colors.primaryTint,
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  freshTag: {
    position: "absolute",
    top: 6,
    left: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  freshDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.success,
  },
  freshTagText: {
    color: colors.success,
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  favoriteBtn: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: {
    padding: 10,
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  categoryLabel: {
    color: colors.textSoft,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  ratingText: {
    color: colors.text,
    fontSize: 10,
    fontWeight: "700",
  },
  productTitle: {
    color: colors.text,
    fontSize: 12.5,
    fontWeight: "700",
    marginBottom: 2,
  },
  productDetail: {
    color: colors.textSoft,
    fontSize: 10.5,
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  priceText: {
    color: colors.primaryDark,
    fontSize: 13.5,
    fontWeight: "800",
  },
  unitText: {
    color: colors.textSoft,
    fontSize: 10,
  },
  addBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    color: colors.primaryDark,
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 6,
  },
  emptySub: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: "center",
    marginBottom: 16,
  },
  resetBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  resetBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    flex: 1,
  },
  sheetContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
    maxHeight: "80%",
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sheetTitle: {
    color: colors.primaryDark,
    fontSize: 18,
    fontWeight: "800",
  },
  sheetCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetSectionTitle: {
    color: colors.primaryDark,
    fontSize: 13.5,
    fontWeight: "800",
    marginTop: 14,
    marginBottom: 8,
  },
  optionsList: {
    gap: 6,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: colors.surfaceAlt,
  },
  optionRowSelected: {
    backgroundColor: colors.primaryTint,
  },
  optionText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "600",
  },
  optionTextSelected: {
    color: colors.primary,
    fontWeight: "700",
  },
  priceChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterPillActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryTint,
  },
  filterPillText: {
    color: colors.textSoft,
    fontSize: 12,
    fontWeight: "700",
  },
  filterPillTextActive: {
    color: colors.primary,
  },
  sheetActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sheetResetBtn: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetResetText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "700",
  },
  sheetApplyBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetApplyText: {
    color: "#FFFFFF",
    fontSize: 13.5,
    fontWeight: "800",
  },
});
