import { colors } from "@fresh-food/design-tokens";
import {
  Briefcase,
  Check,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Edit3,
  Headphones,
  HelpCircle,
  Home,
  Lock,
  LogOut,
  MapPin,
  Package,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { customerApi, BackendAddress } from "../lib/api";
import { PrivacyPolicyModal } from "./PrivacyPolicyModal";

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
  currentAddress?: string;
  currentCoords?: { lat: number; lng: number };
  currentPincode?: string;
  onSelectDeliveryAddress?: (addr: BackendAddress) => void;
};

export function ProfileView({
  user,
  onOpenAuth,
  onLogout,
  onNavigateToOrders,
  onOpenHelp,
  currentAddress = "",
  currentCoords = { lat: 11.2588, lng: 75.7804 },
  currentPincode = "",
  onSelectDeliveryAddress,
}: ProfileViewProps) {
  // Address State
  const [addresses, setAddresses] = useState<BackendAddress[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<BackendAddress | null>(null);
  const [isSavingAddress, setIsSavingAddress] = useState(false);

  // Address Form State
  const [formTag, setFormTag] = useState<"Home" | "Work" | "Other">("Home");
  const [formTitle, setFormTitle] = useState("");
  const [formStreet, setFormStreet] = useState("");
  const [formLandmark, setFormLandmark] = useState("");
  const [formArea, setFormArea] = useState("");
  const [formCity, setFormCity] = useState("Kozhikode");
  const [formPincode, setFormPincode] = useState("673004");
  const [formIsDefault, setFormIsDefault] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Privacy Policy Modal
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);

  // Fetch real saved addresses from backend when logged in
  const loadAddresses = async () => {
    if (!user.isLoggedIn) {
      setAddresses([]);
      return;
    }

    setIsLoadingAddresses(true);
    try {
      const live = await customerApi.getAddresses();
      if (Array.isArray(live)) {
        setAddresses(live);
      } else {
        setAddresses([]);
      }
    } catch {
      setAddresses([]);
    } finally {
      setIsLoadingAddresses(false);
    }
  };

  useEffect(() => {
    loadAddresses();
  }, [user.isLoggedIn]);

  // Open modal to Add Address
  const handleOpenAdd = () => {
    if (!user.isLoggedIn) {
      onOpenAuth();
      return;
    }
    setEditingAddress(null);
    setFormTag("Home");
    setFormTitle("Home");
    setFormStreet("");
    setFormLandmark("");
    setFormArea("");
    setFormCity("Kozhikode");
    setFormPincode("");
    setFormIsDefault(addresses.length === 0);
    setFormError(null);
    setIsAddressModalOpen(true);
  };

  // Open modal to Edit Address
  const handleOpenEdit = (addr: BackendAddress) => {
    setEditingAddress(addr);
    const tagMatch = ["Home", "Work", "Other"].includes(addr.title)
      ? (addr.title as "Home" | "Work" | "Other")
      : "Other";
    setFormTag(tagMatch);
    setFormTitle(addr.title);
    setFormStreet(addr.street);
    setFormLandmark(addr.landmark || "");
    setFormArea(addr.area);
    setFormCity(addr.city);
    setFormPincode(addr.pincode);
    setFormIsDefault(addr.isDefault);
    setFormError(null);
    setIsAddressModalOpen(true);
  };

  // Save (Create or Update) Address
  const handleSaveAddress = async () => {
    if (!formStreet.trim()) {
      setFormError("Please enter house number, building or street address");
      return;
    }
    if (!formArea.trim()) {
      setFormError("Please enter area or neighborhood");
      return;
    }
    if (!formCity.trim()) {
      setFormError("Please enter city");
      return;
    }

    setFormError(null);
    setIsSavingAddress(true);

    const payload = {
      title: formTag === "Other" && formTitle.trim() ? formTitle.trim() : formTag,
      street: formStreet.trim(),
      landmark: formLandmark.trim() || undefined,
      area: formArea.trim(),
      city: formCity.trim(),
      pincode: formPincode.trim() || "673004",
      latitude: editingAddress?.latitude || 11.2588,
      longitude: editingAddress?.longitude || 75.7804,
      isDefault: formIsDefault,
    };

    try {
      if (editingAddress) {
        await customerApi.updateAddress(editingAddress.id, payload);
      } else {
        await customerApi.addAddress(payload);
      }
      setIsAddressModalOpen(false);
      await loadAddresses();
    } catch (err: any) {
      setFormError(err?.message || "Failed to save address. Please try again.");
    } finally {
      setIsSavingAddress(false);
    }
  };

  // Delete Address
  const handleDeleteAddress = (id: string) => {
    const performDelete = async () => {
      try {
        await customerApi.deleteAddress(id);
        await loadAddresses();
      } catch (err: any) {
        Alert.alert("Error", err?.message || "Could not delete address");
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm("Are you sure you want to remove this saved delivery address?")) {
        performDelete();
      }
    } else {
      Alert.alert(
        "Delete Address",
        "Are you sure you want to remove this delivery address?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: performDelete },
        ]
      );
    }
  };

  // Set Address as Default
  const handleSetDefault = async (addr: BackendAddress) => {
    try {
      await customerApi.updateAddress(addr.id, { isDefault: true });
      await loadAddresses();
    } catch {
      // ignore
    }
  };

  const getTagIcon = (tag: string) => {
    if (tag.toLowerCase().includes("home")) return <Home size={15} color={colors.primary} />;
    if (tag.toLowerCase().includes("work") || tag.toLowerCase().includes("office"))
      return <Briefcase size={15} color={colors.primary} />;
    return <MapPin size={15} color={colors.primary} />;
  };

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
              Sign in to manage orders, doorstep addresses and 15-min delivery discounts.
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

      {/* Quick Actions Grid */}
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
          onPress={handleOpenAdd}
          accessibilityRole="button"
        >
          <View style={styles.quickIconBg}>
            <MapPin size={20} color={colors.primary} />
          </View>
          <Text style={styles.quickTitle}>Addresses</Text>
          <Text style={styles.quickSub}>{addresses.length} saved</Text>
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
          <Text style={styles.quickSub}>COD Only</Text>
        </Pressable>
      </View>

      {/* Saved Addresses Section with Add, Edit, and Delete Features */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <MapPin size={17} color={colors.primary} />
            <Text style={styles.sectionHeader}>Saved Delivery Addresses</Text>
          </View>
          <Pressable
            style={styles.addAddressHeaderBtn}
            onPress={handleOpenAdd}
            accessibilityRole="button"
          >
            <Plus size={13} color="#FFFFFF" />
            <Text style={styles.addAddressHeaderBtnText}>Add New</Text>
          </Pressable>
        </View>

        {isLoadingAddresses ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : addresses.length === 0 ? (
          <View style={styles.emptyAddressCard}>
            <MapPin size={28} color={colors.textSoft} />
            <Text style={styles.emptyAddressTitle}>No saved addresses yet</Text>
            <Text style={styles.emptyAddressSub}>
              {user.isLoggedIn
                ? "Add your home, office, or other delivery address for 1-tap checkout."
                : "Sign in to add and manage your delivery addresses for 1-tap checkout."}
            </Text>
            <Pressable style={styles.addFirstAddressBtn} onPress={handleOpenAdd}>
              <Plus size={14} color="#FFFFFF" />
              <Text style={styles.addFirstAddressBtnText}>
                {user.isLoggedIn ? "Add Delivery Address" : "Sign In to Add Address"}
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.addressList}>
            {addresses.map((item) => (
              <View key={item.id} style={styles.addressCard}>
                {/* Top Row: Tag & Default Badge */}
                <View style={styles.addressTopRow}>
                  <View style={styles.addressTagWrap}>
                    {getTagIcon(item.title)}
                    <Text style={styles.addressTitleText}>{item.title}</Text>
                  </View>
                  {item.isDefault && (
                    <View style={styles.defaultPill}>
                      <Check size={11} color="#2E7D5B" />
                      <Text style={styles.defaultPillText}>DEFAULT</Text>
                    </View>
                  )}
                </View>

                {/* Street & Area Details */}
                <Text style={styles.addressStreetText} numberOfLines={2}>
                  {item.street}
                </Text>
                <Text style={styles.addressSubText} numberOfLines={1}>
                  {[item.landmark, item.area, item.city, item.pincode]
                    .filter(Boolean)
                    .join(", ")}
                </Text>

                {/* Actions: Edit, Delete, Set Default */}
                <View style={styles.addressActionRow}>
                  {!item.isDefault && (
                    <Pressable
                      style={styles.actionBtnSecondary}
                      onPress={() => handleSetDefault(item)}
                    >
                      <CheckCircle2 size={13} color={colors.primary} />
                      <Text style={styles.actionBtnSecondaryText}>Set Default</Text>
                    </Pressable>
                  )}

                  <Pressable
                    style={styles.actionBtnSecondary}
                    onPress={() => handleOpenEdit(item)}
                  >
                    <Edit3 size={13} color={colors.primary} />
                    <Text style={styles.actionBtnSecondaryText}>Edit</Text>
                  </Pressable>

                  <Pressable
                    style={[styles.actionBtnSecondary, styles.actionBtnDelete]}
                    onPress={() => handleDeleteAddress(item.id)}
                  >
                    <Trash2 size={13} color="#BE4436" />
                    <Text style={[styles.actionBtnSecondaryText, { color: "#BE4436" }]}>
                      Delete
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}
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

          {/* Privacy Policy & Terms Link -> Opens dedicated Legal & Trust viewer */}
          <Pressable
            style={styles.menuRow}
            onPress={() => setIsPrivacyModalOpen(true)}
            accessibilityRole="button"
          >
            <View style={styles.menuLeft}>
              <Lock size={18} color={colors.primaryDark} />
              <View>
                <Text style={styles.menuText}>Privacy Policy & Terms</Text>
                <Text style={styles.menuSubText}>
                  FSSAI standards, refunds, cold-chain & data protection
                </Text>
              </View>
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
        <Text style={styles.copyrightText}>
          100% Quality Guaranteed · Fresh Catch & Farm Direct
        </Text>
      </View>

      {/* Add / Edit Address Form Modal */}
      <Modal
        visible={isAddressModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsAddressModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingAddress ? "Edit Delivery Address" : "Add New Address"}
              </Text>
              <Pressable
                style={styles.modalCloseBtn}
                onPress={() => setIsAddressModalOpen(false)}
              >
                <X size={18} color={colors.textMuted} />
              </Pressable>
            </View>

            <ScrollView
              style={{ maxHeight: 420 }}
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Tag Selector */}
              <Text style={styles.inputLabel}>SAVE AS</Text>
              <View style={styles.tagSelectorRow}>
                {(["Home", "Work", "Other"] as const).map((tag) => (
                  <Pressable
                    key={tag}
                    style={[styles.tagOption, formTag === tag && styles.tagOptionActive]}
                    onPress={() => setFormTag(tag)}
                  >
                    {tag === "Home" && (
                      <Home
                        size={14}
                        color={formTag === tag ? "#FFFFFF" : colors.primaryDark}
                      />
                    )}
                    {tag === "Work" && (
                      <Briefcase
                        size={14}
                        color={formTag === tag ? "#FFFFFF" : colors.primaryDark}
                      />
                    )}
                    {tag === "Other" && (
                      <MapPin
                        size={14}
                        color={formTag === tag ? "#FFFFFF" : colors.primaryDark}
                      />
                    )}
                    <Text
                      style={[
                        styles.tagOptionText,
                        formTag === tag && styles.tagOptionTextActive,
                      ]}
                    >
                      {tag}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {formTag === "Other" && (
                <View style={styles.fieldWrap}>
                  <Text style={styles.inputLabel}>CUSTOM LABEL</Text>
                  <TextInput
                    style={styles.input}
                    value={formTitle}
                    onChangeText={setFormTitle}
                    placeholder="e.g. Grandma's House, Farm Villa"
                    placeholderTextColor={colors.textSoft}
                  />
                </View>
              )}

              {/* Street / Building Address */}
              <View style={styles.fieldWrap}>
                <Text style={styles.inputLabel}>HOUSE / FLAT / BUILDING / STREET *</Text>
                <TextInput
                  style={[styles.input, { minHeight: 46 }]}
                  value={formStreet}
                  onChangeText={setFormStreet}
                  placeholder="e.g. Flat 402, Skyline Oasis, Mavoor Road"
                  placeholderTextColor={colors.textSoft}
                  multiline
                />
              </View>

              {/* Landmark */}
              <View style={styles.fieldWrap}>
                <Text style={styles.inputLabel}>LANDMARK (OPTIONAL)</Text>
                <TextInput
                  style={styles.input}
                  value={formLandmark}
                  onChangeText={setFormLandmark}
                  placeholder="e.g. Near Star Hospital, Opposite Bus Stand"
                  placeholderTextColor={colors.textSoft}
                />
              </View>

              {/* Area & City Row */}
              <View style={styles.fieldRow}>
                <View style={[styles.fieldWrap, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>AREA / LOCALITY *</Text>
                  <TextInput
                    style={styles.input}
                    value={formArea}
                    onChangeText={setFormArea}
                    placeholder="e.g. Palayam"
                    placeholderTextColor={colors.textSoft}
                  />
                </View>
                <View style={[styles.fieldWrap, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>CITY *</Text>
                  <TextInput
                    style={styles.input}
                    value={formCity}
                    onChangeText={setFormCity}
                    placeholder="Kozhikode"
                    placeholderTextColor={colors.textSoft}
                  />
                </View>
              </View>

              {/* Pincode */}
              <View style={styles.fieldWrap}>
                <Text style={styles.inputLabel}>PINCODE</Text>
                <TextInput
                  style={styles.input}
                  value={formPincode}
                  onChangeText={setFormPincode}
                  placeholder="673004"
                  keyboardType="number-pad"
                  placeholderTextColor={colors.textSoft}
                />
              </View>

              {/* Default Address Toggle */}
              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchTitle}>Set as Default Delivery Address</Text>
                  <Text style={styles.switchSub}>
                    Used automatically for 15-minute express orders
                  </Text>
                </View>
                <Switch
                  value={formIsDefault}
                  onValueChange={setFormIsDefault}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {formError && <Text style={styles.errorText}>{formError}</Text>}
            </ScrollView>

            {/* Save Button */}
            <View style={styles.modalFooter}>
              <Pressable
                style={[styles.saveBtn, isSavingAddress && { opacity: 0.7 }]}
                onPress={handleSaveAddress}
                disabled={isSavingAddress}
              >
                {isSavingAddress ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <CheckCircle2 size={16} color="#FFFFFF" />
                    <Text style={styles.saveBtnText}>
                      {editingAddress ? "Update Address" : "Save Address"}
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Dedicated Legal & Trust Modal (Task 2) */}
      <PrivacyPolicyModal
        visible={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
      />
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
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionHeader: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: "800",
  },
  addAddressHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  addAddressHeaderBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  loaderWrap: {
    paddingVertical: 20,
    alignItems: "center",
  },
  emptyAddressCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    alignItems: "center",
    gap: 8,
  },
  emptyAddressTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  emptyAddressSub: {
    fontSize: 11.5,
    color: colors.textSoft,
    textAlign: "center",
    lineHeight: 16,
    paddingHorizontal: 12,
  },
  addFirstAddressBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 6,
  },
  addFirstAddressBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  addressList: {
    gap: 10,
  },
  addressCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 6,
  },
  addressTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  addressTagWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  addressTitleText: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.primaryDark,
  },
  defaultPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#E3F1E9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  defaultPillText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#2E7D5B",
  },
  addressStreetText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: colors.text,
    lineHeight: 17,
  },
  addressSubText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  addressActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionBtnSecondary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionBtnSecondaryText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primaryDark,
  },
  actionBtnDelete: {
    borderColor: "#F4C4BC",
    backgroundColor: "#FBE7E3",
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

  /* Modal Form Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 46, 41, 0.65)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 18,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    maxHeight: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.primaryDark,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  modalScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 16,
    gap: 12,
  },
  inputLabel: {
    fontSize: 9.5,
    fontWeight: "800",
    color: colors.primary,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  tagSelectorRow: {
    flexDirection: "row",
    gap: 10,
  },
  tagOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  tagOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tagOptionText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.text,
  },
  tagOptionTextActive: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  fieldWrap: {
    gap: 2,
  },
  fieldRow: {
    flexDirection: "row",
    gap: 10,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: colors.text,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 4,
  },
  switchTitle: {
    fontSize: 12.5,
    fontWeight: "700",
    color: colors.primaryDark,
  },
  switchSub: {
    fontSize: 10.5,
    color: colors.textSoft,
    marginTop: 1,
  },
  errorText: {
    fontSize: 11,
    color: colors.error,
    fontWeight: "700",
    marginTop: 4,
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
