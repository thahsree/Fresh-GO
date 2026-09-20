import { colors } from "@fresh-food/design-tokens";
import { Pressable, StyleSheet, Text, View } from "react-native";

type SectionHeaderProps = {
  title: string;
  action?: string;
  onAction?: () => void;
};

export function SectionHeader({ title, action, onAction }: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {action && (
        <Pressable
          onPress={onAction}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`${action} for ${title}`}
        >
          <Text style={styles.action}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginTop: 18,
    marginBottom: 10,
  },
  title: { color: colors.text, fontSize: 15, fontWeight: "800" },
  action: { color: colors.accent, fontSize: 11.5, fontWeight: "700" },
});
