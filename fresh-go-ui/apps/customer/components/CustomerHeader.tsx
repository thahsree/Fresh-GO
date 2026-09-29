import { colors } from "@fresh-food/design-tokens";
import {
  ArrowUpRight,
  ChevronDown,
  MapPin,
  Search,
  UserRound,
  X,
} from "lucide-react-native";
import React, { useMemo, useState } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { Product } from "../models/catalog";

type CustomerHeaderProps = {
  searchValue: string;
  onSearchChange: (value: string) => void;
  products?: Product[];
  onSubmitSearch?: (query: string) => void;
  onSelectProduct?: (product: Product) => void;
  address?: string;
  onPressProfile?: () => void;
  onPressLocation?: () => void;
};

export function CustomerHeader({
  searchValue,
  onSearchChange,
  products = [],
  onSubmitSearch,
  onSelectProduct,
  address,
  onPressProfile,
  onPressLocation,
}: CustomerHeaderProps) {
  const [isFocused, setIsFocused] = useState(false);
  const isSelected = Boolean(address && address.trim().length > 0);
  const displayAddress = isSelected ? address : "Select Delivery Location";

  const suggestions = useMemo(() => {
    const q = searchValue.toLowerCase().trim();
    if (!q || !products || products.length === 0) return [];
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          (p.detail && p.detail.toLowerCase().includes(q)),
      )
      .slice(0, 5);
  }, [searchValue, products]);

  const showSuggestions = isFocused && searchValue.trim().length > 0;

  const handleSelectSuggestion = (p: Product) => {
    setIsFocused(false);
    if (onSelectProduct) {
      onSelectProduct(p);
    } else if (onSubmitSearch) {
      onSubmitSearch(p.name);
    }
  };

  const handleSubmit = () => {
    if (searchValue.trim().length > 0 && onSubmitSearch) {
      setIsFocused(false);
      onSubmitSearch(searchValue.trim());
    }
  };

  return (
    <View style={styles.wrapper}>
      {/* Topbar: Location & Profile */}
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
          <ChevronDown
            size={13}
            color={colors.primaryDark}
            style={{ flexShrink: 0 }}
          />
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

      {/* Search Input Bar */}
      <View
        style={[
          styles.searchBar,
          isFocused && styles.searchBarFocused,
        ]}
      >
        <Search size={16} color={isFocused ? colors.primary : colors.textSoft} />
        <TextInput
          value={searchValue}
          onChangeText={onSearchChange}
          onFocus={() => setIsFocused(true)}
          placeholder="Search fish, meat, chicken, combos..."
          placeholderTextColor={colors.textSoft}
          style={styles.searchInput}
          accessibilityLabel="Search products"
          returnKeyType="search"
          onSubmitEditing={handleSubmit}
        />
        {searchValue.length > 0 && (
          <Pressable
            onPress={() => {
              onSearchChange("");
              setIsFocused(false);
            }}
            hitSlop={8}
          >
            <X size={15} color={colors.textSoft} />
          </Pressable>
        )}
      </View>

      {/* Live Suggestions Overlay Dropdown */}
      {showSuggestions && (
        <View style={styles.suggestionsBox}>
          {suggestions.length > 0 ? (
            <>
              <View style={styles.suggestionsHeader}>
                <Text style={styles.suggestionsTitle}>Suggested Products</Text>
              </View>
              {suggestions.map((p) => (
                <Pressable
                  key={p.id}
                  style={styles.suggestionRow}
                  onPress={() => handleSelectSuggestion(p)}
                >
                  <Image source={{ uri: p.image }} style={styles.suggestionImage} />
                  <View style={styles.suggestionInfo}>
                    <Text style={styles.suggestionName} numberOfLines={1}>
                      {p.name}
                    </Text>
                    <Text style={styles.suggestionMeta}>
                      ₹{p.price} <Text style={styles.suggestionUnit}>{p.unit}</Text> · {p.category}
                    </Text>
                  </View>
                  <ArrowUpRight size={14} color={colors.primary} />
                </Pressable>
              ))}
              <Pressable style={styles.viewAllRow} onPress={handleSubmit}>
                <Text style={styles.viewAllText}>
                  View all results for "{searchValue}"
                </Text>
              </Pressable>
            </>
          ) : (
            <Pressable style={styles.viewAllRow} onPress={handleSubmit}>
              <Text style={styles.viewAllText}>
                Search for "{searchValue}" in catalogue →
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
    zIndex: 999,
  },
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
    height: 46,
    borderRadius: 23,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchBarFocused: {
    borderColor: colors.primary,
    backgroundColor: "#FFFFFF",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 13.5,
    fontWeight: "500",
    padding: 0,
  },
  suggestionsBox: {
    position: "absolute",
    top: 102,
    left: 16,
    right: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    overflow: "hidden",
    zIndex: 1000,
  },
  suggestionsHeader: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  suggestionsTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.textSoft,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  suggestionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F9FAFB",
  },
  suggestionImage: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },
  suggestionInfo: {
    flex: 1,
  },
  suggestionName: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 2,
  },
  suggestionMeta: {
    fontSize: 11.5,
    fontWeight: "600",
    color: colors.primary,
  },
  suggestionUnit: {
    fontSize: 10.5,
    color: colors.textSoft,
    fontWeight: "400",
  },
  viewAllRow: {
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F4FBF7",
  },
  viewAllText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: colors.primary,
  },
});
