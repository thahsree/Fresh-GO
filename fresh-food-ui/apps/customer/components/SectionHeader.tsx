import { colors } from "@fresh-food/design-tokens";
import { StyleSheet, Text, View } from "react-native";

type SectionHeaderProps = { title: string; action?: string };

export function SectionHeader({ title, action }: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {action && <Text style={styles.action}>{action}</Text>}
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
