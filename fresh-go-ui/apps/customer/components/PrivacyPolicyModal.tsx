import { colors } from "@fresh-food/design-tokens";
import {
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  Lock,
  RotateCcw,
  Scale,
  ShieldCheck,
  Truck,
  X,
} from "lucide-react-native";
import React, { useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

type PrivacyPolicyModalProps = {
  visible: boolean;
  onClose: () => void;
  initialTab?: "privacy" | "terms" | "refund";
};

export function PrivacyPolicyModal({
  visible,
  onClose,
  initialTab = "privacy",
}: PrivacyPolicyModalProps) {
  const [activeTab, setActiveTab] = useState<"privacy" | "terms" | "refund">(initialTab);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleWrap}>
              <ShieldCheck size={20} color={colors.primary} />
              <Text style={styles.headerTitle}>Legal & Customer Trust</Text>
            </View>
            <Pressable
              style={styles.closeBtn}
              onPress={onClose}
              accessibilityLabel="Close legal modal"
            >
              <X size={18} color={colors.textMuted} />
            </Pressable>
          </View>

          {/* Segmented Tab Switcher */}
          <View style={styles.tabBar}>
            <Pressable
              style={[styles.tabItem, activeTab === "privacy" && styles.tabItemActive]}
              onPress={() => setActiveTab("privacy")}
            >
              <Lock
                size={14}
                color={activeTab === "privacy" ? "#FFFFFF" : colors.textSoft}
              />
              <Text
                style={[
                  styles.tabItemText,
                  activeTab === "privacy" && styles.tabItemTextActive,
                ]}
              >
                Privacy Policy
              </Text>
            </Pressable>

            <Pressable
              style={[styles.tabItem, activeTab === "terms" && styles.tabItemActive]}
              onPress={() => setActiveTab("terms")}
            >
              <Scale
                size={14}
                color={activeTab === "terms" ? "#FFFFFF" : colors.textSoft}
              />
              <Text
                style={[
                  styles.tabItemText,
                  activeTab === "terms" && styles.tabItemTextActive,
                ]}
              >
                Terms of Use
              </Text>
            </Pressable>

            <Pressable
              style={[styles.tabItem, activeTab === "refund" && styles.tabItemActive]}
              onPress={() => setActiveTab("refund")}
            >
              <RotateCcw
                size={14}
                color={activeTab === "refund" ? "#FFFFFF" : colors.textSoft}
              />
              <Text
                style={[
                  styles.tabItemText,
                  activeTab === "refund" && styles.tabItemTextActive,
                ]}
              >
                Refund Policy
              </Text>
            </Pressable>
          </View>

          {/* Scrollable Content */}
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {activeTab === "privacy" && (
              <View style={styles.sectionBody}>
                <View style={styles.badgeRow}>
                  <Text style={styles.updateBadge}>Last Updated: September 2026</Text>
                  <Text style={styles.complianceBadge}>FSSAI & IT Act Compliant</Text>
                </View>

                <Text style={styles.introParagraph}>
                  At FreshGo, we value your trust above all else. This Privacy
                  Policy outlines how FreshGo ("we", "our", or "us") collects,
                  secures, and processes your personal data across our customer mobile
                  application and web storefront.
                </Text>

                <View style={styles.cardBlock}>
                  <Text style={styles.cardBlockTitle}>1. Information We Collect</Text>
                  <View style={styles.bulletItem}>
                    <CheckCircle2 size={15} color={colors.primary} />
                    <Text style={styles.bulletText}>
                      <Text style={styles.boldText}>Phone Number & Account Info: </Text>
                      Collected during passwordless OTP login to verify your identity and
                      prevent unauthorized order placement.
                    </Text>
                  </View>
                  <View style={styles.bulletItem}>
                    <CheckCircle2 size={15} color={colors.primary} />
                    <Text style={styles.bulletText}>
                      <Text style={styles.boldText}>Precise GPS & Doorstep Addresses: </Text>
                      Used exclusively to check 10km express delivery serviceability,
                      assign the nearest cold-chain fulfillment hub, and guide our
                      delivery partner directly to your gate.
                    </Text>
                  </View>
                  <View style={styles.bulletItem}>
                    <CheckCircle2 size={15} color={colors.primary} />
                    <Text style={styles.bulletText}>
                      <Text style={styles.boldText}>Order & Payment Details: </Text>
                      Cart items, custom cuts requested, and transaction references.
                      All UPI/card payments are encrypted and processed by RBI-licensed
                      gateways (Razorpay). FreshGo never stores card numbers or CVVs.
                    </Text>
                  </View>
                </View>

                <View style={styles.cardBlock}>
                  <Text style={styles.cardBlockTitle}>2. How Your Data Is Protected</Text>
                  <Text style={styles.cardBlockDesc}>
                    All communications between your mobile device and FreshGo servers
                    are secured using TLS 1.3 encryption. We maintain strict access
                    controls, and under NO circumstances do we sell, rent, or trade your
                    personal data to advertising brokers or third-party marketers.
                  </Text>
                </View>

                <View style={styles.cardBlock}>
                  <Text style={styles.cardBlockTitle}>3. Your Data Rights & Deletion</Text>
                  <Text style={styles.cardBlockDesc}>
                    You have the right to inspect, edit, or delete any saved delivery
                    addresses from your Profile at any time. To request complete
                    account deletion, contact our Grievance Officer at
                    privacy@freshgo.in.
                  </Text>
                </View>

                <View style={styles.cardBlock}>
                  <Text style={styles.cardBlockTitle}>4. Grievance Redressal</Text>
                  <Text style={styles.cardBlockDesc}>
                    FreshGo Technologies Pvt. Ltd.{"\n"}
                    Mavoor Road, Kozhikode, Kerala 673004{"\n"}
                    Email: support@freshgo.in · Phone: +91 70255 04042
                  </Text>
                </View>
              </View>
            )}

            {activeTab === "terms" && (
              <View style={styles.sectionBody}>
                <View style={styles.badgeRow}>
                  <Text style={styles.updateBadge}>Effective: September 2026</Text>
                  <Text style={styles.complianceBadge}>Terms & Service Level</Text>
                </View>

                <Text style={styles.introParagraph}>
                  By installing, browsing, or placing an order on the FreshGo Customer
                  App, you agree to these Terms of Service. Please read them
                  carefully before requesting express deliveries.
                </Text>

                <View style={styles.cardBlock}>
                  <Text style={styles.cardBlockTitle}>1. 15-Minute Express Delivery</Text>
                  <Text style={styles.cardBlockDesc}>
                    FreshGo operates hyper-local fulfillment hubs maintaining 0–4°C cold
                    chains. 15–20 minute delivery estimates apply to locations within the
                    official 10 km hub radius during regular operating hours (6:00 AM –
                    9:30 PM). Unforeseen weather, rain surges, or severe traffic may
                    extend transit times.
                  </Text>
                </View>

                <View style={styles.cardBlock}>
                  <Text style={styles.cardBlockTitle}>2. 100% Quality & Halal Certification</Text>
                  <Text style={styles.cardBlockDesc}>
                    • 100% Halal certified poultry and meat sourced from ethical partner farms.{"\n"}
                    • Marine fish are dressed fresh upon order confirmation; zero chemical
                    preservatives, formalin, or ammonia are ever used.{"\n"}
                    • Gross vs. Net weights: For whole fish, gross weight represents the
                    catch before descaling and cleaning. Net yield is clearly displayed
                    on every product page.
                  </Text>
                </View>

                <View style={styles.cardBlock}>
                  <Text style={styles.cardBlockTitle}>3. Pricing & Cash on Delivery</Text>
                  <Text style={styles.cardBlockDesc}>
                    Prices are transparent and inclusive of taxes. For Cash on Delivery
                    (COD) orders, exact cash or UPI QR payment to the delivery partner
                    is required upon doorstep arrival. FreshGo reserves the right to
                    suspend COD for accounts with repeat refusal of fresh perishable items.
                  </Text>
                </View>
              </View>
            )}

            {activeTab === "refund" && (
              <View style={styles.sectionBody}>
                <View style={styles.badgeRow}>
                  <Text style={styles.updateBadge}>Freshness Guarantee</Text>
                  <Text style={[styles.complianceBadge, { color: "#2E7D5B", borderColor: "#C4E2D2", backgroundColor: "#E3F1E9" }]}>
                    Zero Questions Asked
                  </Text>
                </View>

                <Text style={styles.introParagraph}>
                  Because our fish and meat are perishable items handled in strict
                  temperature-controlled environments, we stand firmly behind our
                  100% Quality Guarantee.
                </Text>

                <View style={styles.cardBlock}>
                  <Text style={styles.cardBlockTitle}>1. Doorstep Quality Assurance</Text>
                  <Text style={styles.cardBlockDesc}>
                    If any item delivered is damaged, has broken packaging, or fails to
                    meet your freshness standards, notify us within 2 hours of delivery
                    via WhatsApp, phone (+91 70255 04042), or Help & Support.
                  </Text>
                </View>

                <View style={styles.cardBlock}>
                  <Text style={styles.cardBlockTitle}>2. Fast Refunds & Replacements</Text>
                  <View style={styles.bulletItem}>
                    <CheckCircle2 size={15} color="#2E7D5B" />
                    <Text style={styles.bulletText}>
                      <Text style={styles.boldText}>Immediate Replacement: </Text>
                      A fresh pack is dispatched from the nearest hub within 20 minutes
                      at zero additional cost.
                    </Text>
                  </View>
                  <View style={styles.bulletItem}>
                    <CheckCircle2 size={15} color="#2E7D5B" />
                    <Text style={styles.bulletText}>
                      <Text style={styles.boldText}>UPI / Bank Refund: </Text>
                      Processed to your original payment method within 2–4 hours.
                    </Text>
                  </View>
                  <View style={styles.bulletItem}>
                    <CheckCircle2 size={15} color="#2E7D5B" />
                    <Text style={styles.bulletText}>
                      <Text style={styles.boldText}>COD Refund: </Text>
                      Instant refund issued to your UPI ID or FreshGo Wallet.
                    </Text>
                  </View>
                </View>

                <View style={styles.cardBlock}>
                  <Text style={styles.cardBlockTitle}>3. Order Cancellations</Text>
                  <Text style={styles.cardBlockDesc}>
                    You may cancel any order without penalty before the hub begins
                    cleaning and custom cutting (typically within 3 minutes of order
                    placement). Once cutting is underway, cancellation is not possible
                    due to the perishable nature of raw meats and seafood.
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Footer Action */}
          <View style={styles.footer}>
            <Pressable style={styles.doneBtn} onPress={onClose}>
              <Text style={styles.doneBtnText}>I Understand & Agree</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
    maxHeight: "88%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.primaryDark,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabItemActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabItemText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textSoft,
  },
  tabItemTextActive: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  scrollArea: {
    flexGrow: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  sectionBody: {
    gap: 14,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  updateBadge: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.primary,
    backgroundColor: colors.primaryTint,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  complianceBadge: {
    fontSize: 10,
    fontWeight: "700",
    color: "#1F4D46",
    backgroundColor: "#F2F8F5",
    borderWidth: 1,
    borderColor: "#C4E2D2",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  introParagraph: {
    fontSize: 12.5,
    color: colors.text,
    lineHeight: 18,
  },
  cardBlock: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  cardBlockTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.primaryDark,
  },
  cardBlockDesc: {
    fontSize: 12,
    color: colors.textSoft,
    lineHeight: 17,
  },
  bulletItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 2,
  },
  bulletText: {
    flex: 1,
    fontSize: 11.5,
    color: colors.text,
    lineHeight: 16,
  },
  boldText: {
    fontWeight: "800",
    color: colors.primaryDark,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  doneBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  doneBtnText: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
