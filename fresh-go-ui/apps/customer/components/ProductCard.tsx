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
  quantity?: number;
  onIncrement?: () => void;
  onDecrement?: () => void;
};

export function ProductCard({
  product,
  onAdd,
  onPress,
  quantity,
  onIncrement,
  onDecrement,
}: ProductCardProps) {
  return (
    <SharedProductCard
      product={product}
      onAdd={onAdd}
      onPress={onPress}
      quantity={quantity}
      onIncrement={onIncrement}
      onDecrement={onDecrement}
      addIcon={<Plus size={16} color="#FFFFFF" strokeWidth={3} />}
    />
  );
}

