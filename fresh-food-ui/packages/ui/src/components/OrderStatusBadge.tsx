import { OrderStatus } from "@fresh-food/design-tokens";
import React from "react";
import { StyleProp, TextStyle, ViewStyle } from "react-native";
import { Badge, BadgeVariant } from "./Badge";

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; variant: BadgeVariant }
> = {
  pending: { label: "Pending", variant: "warning" },
  preparing: { label: "Preparing", variant: "accent" },
  out_for_delivery: { label: "Out for Delivery", variant: "primary" },
  delivered: { label: "Delivered", variant: "success" },
  cancelled: { label: "Cancelled", variant: "error" },
};

export type OrderStatusBadgeProps = {
  status: OrderStatus;
  dot?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

export function OrderStatusBadge({
  status,
  dot = true,
  style,
  textStyle,
}: OrderStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || {
    label: status,
    variant: "neutral" as BadgeVariant,
  };

  return (
    <Badge
      label={config.label}
      variant={config.variant}
      dot={dot}
      style={style}
      textStyle={textStyle}
    />
  );
}
