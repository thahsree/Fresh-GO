import { colors } from "@fresh-food/design-tokens";
import {
  House,
  Menu,
  Package,
  Search,
  ShoppingBasket,
} from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

type NavigationItem = { label: string; icon: typeof House };
const items: NavigationItem[] = [
  { label: "Home", icon: House },
  { label: "Search", icon: Search },
  { label: "Cart", icon: ShoppingBasket },
  { label: "Orders", icon: Package },
  { label: "Profile", icon: Menu },
];

type BottomNavigationProps = {
  activeItem: string;
  onSelect: (label: string) => void;
};

export function BottomNavigation({
  activeItem,
  onSelect,
}: BottomNavigationProps) {
  return (
    <View style={styles.navigation}>
      {items.map(({ label, icon: Icon }) => {
        const isActive = label === activeItem;
        return (
          <Pressable
            key={label}
            onPress={() => onSelect(label)}
            style={styles.item}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
          >
            <Icon
              size={18}
              color={isActive ? colors.primary : colors.textSoft}
            />
            <Text style={[styles.label, isActive && styles.activeLabel]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  navigation: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 10,
    paddingBottom: 14,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  item: { alignItems: "center", gap: 3, minWidth: 52 },
  label: { color: colors.textSoft, fontSize: 9.5, fontWeight: "700" },
  activeLabel: { color: colors.primary },
});
