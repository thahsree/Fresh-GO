import { colors } from "@fresh-food/design-tokens";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
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
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.rail}
    >
      {categories.map((category) => {
        const isSelected =
          Boolean(selectedCategory) &&
          selectedCategory?.toLowerCase() === category.name.toLowerCase();
        return (
          <Pressable
            key={category.id || category.name}
            onPress={() => onSelect(category.name)}
            style={styles.item}
            accessibilityRole="button"
            accessibilityLabel={`${category.name} category`}
          >
            <View
              style={[
                styles.icon,
                { backgroundColor: category.tint || "#E0F2FE" },
                isSelected && styles.selectedIcon,
              ]}
            >
              <Text style={styles.emoji}>{category.icon}</Text>
            </View>
            <Text
              numberOfLines={1}
              style={[styles.label, isSelected && styles.selectedLabel]}
            >
              {category.name}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  rail: {
    flexDirection: "row",
    gap: 14,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 20,
    alignItems: "center",
  },
  item: { width: 74, alignItems: "center" },
  icon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
    borderWidth: 2,
    borderColor: "transparent",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedIcon: {
    borderColor: colors.primary,
    transform: [{ scale: 1.05 }],
  },
  emoji: { fontSize: 26 },
  label: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  selectedLabel: { color: colors.primary, fontWeight: "800" },
});

