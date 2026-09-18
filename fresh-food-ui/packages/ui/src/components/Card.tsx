import { colors, radius, spacing } from "@fresh-food/design-tokens";
import React from "react";
import {
  Platform,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";

export type CardProps = {
  children: React.ReactNode;
  variant?: "default" | "elevated" | "flat";
  style?: StyleProp<ViewStyle>;
};

export function Card({ children, variant = "default", style }: CardProps) {
  return (
    <View style={[styles.base, styles[variant], style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  default: {
    ...Platform.select({
      web: {
        boxShadow: "0 2px 12px rgba(20,28,25,0.06)",
      } as unknown as ViewStyle,
      default: {
        shadowColor: "#141C19",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
      },
    }),
  },
  elevated: {
    ...Platform.select({
      web: {
        boxShadow: "0 16px 40px rgba(20,28,25,0.12)",
      } as unknown as ViewStyle,
      default: {
        shadowColor: "#141C19",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 6,
      },
    }),
  },
  flat: {
    backgroundColor: colors.surfaceAlt,
    borderColor: "transparent",
  },
});
