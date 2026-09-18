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

export type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

export function Chip({
  label,
  selected = false,
  onPress,
  icon,
  style,
  textStyle,
}: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        selected ? styles.selected : styles.unselected,
        pressed && styles.pressed,
        style,
      ]}
    >
      {icon && <React.Fragment>{icon}</React.Fragment>}
      <Text
        style={[
          styles.text,
          selected ? styles.selectedText : styles.unselectedText,
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
    borderRadius: radius.pill,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm + 4,
    borderWidth: 1.5,
    gap: spacing.xs + 2,
    alignSelf: "flex-start",
  },
  unselected: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
  },
  selected: {
    backgroundColor: colors.primaryTint,
    borderColor: colors.primary,
  },
  pressed: {
    opacity: 0.85,
  },
  text: {
    fontSize: 12.5,
    fontWeight: "700",
  },
  unselectedText: {
    color: colors.textMuted,
  },
  selectedText: {
    color: colors.primaryDark,
  },
});
