import { colors } from "@fresh-food/design-tokens";
import {
  ChevronRight,
  CreditCard,
  Headphones,
  HelpCircle,
  Lock,
  LogOut,
  MapPin,
  Package,
  Sparkles,
} from "lucide-react-native";
import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export type UserProfile = {
  name: string;
  email?: string;
  phone: string;
  isLoggedIn: boolean;
};

type ProfileViewProps = {
  user: UserProfile;
  onOpenAuth: () => void;
  onLogout: () => void;
  onNavigateToOrders: () => void;
  onOpenHelp: () => void;
};

export function ProfileView({
  user,
  onOpenAuth,
  onLogout,
  onNavigateToOrders,
  onOpenHelp,
}: ProfileViewProps) {
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {/* Profile Header */}
      <View style={styles.headerCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user.isLoggedIn
              ? user.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()
              : "FG"}
          </Text>
        </View>

        {user.isLoggedIn ? (
          <View style={styles.userInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.userName}>{user.name}</Text>
              <View style={styles.memberBadge}>
                <Sparkles size={11} color={colors.accent} />
                <Text style={styles.memberBadgeText}>Club Member</Text>
              </View>
            </View>
            <Text style={styles.userPhone}>{user.phone}</Text>
            {!!user.email && <Text style={styles.userEmail}>{user.email}</Text>}
          </View>
        ) : (
          <View style={styles.userInfo}>
            <Text style={styles.userName}>Welcome to FreshGo</Text>
            <Text style={styles.userSub}>
              Sign in to manage orders, addresses and exclusive member pricing.
            </Text>
            <Pressable
              style={styles.signInBtn}
              onPress={onOpenAuth}
              accessibilityRole="button"
            >
              <Text style={styles.signInBtnText}>Log In or Sign Up</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.quickGrid}>
        <Pressable
          style={styles.quickCard}
          onPress={onNavigateToOrders}
          accessibilityRole="button"
        >
          <View style={styles.quickIconBg}>
            <Package size={20} color={colors.primary} />
          </View>
          <Text style={styles.quickTitle}>My Orders</Text>
          <Text style={styles.quickSub}>Track & reorder</Text>
        </Pressable>

        <Pressable
          style={styles.quickCard}
          onPress={() => {}}
          accessibilityRole="button"
        >
          <View style={styles.quickIconBg}>
            <MapPin size={20} color={colors.primary} />
          </View>
          <Text style={styles.quickTitle}>Addresses</Text>
          <Text style={styles.quickSub}>2 saved</Text>
        </Pressable>

        <Pressable
          style={styles.quickCard}
          onPress={() => {}}
          accessibilityRole="button"
        >
          <View style={styles.quickIconBg}>
            <CreditCard size={20} color={colors.primary} />
          </View>
          <Text style={styles.quickTitle}>Payments</Text>
          <Text style={styles.quickSub}>COD & UPI</Text>
        </Pressable>
      </View>

      {/* Saved Addresses */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Saved Addresses</Text>
        <View style={styles.addressList}>
          <View style={styles.addressItem}>
            <View style={styles.addressDot} />
            <View style={{ flex: 1 }}>
              <View style={styles.addressTitleRow}>
                <Text style={styles.addressTitle}>Home (Default)</Text>
              </View>
              <Text style={styles.addressDetails}>
                Palm Residency, Flat 402, 4th Cross Road, Indira Nagar
              </Text>
            </View>
          </View>

          <View style={styles.addressItem}>
            <View style={[styles.addressDot, { backgroundColor: colors.border }]} />
            <View style={{ flex: 1 }}>
              <View style={styles.addressTitleRow}>
                <Text style={styles.addressTitle}>Office</Text>
              </View>
              <Text style={styles.addressDetails}>
                Tech Park, Block B, 2nd Floor, Outer Ring Road
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Support & Legal */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Help & Support</Text>
        <View style={styles.menuCard}>
          <Pressable
            style={styles.menuRow}
            onPress={onOpenHelp}
            accessibilityRole="button"
          >
            <View style={styles.menuLeft}>
              <Headphones size={18} color={colors.primaryDark} />
              <View>
                <Text style={styles.menuText}>24x7 Customer Care</Text>
                <Text style={styles.menuSubText}>Call, WhatsApp & Instant Chat</Text>
              </View>
            </View>
            <ChevronRight size={16} color={colors.textSoft} />
          </Pressable>

          <View style={styles.divider} />

          <Pressable
            style={styles.menuRow}
            onPress={onOpenHelp}
            accessibilityRole="button"
          >
            <View style={styles.menuLeft}>
              <HelpCircle size={18} color={colors.primaryDark} />
              <View>
                <Text style={styles.menuText}>FAQs & Freshness Policy</Text>
                <Text style={styles.menuSubText}>Quality guarantees, delivery & refunds</Text>
              </View>
            </View>
            <ChevronRight size={16} color={colors.textSoft} />
          </Pressable>

          <View style={styles.divider} />

          <Pressable style={styles.menuRow} onPress={() => {}}>
            <View style={styles.menuLeft}>
              <Lock size={18} color={colors.primaryDark} />
              <Text style={styles.menuText}>Privacy Policy & Terms</Text>
            </View>
            <ChevronRight size={16} color={colors.textSoft} />
          </Pressable>
        </View>
      </View>

      {/* Log Out Button */}
      {user.isLoggedIn && (
        <Pressable
          style={styles.logoutBtn}
          onPress={onLogout}
          accessibilityRole="button"
        >
          <LogOut size={16} color={colors.error} />
          <Text style={styles.logoutBtnText}>Log Out</Text>
        </Pressable>
      )}

      {/* App Version Info */}
      <View style={styles.appInfo}>
        <Text style={styles.versionText}>FreshGo Mobile v1.0.0</Text>
        <Text style={styles.copyrightText}>100% Quality Guaranteed · Fresh Catch & Farm Direct</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 28,
  },
  headerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
    gap: 14,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
  },
  userInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  userName: {
    color: colors.primaryDark,
    fontSize: 16,
    fontWeight: "800",
  },
  memberBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: colors.accentTint,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  memberBadgeText: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: "800",
  },
  userPhone: {
    color: colors.text,
    fontSize: 12.5,
    fontWeight: "600",
    marginTop: 2,
  },
  userEmail: {
    color: colors.textSoft,
    fontSize: 11.5,
    marginTop: 1,
  },
  userSub: {
    color: colors.textMuted,
    fontSize: 11.5,
    lineHeight: 16,
    marginVertical: 4,
  },
  signInBtn: {
    alignSelf: "flex-start",
    backgroundColor: colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 4,
  },
  signInBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  quickGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
  },
  quickCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    alignItems: "center",
  },
  quickIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryTint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  quickTitle: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "700",
  },
  quickSub: {
    color: colors.textSoft,
    fontSize: 10,
    marginTop: 1,
  },
  section: {
    marginBottom: 18,
  },
  sectionHeader: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 10,
  },
  addressList: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 12,
  },
  addressItem: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  addressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
    marginTop: 5,
  },
  addressTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  addressTitle: {
    color: colors.primaryDark,
    fontSize: 12.5,
    fontWeight: "700",
  },
  addressDetails: {
    color: colors.textMuted,
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 2,
  },
  menuCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 13,
  },
  menuLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  menuText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
  menuSubText: {
    color: colors.textSoft,
    fontSize: 11,
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.errorTint,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 4,
    marginBottom: 16,
  },
  logoutBtnText: {
    color: colors.error,
    fontSize: 13,
    fontWeight: "800",
  },
  appInfo: {
    alignItems: "center",
    paddingVertical: 10,
    gap: 3,
  },
  versionText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "600",
  },
  copyrightText: {
    color: colors.textSoft,
    fontSize: 10,
  },
});
