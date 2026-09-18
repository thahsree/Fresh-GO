import { colors, radius, spacing } from "@fresh-food/design-tokens";
import React from "react";
import {
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";

export type BadgeVariant =
  | "success"
  | "warning"
  | "error"
  | "accent"
  | "primary"
  | "neutral";

export type BadgeProps = {
  label: string;
  variant?: BadgeVariant;
  dot?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

export function Badge({
  label,
  variant = "neutral",
  dot = false,
  style,
  textStyle,
}: BadgeProps) {
  return (
    <View style={[styles.base, styles[variant], style]}>
      {dot && <View style={[styles.dot, styles[`${variant}Dot`]]} />}
      <Text style={[styles.text, styles[`${variant}Text`], textStyle]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm + 2,
    gap: spacing.xs + 1,
    alignSelf: "flex-start",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: radius.pill,
  },
  text: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.2,
  },

  // Variants
  success: {
    backgroundColor: colors.successTint,
  },
  successText: {
    color: colors.success,
  },
  successDot: {
    backgroundColor: colors.success,
  },

  warning: {
    backgroundColor: colors.warningTint,
  },
  warningText: {
    color: colors.warning,
  },
  warningDot: {
    backgroundColor: colors.warning,
  },

  error: {
    backgroundColor: colors.errorTint,
  },
  errorText: {
    color: colors.error,
  },
  errorDot: {
    backgroundColor: colors.error,
  },

  accent: {
    backgroundColor: colors.accentTint,
  },
  accentText: {
    color: colors.accent,
  },
  accentDot: {
    backgroundColor: colors.accent,
  },

  primary: {
    backgroundColor: colors.primaryTint,
  },
  primaryText: {
    color: colors.primaryDark,
  },
  primaryDot: {
    backgroundColor: colors.primary,
  },

  neutral: {
    backgroundColor: colors.surfaceAlt,
  },
  neutralText: {
    color: colors.textMuted,
  },
  neutralDot: {
    backgroundColor: colors.textMuted,
  },
});
