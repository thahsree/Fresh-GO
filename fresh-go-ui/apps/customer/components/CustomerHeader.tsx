import { colors } from "@fresh-food/design-tokens";
import { ChevronDown, MapPin, Search, UserRound } from "lucide-react-native";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

type CustomerHeaderProps = {
  searchValue: string;
  onSearchChange: (value: string) => void;
  address?: string;
  onPressProfile?: () => void;
  onPressLocation?: () => void;
};

export function CustomerHeader({
  searchValue,
  onSearchChange,
  address,
  onPressProfile,
  onPressLocation,
}: CustomerHeaderProps) {
  const isSelected = Boolean(address && address.trim().length > 0);
  const displayAddress = isSelected ? address : "Select Delivery Location";

  return (
    <>
      <View style={styles.topbar}>
        <Pressable
          style={styles.location}
          accessibilityRole="button"
          onPress={onPressLocation}
        >
          <MapPin size={16} color={colors.primary} style={{ flexShrink: 0 }} />
          <Text
            style={[
              styles.locationText,
              !isSelected && { color: colors.primary, fontWeight: "800" },
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {displayAddress}
          </Text>
          <ChevronDown size={13} color={colors.primaryDark} style={{ flexShrink: 0 }} />
        </Pressable>
        <View style={styles.actions}>
          <Pressable
            style={styles.iconButton}
            accessibilityLabel="Profile"
            onPress={onPressProfile}
          >
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
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  location: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
    maxWidth: "80%",
    marginRight: 10,
  },
  locationText: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "700",
    flexShrink: 1,
  },
  actions: { flexDirection: "row", gap: 8 },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBar: {
    marginHorizontal: 16,
    marginBottom: 12,
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
