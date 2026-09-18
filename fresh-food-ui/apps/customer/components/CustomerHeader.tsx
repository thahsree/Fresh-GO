import { colors } from "@fresh-food/design-tokens";
import { Bell, ChevronDown, Search, UserRound } from "lucide-react-native";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

type CustomerHeaderProps = {
  searchValue: string;
  onSearchChange: (value: string) => void;
};

export function CustomerHeader({
  searchValue,
  onSearchChange,
}: CustomerHeaderProps) {
  return (
    <>
      <View style={styles.topbar}>
        <Pressable style={styles.location} accessibilityRole="button">
          <View style={styles.dot} />
          <Text style={styles.locationText}>Deliver to · Palm Residency</Text>
          <ChevronDown size={13} color={colors.primaryDark} />
        </Pressable>
        <View style={styles.actions}>
          <Pressable
            style={styles.iconButton}
            accessibilityLabel="Notifications"
          >
            <Bell size={16} color={colors.primaryDark} />
          </Pressable>
          <Pressable style={styles.iconButton} accessibilityLabel="Profile">
            <UserRound size={16} color={colors.primaryDark} />
          </Pressable>
        </View>
      </View>
      <View style={styles.searchBar}>
        <Search size={16} color={colors.textSoft} />
        <TextInput
          value={searchValue}
          onChangeText={onSearchChange}
          placeholder="What are you looking for?"
          placeholderTextColor={colors.textSoft}
          style={styles.searchInput}
          accessibilityLabel="Search products"
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  topbar: {
    padding: 14,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  location: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent },
  locationText: { color: colors.primaryDark, fontSize: 12, fontWeight: "700" },
  actions: { flexDirection: "row", gap: 8 },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBar: {
    marginHorizontal: 18,
    marginBottom: 14,
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 13, padding: 0 },
});
