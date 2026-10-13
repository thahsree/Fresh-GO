import { colors } from "@fresh-food/design-tokens";
import {
  Bell,
  Building,
  CheckCircle2,
  Clock,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Search,
  Send,
} from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { customerApi, ServiceabilityResult } from "../lib/api";

type ComingSoonViewProps = {
  serviceability?: ServiceabilityResult | null;
  customerCoordinates?: { lat: number; lng: number };
  customerAddress?: string;
  onSwitchToDemoLocation?: () => void;
  onRefreshLocation?: () => void;
  onOpenLocationPicker?: () => void;
  onExploreProducts?: () => void;
};

export function ComingSoonView({
  serviceability,
  customerCoordinates,
  customerAddress,
  onOpenLocationPicker,
}: ComingSoonViewProps) {
  const [phone, setPhone] = useState("+91");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const nearestHubName =
    serviceability?.nearestHub?.name ||
    serviceability?.hub?.name ||
    "FreshGo Central Hub (Mavoor Road)";
  const distance = serviceability?.nearestDistanceKm || 15;

  const handleSubmit = async () => {
    const cleanPhone = phone.trim();
    if (!cleanPhone || cleanPhone === "+91" || cleanPhone.replace(/\D/g, "").length < 10) {
      setErrorMsg("Please enter a valid 10-digit mobile number.");
      return;
    }

    setErrorMsg(null);
    setSubmitting(true);
    try {
      await customerApi.notifyInterest({
        phone: cleanPhone,
        latitude: customerCoordinates?.lat,
        longitude: customerCoordinates?.lng,
        areaName: customerAddress || "Outside Service Area",
        consentGiven: true,
      });
      setSubmitted(true);
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to submit request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

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

  const handleEmail = () => {
    Linking.openURL("mailto:Freshgo263@gmail.com").catch((err) => {
      console.warn("Could not open email client:", err);
    });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Icon Badge */}
      <View style={styles.iconCircle}>
        <MapPin size={34} color={colors.primary} />
      </View>

      {/* Main Title & Subtitle */}
      <Text style={styles.title}>Coming Soon to Your Location!</Text>
      <Text style={styles.subtitle}>
        FreshGo 15-minute express delivery is expanding rapidly. We currently deliver within 10 km of our active hubs.
      </Text>

      {/* Selected Location & Radius Info */}
      <View style={styles.locationCard}>
        <View style={styles.hubHeader}>
          <Building size={16} color={colors.primary} />
          <Text style={styles.hubTitle}>Nearest Hub: {nearestHubName}</Text>
        </View>
        <Text style={styles.locationText}>
          {customerAddress ? (
            <>
              Selected: <Text style={styles.boldText}>{customerAddress}</Text>
              {"\n"}
            </>
          ) : null}
          Your location is approximately{" "}
          <Text style={styles.highlightText}>{distance} km</Text> away (express delivery radius is 10 km).
        </Text>

        {/* Action Button */}
        {onOpenLocationPicker && (
          <Pressable
            style={styles.primaryActionBtn}
            onPress={onOpenLocationPicker}
          >
            <Search size={15} color="#FFFFFF" />
            <Text style={styles.primaryActionBtnText}>
              Choose Different Location
            </Text>
          </Pressable>
        )}
      </View>

      {/* Simple Notification Consent Form */}
      <View style={styles.formCard}>
        <View style={styles.formHeader}>
          <Bell size={18} color={colors.primary} />
          <Text style={styles.formTitle}>Get Notified at Launch</Text>
        </View>
        <Text style={styles.formSubtitle}>
          Enter your mobile number to get an instant WhatsApp / SMS alert and launch offer when delivery opens here.
        </Text>

        {submitted ? (
          <View style={styles.successBox}>
            <CheckCircle2 size={28} color={colors.primary} />
            <Text style={styles.successTitle}>You're on the Priority List!</Text>
            <Text style={styles.successDesc}>
              We will notify you via SMS & WhatsApp as soon as express delivery launches in your area.
            </Text>
          </View>
        ) : (
          <View style={styles.form}>
            {errorMsg && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            )}

            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="+918891230778"
                keyboardType="phone-pad"
                placeholderTextColor={colors.textSoft}
              />
              <Pressable
                style={[styles.submitButton, submitting && { opacity: 0.7 }]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Text style={styles.submitButtonText}>Notify Me</Text>
                    <Send size={14} color="#FFFFFF" />
                  </>
                )}
              </Pressable>
            </View>
          </View>
        )}
      </View>

      {/* Delivery Operations & Contact Details Card */}
      <View style={styles.infoCard}>
        <Text style={styles.infoCardTitle}>FreshGo Operations & Support</Text>

        {/* Operating Hours */}
        <View style={styles.infoRow}>
          <View style={styles.infoIconBg}>
            <Clock size={16} color={colors.primary} />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Delivery Operations</Text>
            <Text style={styles.infoValue}>Daily 8:00 AM – 8:00 PM</Text>
          </View>
        </View>

        {/* Address */}
        <View style={styles.infoRow}>
          <View style={styles.infoIconBg}>
            <Building size={16} color={colors.primary} />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Address</Text>
            <Text style={styles.infoValue}>FreshGo Miyappadavu, Kasaragod</Text>
          </View>
        </View>

        {/* Support Email */}
        <Pressable style={styles.infoRow} onPress={handleEmail}>
          <View style={styles.infoIconBg}>
            <Mail size={16} color={colors.primary} />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Support Email</Text>
            <Text style={[styles.infoValue, styles.linkText]}>Freshgo263@gmail.com</Text>
          </View>
        </Pressable>

        {/* Contact Buttons (Call & WhatsApp) */}
        <View style={styles.contactDivider} />
        <Text style={styles.contactHeaderLabel}>Contact Us (8891230778)</Text>

        <View style={styles.contactButtonGroup}>
          <Pressable style={styles.callButton} onPress={handleCall}>
            <Phone size={15} color="#FFFFFF" />
            <Text style={styles.callButtonText}>Call 8891230778</Text>
          </Pressable>

          <Pressable style={styles.whatsappButton} onPress={handleWhatsApp}>
            <MessageCircle size={15} color="#FFFFFF" />
            <Text style={styles.whatsappButtonText}>WhatsApp</Text>
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
    padding: 20,
    alignItems: "center",
    paddingBottom: 40,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.primaryDark,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 18,
    maxWidth: 320,
  },
  locationCard: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 16,
  },
  hubHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  hubTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
  },
  locationText: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 19,
    marginBottom: 14,
  },
  boldText: {
    fontWeight: "700",
    color: colors.text,
  },
  highlightText: {
    fontWeight: "800",
    color: colors.accent,
  },
  primaryActionBtn: {
    width: "100%",
    backgroundColor: colors.primary,
    borderRadius: 9,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryActionBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  formCard: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  formHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  formTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.primaryDark,
  },
  formSubtitle: {
    fontSize: 12,
    color: colors.textSoft,
    marginBottom: 14,
    lineHeight: 17,
  },
  form: {
    gap: 10,
  },
  inputRow: {
    flexDirection: "row",
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  successBox: {
    alignItems: "center",
    paddingVertical: 14,
    gap: 6,
  },
  successTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.primary,
    textAlign: "center",
  },
  successDesc: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 17,
  },
  errorBox: {
    backgroundColor: "#FBE7E3",
    padding: 8,
    borderRadius: 6,
    marginBottom: 4,
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
    fontWeight: "600",
  },
  infoCard: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    marginBottom: 20,
    gap: 12,
  },
  infoCardTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.primaryDark,
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  infoIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryTint,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textSoft,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
    marginTop: 1,
  },
  linkText: {
    color: colors.primary,
    textDecorationLine: "underline",
  },
  contactDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginTop: 4,
    marginBottom: 2,
  },
  contactHeaderLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textMuted,
  },
  contactButtonGroup: {
    flexDirection: "row",
    gap: 10,
  },
  callButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  callButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  whatsappButton: {
    flex: 1,
    backgroundColor: "#25D366",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  whatsappButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
});
