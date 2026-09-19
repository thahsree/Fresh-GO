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
  image?: string;
};

export type ProductCardProps = {
  product: ProductCardData;
  isFavorite?: boolean;
  onAdd?: () => void;
  onToggleFavorite?: () => void;
  favoriteIcon?: React.ReactNode;
  addIcon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function ProductCard({
  product,
  isFavorite = false,
  onAdd,
  onToggleFavorite,
  favoriteIcon,
  addIcon,
  style,
}: ProductCardProps) {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.imageContainer}>
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

        {product.fresh && (
          <View style={styles.freshBadge}>
            <View style={styles.freshDot} />
            <Text style={styles.freshText}>fresh</Text>
          </View>
        )}

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
      </View>

      <View style={styles.body}>
        <Text numberOfLines={1} style={styles.name}>
          {product.name}
        </Text>
        {product.detail ? (
          <Text numberOfLines={1} style={styles.detail}>
            {product.detail}
          </Text>
        ) : null}

        <View style={styles.priceRow}>
          <Text style={styles.price}>
            Rs {product.price.toLocaleString()}
            {product.unit ? (
              <Text style={styles.unit}> {product.unit}</Text>
            ) : null}
          </Text>

          {onAdd && (
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
