import { colors, radius, spacing } from "@fresh-food/design-tokens";
import React, { useState } from "react";
import {
  KeyboardTypeOptions,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";

export type InputProps = {
  label?: string;
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  error?: string;
  helperText?: string;
  secureTextEntry?: boolean;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  editable?: boolean;
  style?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
};

export function Input({
  label,
  placeholder,
  value,
  onChangeText,
  error,
  helperText,
  secureTextEntry = false,
  leadingIcon,
  trailingIcon,
  keyboardType,
  autoCapitalize = "none",
  editable = true,
  style,
  inputStyle,
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.inputWrapper,
          isFocused && styles.focusedWrapper,
          Boolean(error) && styles.errorWrapper,
          !editable && styles.disabledWrapper,
        ]}
      >
        {leadingIcon && (
          <View style={styles.leadingIconContainer}>{leadingIcon}</View>
        )}
        <TextInput
          accessibilityLabel={label || placeholder}
          autoCapitalize={autoCapitalize}
          editable={editable}
          keyboardType={keyboardType}
          onBlur={() => setIsFocused(false)}
          onChangeText={onChangeText}
          onFocus={() => setIsFocused(true)}
          placeholder={placeholder}
          placeholderTextColor={colors.textSoft}
          secureTextEntry={secureTextEntry}
          style={[styles.input, inputStyle]}
          value={value}
        />
        {trailingIcon && (
          <View style={styles.trailingIconContainer}>{trailingIcon}</View>
        )}
      </View>
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.sm + 4,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textMuted,
    marginBottom: spacing.xs + 2,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  focusedWrapper: {
    borderColor: colors.primary,
  },
  errorWrapper: {
    borderColor: colors.error,
  },
  disabledWrapper: {
    backgroundColor: colors.surfaceAlt,
    opacity: 0.7,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.sm + 4,
    fontSize: 14,
    color: colors.text,
  },
  leadingIconContainer: {
    marginRight: spacing.sm,
  },
  trailingIconContainer: {
    marginLeft: spacing.sm,
  },
  errorText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: colors.error,
    marginTop: spacing.xs,
  },
  helperText: {
    fontSize: 11.5,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});
