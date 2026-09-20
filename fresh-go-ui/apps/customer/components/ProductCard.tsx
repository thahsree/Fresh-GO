import { colors } from "@fresh-food/design-tokens";
import { ProductCard as SharedProductCard } from "@fresh-food/ui";
import { Heart, Plus } from "lucide-react-native";
import React from "react";
import { Pressable } from "react-native";
import type { Product } from "../models/catalog";

type ProductCardProps = {
  product: Product;
  isFavorite: boolean;
  onAdd: () => void;
  onToggleFavorite: () => void;
  onPress?: () => void;
};

export function ProductCard({
  product,
  isFavorite,
  onAdd,
  onToggleFavorite,
  onPress,
}: ProductCardProps) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      <SharedProductCard
        product={product}
        isFavorite={isFavorite}
        onAdd={onAdd}
        onToggleFavorite={onToggleFavorite}
        favoriteIcon={
          <Heart
            size={12}
            color={isFavorite ? colors.accent : colors.primaryDark}
            fill={isFavorite ? colors.accent : "transparent"}
          />
        }
        addIcon={<Plus size={16} color="#FFFFFF" strokeWidth={3} />}
      />
    </Pressable>
  );
}
