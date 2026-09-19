import { colors, radius } from "@fresh-food/design-tokens";
import React from "react";
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";

export type QuantityStepperProps = {
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
  min?: number;
  max?: number;
  style?: StyleProp<ViewStyle>;
};

export function QuantityStepper({
  value,
  onIncrement,
  onDecrement,
  min = 0,
  max,
  style,
}: QuantityStepperProps) {
  const canDecrement = value > min;
  const canIncrement = max === undefined || value < max;

  return (
    <View style={[styles.container, style]}>
      <Pressable
        accessibilityLabel="Decrease quantity"
        accessibilityRole="button"
        disabled={!canDecrement}
        onPress={onDecrement}
        style={({ pressed }) => [
          styles.button,
          !canDecrement && styles.buttonDisabled,
          pressed && canDecrement && styles.buttonPressed,
        ]}
      >
        <Text style={[styles.buttonText, !canDecrement && styles.textDisabled]}>
          −
        </Text>
      </Pressable>
      <View style={styles.valueContainer}>
        <Text style={styles.valueText}>{value}</Text>
      </View>
      <Pressable
        accessibilityLabel="Increase quantity"
        accessibilityRole="button"
        disabled={!canIncrement}
        onPress={onIncrement}
        style={({ pressed }) => [
          styles.button,
          !canIncrement && styles.buttonDisabled,
          pressed && canIncrement && styles.buttonPressed,
        ]}
      >
        <Text style={[styles.buttonText, !canIncrement && styles.textDisabled]}>
          +
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.pill,
    overflow: "hidden",
    alignSelf: "flex-start",
    backgroundColor: colors.surface,
  },
  button: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceAlt,
  },
  buttonPressed: {
    backgroundColor: colors.border,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.primaryDark,
    lineHeight: 18,
  },
  textDisabled: {
    color: colors.textSoft,
  },
  valueContainer: {
    minWidth: 32,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  valueText: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.text,
  },
});
