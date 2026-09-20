import { colors } from "@fresh-food/design-tokens";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Clock,
  Headphones,
  Mail,
  MessageCircle,
  Phone,
  ShieldCheck,
  Sparkles,
} from "lucide-react-native";
import React, { useState } from "react";
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

type HelpSupportViewProps = {
  onBack: () => void;
};

type FAQItem = {
  question: string;
  answer: string;
  category: "delivery" | "freshness" | "orders" | "payment";
};

const FAQS: FAQItem[] = [
  {
    category: "delivery",
    question: "How fast will my order arrive?",
    answer:
      "We offer express 20–30 minute delivery for ready-stock items in major service zones. Standard scheduled slots (Morning 7 AM - 10 AM, Evening 4 PM - 8 PM) are also available during checkout.",
  },
  {
    category: "freshness",
    question: "How does FreshGo guarantee freshness?",
    answer:
      "All marine fish are line-caught early morning, transferred in temperature-monitored cold chains (0–4°C), and dressed only upon receiving your order. We never use formalin, ammonia, or chemical preservatives.",
  },
  {
    category: "freshness",
    question: "Are your meat and poultry Halal certified?",
    answer:
      "Yes, 100% of our chicken and mutton is sourced from certified partner farms and processed following strict Halal guidelines by trained personnel.",
  },
  {
    category: "orders",
    question: "What if I receive a damaged or unsatisfactory item?",
    answer:
      "We offer a 100% Freshness Guarantee. If any item does not meet your expectations, notify us within 2 hours of delivery via the app or support line for an immediate replacement or full refund.",
  },
  {
    category: "orders",
    question: "Can I customize the cut of my fish or meat?",
    answer:
      "Absolutely! When viewing any product, you can select your preferred cut (e.g. Curry Cut, Biryani Cut, Steaks, or Cleaned Whole) before adding it to your cart.",
  },
  {
    category: "payment",
    question: "What payment methods are supported?",
    answer:
      "We accept Cash on Delivery (COD), UPI (Google Pay, PhonePe, Paytm), and major credit/debit cards at doorstep.",
  },
];

