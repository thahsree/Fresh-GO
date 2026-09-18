import { colors, radius, spacing } from "@fresh-food/design-tokens";
import React from "react";
import {
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";

export type StatCardProps = {
  value: string | number;
  label: string;
  subLabel?: string;
  accent?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function StatCard({
  value,
  label,
  subLabel,
  accent = false,
  icon,
  style,
}: StatCardProps) {
  return (
    <View style={[styles.base, accent ? styles.accentBase : styles.defaultBase, style]}>
      {icon && <View style={styles.iconWrapper}>{icon}</View>}
      <Text style={[styles.value, accent ? styles.accentValue : styles.defaultValue]}>
        {value}
      </Text>
      <Text style={[styles.label, accent ? styles.accentLabel : styles.defaultLabel]}>
        {label}
      </Text>
      {subLabel && (
        <Text style={[styles.subLabel, accent ? styles.accentSubLabel : styles.defaultSubLabel]}>
          {subLabel}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    minWidth: 120,
  },
  defaultBase: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  accentBase: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  iconWrapper: {
    marginBottom: spacing.xs,
  },
  value: {
    fontSize: 20,
    fontWeight: "800",
  },
  defaultValue: {
    color: colors.primaryDark,
  },
  accentValue: {
    color: "#FFFFFF",
  },
  label: {
    fontSize: 11.5,
    fontWeight: "600",
    marginTop: 2,
  },
  defaultLabel: {
    color: colors.textMuted,
  },
  accentLabel: {
    color: "rgba(255, 255, 255, 0.8)",
  },
  subLabel: {
    fontSize: 10.5,
    marginTop: 3,
  },
  defaultSubLabel: {
    color: colors.textSoft,
  },
  accentSubLabel: {
    color: "rgba(255, 255, 255, 0.65)",
  },
});
