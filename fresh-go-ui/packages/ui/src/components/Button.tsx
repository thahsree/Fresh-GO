import { colors, radius, spacing } from "@fresh-food/design-tokens";
import React from "react";
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  ViewStyle,
} from "react-native";

export type ButtonVariant = "primary" | "accent" | "outline" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

export function Button({
  label,
  onPress,
  variant = "primary",
  size = "md",
  disabled = false,
  fullWidth = false,
  icon,
  style,
  textStyle,
}: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        styles[size],
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
        pressed && !disabled && styles[`${variant}Pressed`],
        style,
      ]}
    >
      {icon && <React.Fragment>{icon}</React.Fragment>}
      <Text
        style={[
          styles.textBase,
          styles[`${variant}Text`],
          styles[`${size}Text`],
          disabled && styles.disabledText,
          textStyle,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    gap: spacing.xs + 2,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  fullWidth: {
    width: "100%",
  },
  disabled: {
    opacity: 0.5,
  },

  // Variants
  primary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  primaryPressed: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primaryDark,
  },
  accent: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  accentPressed: {
    opacity: 0.88,
  },
  outline: {
    backgroundColor: "transparent",
    borderColor: colors.border,
  },
  outlinePressed: {
    backgroundColor: colors.surfaceAlt,
  },
  ghost: {
    backgroundColor: colors.surfaceAlt,
    borderColor: "transparent",
  },
  ghostPressed: {
    backgroundColor: colors.border,
  },

  // Sizes
  sm: {
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm + 4,
  },
  md: {
    paddingVertical: spacing.sm + 3,
    paddingHorizontal: spacing.md + 4,
  },
  lg: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg + 2,
  },

  // Text Styles
  textBase: {
    fontWeight: "700",
    textAlign: "center",
  },
  primaryText: {
    color: "#FFFFFF",
  },
  accentText: {
    color: "#FFFFFF",
  },
  outlineText: {
    color: colors.text,
  },
  ghostText: {
    color: colors.text,
  },
  disabledText: {
    color: colors.textSoft,
  },

  smText: {
    fontSize: 12.5,
  },
  mdText: {
    fontSize: 14,
  },
  lgText: {
    fontSize: 15,
  },
});
