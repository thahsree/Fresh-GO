import { colors } from "@fresh-food/design-tokens";
import {
  Clock,
  Headphones,
  MapPin,
  MessageCircle,
  Phone,
} from "lucide-react-native";
import React from "react";
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

type StoreOfflineViewProps = {
  customerAddress?: string;
  onOpenLocationPicker?: () => void;
  onOpenHelp?: () => void;
};

export function StoreOfflineView({
  onOpenLocationPicker,
  onOpenHelp,
}: StoreOfflineViewProps) {
  const handleCall = () => {
    Linking.openURL("tel:+918891230778").catch((err) => {
      console.warn("Could not open dialer:", err);
    });
  };

  const handleWhatsApp = () => {
    Linking.openURL("https://wa.me/918891230778").catch((err) => {
      console.warn("Could not open WhatsApp:", err);
    });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Main Status Card */}
      <View style={styles.card}>
        {/* Soft Glowing Icon */}
        <View style={styles.iconCircleOuter}>
          <View style={styles.iconCircleInner}>
            <Clock size={36} color="#BE4436" />
          </View>
        </View>

        {/* Operating Hours Pill */}
        <View style={styles.statusPill}>
          <View style={styles.statusDot} />
          <Text style={styles.statusPillText}>CLOSED FOR NOW</Text>
        </View>

        {/* Heading & Reassuring Subtitle */}
        <Text style={styles.title}>We're Closed for the Day</Text>
        <Text style={styles.subtitle}>
          We deliver daily during our working hours (8:00 AM – 8:00 PM). Orders are currently paused, but we'll be back online bright and early with today's fresh catch and farm-direct cuts!
        </Text>

        {/* Secondary Action: Change Location */}
        {onOpenLocationPicker && (
          <View style={styles.actionGroup}>
            <Pressable
              style={styles.secondaryBtn}
              onPress={onOpenLocationPicker}
              accessibilityRole="button"
            >
              <MapPin size={15} color={colors.primary} />
              <Text style={styles.secondaryBtnText}>Change Delivery Address</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* Customer Support Footer */}
      <View style={styles.supportCard}>
        <View style={styles.supportHeader}>
          <Headphones size={15} color={colors.primary} />
          <Text style={styles.supportTitle}>Need Help with an Order?</Text>
        </View>
        <Text style={styles.supportSub}>
          Our customer support team is available to assist with any active orders or inquiries.
        </Text>
        <View style={styles.supportActions}>
          <Pressable style={styles.supportPill} onPress={handleCall}>
            <Phone size={13} color={colors.primary} />
            <Text style={styles.supportPillText}>Call Support</Text>
          </Pressable>
          <Pressable style={styles.supportPill} onPress={handleWhatsApp}>
            <MessageCircle size={13} color="#25D366" />
            <Text style={styles.supportPillText}>WhatsApp</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 40,
    alignItems: "center",
  },
  card: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  iconCircleOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#FBE7E3",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  iconCircleInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#F6D2CA",
    alignItems: "center",
    justifyContent: "center",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FBE7E3",
    borderColor: "#F4C4BC",
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 14,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#BE4436",
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#BE4436",
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 21,
    fontWeight: "800",
    color: colors.primaryDark,
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 13.5,
    lineHeight: 20,
    color: colors.textMuted,
    textAlign: "center",
    paddingHorizontal: 4,
    marginBottom: 20,
  },
  actionGroup: {
    width: "100%",
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    borderRadius: 12,
  },
  secondaryBtnText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "700",
  },
  supportCard: {
    width: "100%",
    marginTop: 18,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  supportHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  supportTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primaryDark,
  },
  supportSub: {
    fontSize: 11.5,
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: 12,
    lineHeight: 16,
  },
  supportActions: {
    flexDirection: "row",
    gap: 12,
  },
  supportPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  supportPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text,
  },
});
