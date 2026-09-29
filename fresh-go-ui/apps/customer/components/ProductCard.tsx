import { colors } from "@fresh-food/design-tokens";
import { ProductCard as SharedProductCard } from "@fresh-food/ui";
import { Plus } from "lucide-react-native";
import React from "react";
import type { Product } from "../models/catalog";

type ProductCardProps = {
  product: Product;
  isFavorite?: boolean;
  onAdd: () => void;
  onToggleFavorite?: () => void;
  onPress?: () => void;
};

export function ProductCard({
  product,
  onAdd,
  onPress,
}: ProductCardProps) {
  return (
    <SharedProductCard
      product={product}
      onAdd={onAdd}
      onPress={onPress}
      addIcon={<Plus size={16} color="#FFFFFF" strokeWidth={3} />}
    />
  );
}
