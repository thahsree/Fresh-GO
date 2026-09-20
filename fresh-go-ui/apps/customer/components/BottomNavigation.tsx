import { colors } from "@fresh-food/design-tokens";
import {
  House,
  Package,
  ShoppingBasket,
  UserRound,
} from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type NavigationItem = { label: string; icon: typeof House };
const items: NavigationItem[] = [
  { label: "Home", icon: House },
  { label: "Cart", icon: ShoppingBasket },
  { label: "Orders", icon: Package },
  { label: "Profile", icon: UserRound },
];

type BottomNavigationProps = {
  activeItem: string;
  cartCount?: number;
  onSelect: (label: string) => void;
};

export function BottomNavigation({
  activeItem,
  cartCount = 0,
  onSelect,
}: BottomNavigationProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.navigation,
        { paddingBottom: Math.max(insets.bottom, 14) },
      ]}
    >
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
            <View style={styles.iconWrapper}>
              <Icon
                size={20}
                color={isActive ? colors.primary : colors.textSoft}
              />
              {label === "Cart" && cartCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {cartCount > 9 ? "9+" : cartCount}
                  </Text>
                </View>
              )}
            </View>
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
  item: { alignItems: "center", gap: 3, minWidth: 60 },
  iconWrapper: { position: "relative", alignItems: "center", justifyContent: "center" },
  badge: {
    position: "absolute",
    top: -4,
    right: -10,
    backgroundColor: colors.accent,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 9.5,
    fontWeight: "800",
  },
  label: { color: colors.textSoft, fontSize: 10.5, fontWeight: "700" },
  activeLabel: { color: colors.primary },
});
