import { colors } from "@fresh-food/design-tokens";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Category } from "../models/catalog";

type CategoryRailProps = {
  categories: Category[];
  selectedCategory: string | null;
  onSelect: (category: string) => void;
};

export function CategoryRail({
  categories,
  selectedCategory,
  onSelect,
}: CategoryRailProps) {
  return (
    <View style={styles.rail}>
      {categories.map((category) => {
        const isSelected = selectedCategory === category.name;
        return (
          <Pressable
            key={category.name}
            onPress={() => onSelect(category.name)}
            style={styles.item}
            accessibilityRole="button"
          >
            <View
              style={[
                styles.icon,
                { backgroundColor: category.tint },
                isSelected && styles.selectedIcon,
              ]}
            >
              <Text style={styles.emoji}>{category.icon}</Text>
            </View>
            <Text style={[styles.label, isSelected && styles.selectedLabel]}>
              {category.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 18,
    paddingBottom: 20,
  },
  item: { width: 78, alignItems: "center" },
  icon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "transparent",
  },
  selectedIcon: { borderColor: colors.primary },
  emoji: { fontSize: 26 },
  label: { color: colors.text, fontSize: 11.5, fontWeight: "700" },
  selectedLabel: { color: colors.primary },
});
