import { colors, radius, spacing } from "@fresh-food/design-tokens";
import React from "react";
import {
  Image,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";

export type ProductCardData = {
  id: string;
  name: string;
  detail?: string;
  price: number;
  unit?: string;
  fresh?: boolean;
  isDailyCatch?: boolean;
  isFlashFrozen?: boolean;
  tag?: string;
  availableStockKg?: number;
  isInStock?: boolean;
  image?: string;
};

export type ProductCardProps = {
  product: ProductCardData;
  isFavorite?: boolean;
  onAdd?: () => void;
  onToggleFavorite?: () => void;
  onPress?: () => void;
  favoriteIcon?: React.ReactNode;
  addIcon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function ProductCard({
  product,
  isFavorite = false,
  onAdd,
  onToggleFavorite,
  onPress,
  favoriteIcon,
  addIcon,
  style,
}: ProductCardProps) {
  const isOutOfStock =
    product.isInStock === false ||
    (product.availableStockKg !== undefined && product.availableStockKg <= 0);

  const isLowStock =
    !isOutOfStock &&
    product.availableStockKg !== undefined &&
    product.availableStockKg > 0 &&
    product.availableStockKg <= 5;

  const displayTag =
    product.tag ||
    (product.isDailyCatch
      ? "Fresh Catch"
      : product.isFlashFrozen
      ? "Frozen"
      : product.fresh
      ? "Fresh"
      : undefined);

  return (
    <View style={[styles.card, style]}>
      {/* Clickable Image Container */}
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        style={styles.imageContainer}
        accessibilityRole={onPress ? "button" : undefined}
        accessibilityLabel={`${product.name} details`}
      >
        {product.image ? (
          <Image
            accessibilityLabel={product.name}
            resizeMode="cover"
            source={{ uri: product.image }}
            style={styles.image}
          />
        ) : (
          <View style={styles.imagePlaceholder} />
        )}

        {/* Out of Stock Pill */}
        {isOutOfStock && (
          <View style={[styles.freshBadge, { backgroundColor: "#BE4436" }]}>
            <Text style={[styles.freshText, { color: "#FFFFFF", fontWeight: "900" }]}>
              OUT OF STOCK
            </Text>
          </View>
        )}

        {/* Low Stock Warning Pill */}
        {isLowStock && (
          <View style={[styles.freshBadge, { backgroundColor: "#FEF3C7", borderColor: "#F59E0B", borderWidth: 1 }]}>
            <Text style={[styles.freshText, { color: "#B45309", fontWeight: "800" }]}>
              ⚠️ Only {product.availableStockKg} left
            </Text>
          </View>
        )}

        {/* Tag Pill when in stock and not low stock */}
        {!isOutOfStock && !isLowStock && displayTag && (
          <View
            style={[
              styles.freshBadge,
              displayTag === "Frozen"
                ? { backgroundColor: "#E0F2FE" }
                : displayTag === "Fresh Cut"
                ? { backgroundColor: "#FEF9C3" }
                : displayTag === "Fresh Produce"
                ? { backgroundColor: "#DCFCE7" }
                : { backgroundColor: "rgba(255, 255, 255, 0.95)" },
            ]}
          >
            {displayTag === "Fresh Catch" && <View style={styles.freshDot} />}
            {displayTag === "Fresh" && <View style={[styles.freshDot, { backgroundColor: "#15803D" }]} />}
            {displayTag === "Frozen" && <Text style={{ fontSize: 9, marginRight: 2 }}>❄️</Text>}
            {displayTag === "Fresh Cut" && <Text style={{ fontSize: 9, marginRight: 2 }}>🥩</Text>}
            {displayTag === "Fresh Produce" && <Text style={{ fontSize: 9, marginRight: 2 }}>🥬</Text>}
            <Text
              style={[
                styles.freshText,
                displayTag === "Frozen"
                  ? { color: "#0369A1" }
                  : displayTag === "Fresh Cut"
                  ? { color: "#854D0E" }
                  : displayTag === "Fresh Produce"
                  ? { color: "#166534" }
                  : {},
              ]}
            >
              {displayTag}
            </Text>
          </View>
        )}
      </Pressable>

      {/* Floating Favorite Button (Sibling, not nested) */}
      {onToggleFavorite && (
        <Pressable
          accessibilityLabel={
            isFavorite
              ? `Remove ${product.name} from favorites`
              : `Add ${product.name} to favorites`
          }
          accessibilityRole="button"
          onPress={onToggleFavorite}
          style={styles.favoriteButton}
        >
          {favoriteIcon || (
            <Text style={[styles.heartIcon, isFavorite && styles.heartActive]}>
              ♥
            </Text>
          )}
        </Pressable>
      )}

      {/* Body Details Area */}
      <View style={styles.body}>
        <Pressable onPress={onPress} disabled={!onPress}>
          <Text numberOfLines={1} style={styles.name}>
            {product.name}
          </Text>
          {product.detail ? (
            <Text numberOfLines={1} style={styles.detail}>
              {product.detail}
            </Text>
          ) : null}
        </Pressable>

        <View style={styles.priceRow}>
          <Pressable onPress={onPress} disabled={!onPress} style={{ flex: 1 }}>
            <Text style={styles.price}>
              Rs {product.price.toLocaleString()}
              {product.unit ? (
                <Text style={styles.unit}> {product.unit}</Text>
              ) : null}
            </Text>
          </Pressable>

          {onAdd && !isOutOfStock && (
            <Pressable
              accessibilityLabel={`Add ${product.name} to cart`}
              accessibilityRole="button"
              onPress={onAdd}
              style={({ pressed }) => [
                styles.addButton,
                pressed && styles.addButtonPressed,
              ]}
            >
              {addIcon || <Text style={styles.addIconText}>+</Text>}
            </Pressable>
          )}
          {isOutOfStock && (
            <View
              style={[
                styles.addButton,
                { backgroundColor: "#E2E8F0", borderColor: "#CBD5E1" },
              ]}
            >
              <Text style={{ fontSize: 10, color: "#94A3B8", fontWeight: "800" }}>✕</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 150,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  imageContainer: {
    height: 100,
    backgroundColor: colors.primaryTint,
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: colors.surfaceAlt,
  },
  freshBadge: {
    position: "absolute",
    top: spacing.xs + 2,
    left: spacing.xs + 2,
    paddingVertical: 3,
    paddingHorizontal: spacing.xs + 4,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  freshDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  freshText: {
    color: colors.success,
    fontSize: 9.5,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  favoriteButton: {
    position: "absolute",
    top: spacing.xs + 2,
    right: spacing.xs + 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    alignItems: "center",
    justifyContent: "center",
  },
  heartIcon: {
    fontSize: 12,
    color: colors.primaryDark,
  },
  heartActive: {
    color: colors.accent,
  },
  body: {
    padding: spacing.sm + 2,
  },
  name: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 2,
  },
  detail: {
    color: colors.textSoft,
    fontSize: 11,
    marginBottom: spacing.xs + 2,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.xs,
  },
  price: {
    color: colors.primaryDark,
    fontSize: 13.5,
    fontWeight: "800",
  },
  unit: {
    color: colors.textSoft,
    fontSize: 10.5,
    fontWeight: "600",
  },
  addButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonPressed: {
    backgroundColor: colors.primaryDark,
  },
  addIconText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 18,
  },
});