export function HelpSupportView({ onBack }: HelpSupportViewProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const filteredFaqs =
    activeCategory === "all"
      ? FAQS
      : FAQS.filter((faq) => faq.category === activeCategory);

  const handleCall = () => {
    Linking.openURL("tel:18002004567").catch(() => {});
  };

  const handleEmail = () => {
    Linking.openURL("mailto:support@freshgo.in").catch(() => {});
  };

  const handleWhatsApp = () => {
    Linking.openURL("https://wa.me/919876543210").catch(() => {});
  };

  return (
    <View style={styles.screen}>
      {/* Top Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.backBtn}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Back to Profile"
        >
          <ArrowLeft size={20} color={colors.primaryDark} />
        </Pressable>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Support Banner */}
        <View style={styles.banner}>
          <View style={styles.bannerIcon}>
            <Headphones size={24} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>We're here to help 24x7</Text>
            <Text style={styles.bannerSub}>
              Have questions about your delivery, cuts, or quality? Reach out to our dedicated support team.
            </Text>
          </View>
        </View>

        {/* Quick Contact Cards */}
        <Text style={styles.sectionTitle}>Contact Us Directly</Text>
        <View style={styles.contactGrid}>
          <Pressable
            style={styles.contactCard}
            onPress={handleCall}
            accessibilityRole="button"
          >
            <View style={[styles.contactIconBg, { backgroundColor: colors.primaryTint }]}>
              <Phone size={20} color={colors.primary} />
            </View>
            <Text style={styles.contactCardTitle}>Call Us</Text>
            <Text style={styles.contactCardSub}>Toll-Free 24x7</Text>
            <Text style={styles.contactAction}>1800-200-4567</Text>
          </Pressable>

          <Pressable
            style={styles.contactCard}
            onPress={handleWhatsApp}
            accessibilityRole="button"
          >
            <View style={[styles.contactIconBg, { backgroundColor: colors.successTint }]}>
              <MessageCircle size={20} color={colors.success} />
            </View>
            <Text style={styles.contactCardTitle}>WhatsApp</Text>
            <Text style={styles.contactCardSub}>Instant Chat</Text>
            <Text style={[styles.contactAction, { color: colors.success }]}>
              +91 98765 43210
            </Text>
          </Pressable>

          <Pressable
            style={styles.contactCard}
            onPress={handleEmail}
            accessibilityRole="button"
          >
            <View style={[styles.contactIconBg, { backgroundColor: colors.accentTint }]}>
              <Mail size={20} color={colors.accent} />
            </View>
            <Text style={styles.contactCardTitle}>Email</Text>
            <Text style={styles.contactCardSub}>Reply in 2 hours</Text>
            <Text style={[styles.contactAction, { color: colors.accent }]}>
              support@freshgo.in
            </Text>
          </Pressable>
        </View>

        {/* Freshness Assurance Card */}
        <View style={styles.assuranceCard}>
          <View style={styles.assuranceHeader}>
            <ShieldCheck size={20} color={colors.primary} />
            <Text style={styles.assuranceTitle}>100% Freshness Guarantee</Text>
          </View>
          <Text style={styles.assuranceText}>
            Every product is hand-inspected, temperature-tracked, and packed in eco-friendly insulated boxes. If you're not fully satisfied with the taste or freshness, we'll replace it instantly or refund your money.
          </Text>
        </View>

        {/* FAQ Category Filter */}
        <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {[
            { key: "all", label: "All Questions" },
            { key: "delivery", label: "Delivery" },
            { key: "freshness", label: "Freshness & Halal" },
            { key: "orders", label: "Cancellations & Returns" },
            { key: "payment", label: "Payments" },
          ].map(({ key, label }) => {
            const isActive = activeCategory === key;
            return (
              <Pressable
                key={key}
                style={[
                  styles.filterChip,
                  isActive && styles.filterChipActive,
                ]}
                onPress={() => setActiveCategory(key)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isActive && styles.filterChipTextActive,
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* FAQ Accordion List */}
        <View style={styles.faqList}>
          {filteredFaqs.map((faq, index) => {
            const isExpanded = expandedIndex === index;
            return (
              <Pressable
                key={index}
                style={styles.faqItem}
                onPress={() => setExpandedIndex(isExpanded ? null : index)}
                accessibilityRole="button"
              >
                <View style={styles.faqHeader}>
                  <Text style={styles.faqQuestion}>{faq.question}</Text>
                  {isExpanded ? (
                    <ChevronUp size={18} color={colors.primary} />
                  ) : (
                    <ChevronDown size={18} color={colors.textSoft} />
                  )}
                </View>
                {isExpanded && (
                  <Text style={styles.faqAnswer}>{faq.answer}</Text>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Operating Hours & Address */}
        <View style={styles.infoFooter}>
          <View style={styles.infoRow}>
            <Clock size={16} color={colors.textSoft} />
            <Text style={styles.infoText}>
              Delivery Operations: Daily 6:00 AM – 10:00 PM
            </Text>
          </View>
          <Text style={styles.infoSub}>
            FreshGo Technologies Pvt. Ltd. · Indira Nagar, Bengaluru
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: colors.primaryDark,
    fontSize: 17,
    fontWeight: "800",
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 32,
  },
  banner: {
    flexDirection: "row",
    backgroundColor: colors.primary,
    borderRadius: 18,
    padding: 18,
    gap: 14,
    alignItems: "center",
    marginBottom: 20,
  },
  bannerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  bannerTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 4,
  },
  bannerSub: {
    color: "rgba(255, 255, 255, 0.85)",
    fontSize: 12,
    lineHeight: 17,
  },
  sectionTitle: {
    color: colors.primaryDark,
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 12,
  },
  contactGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  contactCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    alignItems: "center",
  },
  contactIconBg: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  contactCardTitle: {
    color: colors.primaryDark,
    fontSize: 12.5,
    fontWeight: "700",
  },
  contactCardSub: {
    color: colors.textSoft,
    fontSize: 10,
    marginTop: 1,
    marginBottom: 6,
  },
  contactAction: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
  },
  assuranceCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 22,
    gap: 6,
  },
  assuranceHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  assuranceTitle: {
    color: colors.primaryDark,
    fontSize: 13.5,
    fontWeight: "800",
  },
  assuranceText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    color: colors.textSoft,
    fontSize: 11.5,
    fontWeight: "700",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  faqList: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  faqItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  faqHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  faqQuestion: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "700",
    flex: 1,
  },
  faqAnswer: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
  infoFooter: {
    alignItems: "center",
    paddingVertical: 12,
    gap: 4,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  infoText: {
    color: colors.textSoft,
    fontSize: 11.5,
    fontWeight: "600",
  },
  infoSub: {
    color: colors.textSoft,
    fontSize: 10.5,
  },
});
