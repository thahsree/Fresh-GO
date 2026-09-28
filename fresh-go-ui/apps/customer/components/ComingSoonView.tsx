import { colors } from "@fresh-food/design-tokens";
import {
  Bell,
  MapPin,
  CheckCircle2,
  Send,
  Navigation,
  Sparkles,
  ShieldCheck,
  Building,
  Search,
} from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { customerApi, ServiceabilityResult } from "../lib/api";

type ComingSoonViewProps = {
  serviceability: ServiceabilityResult;
  customerCoordinates: { lat: number; lng: number };
  onSwitchToDemoLocation: () => void;
  onRefreshLocation: () => void;
  onOpenLocationPicker?: () => void;
};

export function ComingSoonView({
  serviceability,
  customerCoordinates,
  onSwitchToDemoLocation,
  onRefreshLocation,
  onOpenLocationPicker,
}: ComingSoonViewProps) {
  const [phone, setPhone] = useState("+91");
  const [email, setEmail] = useState("");
  const [areaName, setAreaName] = useState("");
  const [consentGiven, setConsentGiven] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const nearestHubName =
    serviceability.nearestHub?.name ||
    serviceability.hub?.name ||
    "FreshGo Central Hub (Mavoor Road)";
  const distance = serviceability.nearestDistanceKm || 15;

  const handleSubmit = async () => {
    if (!phone || phone.trim() === "+91" || phone.trim().length < 10) {
      setErrorMsg("Please enter a valid mobile number.");
      return;
    }
    if (!consentGiven) {
      setErrorMsg("Please check the consent box to receive notifications.");
      return;
    }

    setErrorMsg(null);
    setSubmitting(true);
    try {
      await customerApi.notifyInterest({
        phone: phone.trim(),
        email: email.trim() || undefined,
        latitude: customerCoordinates.lat,
        longitude: customerCoordinates.lng,
        areaName: areaName.trim() || "Outside 10km Zone",
        consentGiven: true,
      });
      setSubmitted(true);
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to submit request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Icon Badge */}
      <View style={styles.iconCircle}>
        <MapPin size={38} color={colors.accent} />
      </View>

      {/* Main Title */}
      <Text style={styles.title}>Coming Soon to Your Location!</Text>
      <Text style={styles.subtitle}>
        FreshGo express 15-minute delivery is currently live within 10 km of our active hubs.
      </Text>

      {/* Distance Callout */}
      <View style={styles.distanceCard}>
        <View style={styles.hubHeader}>
          <Building size={16} color={colors.primary} />
          <Text style={styles.hubTitle}>Nearest Hub: {nearestHubName}</Text>
        </View>
        <Text style={styles.distanceText}>
          Your location is approximately{" "}
          <Text style={styles.highlightText}>{distance} km</Text> away (our express
          delivery radius is 10 km).
        </Text>
      </View>

      {/* Search Location Button */}
      {onOpenLocationPicker && (
        <Pressable
          style={styles.chooseLocationBtn}
          onPress={onOpenLocationPicker}
        >
          <Search size={16} color="#FFFFFF" />
          <Text style={styles.chooseLocationBtnText}>
            Search Different Delivery Location
          </Text>
        </Pressable>
      )}

      {/* Notification Consent Form Card */}
      <View style={styles.formCard}>
        <View style={styles.formHeader}>
          <Bell size={20} color={colors.primary} />
          <Text style={styles.formTitle}>Get Notified at Launch</Text>
        </View>
        <Text style={styles.formSubtitle}>
          Be the first to know when we expand express delivery to your doorstep.
        </Text>

        {submitted ? (
          <View style={styles.successBox}>
            <CheckCircle2 size={32} color={colors.primary} />
            <Text style={styles.successTitle}>You're on the Priority List!</Text>
            <Text style={styles.successDesc}>
              We will send you an exclusive launch promo code via SMS/WhatsApp as soon as we open in your area.
            </Text>
          </View>
        ) : (
          <View style={styles.form}>
            {errorMsg && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>MOBILE NUMBER *</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="+919876543210"
                keyboardType="phone-pad"
                placeholderTextColor={colors.textSoft}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>EMAIL (OPTIONAL)</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="name@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor={colors.textSoft}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>YOUR AREA / NEIGHBORHOOD</Text>
              <TextInput
                style={styles.input}
                value={areaName}
                onChangeText={setAreaName}
                placeholder="e.g. Kannur, Thalassery, Wayanad"
                placeholderTextColor={colors.textSoft}
              />
            </View>

            {/* Consent Checkbox */}
            <Pressable
              style={styles.consentRow}
              onPress={() => setConsentGiven(!consentGiven)}
            >
              <View
                style={[
                  styles.checkbox,
                  consentGiven && styles.checkboxActive,
                ]}
              >
                {consentGiven && <CheckCircle2 size={14} color="#FFFFFF" />}
              </View>
              <Text style={styles.consentText}>
                I give consent to FreshGo to notify me via SMS or WhatsApp when express delivery launches at my coordinates.
              </Text>
            </Pressable>

            {/* Submit Button */}
            <Pressable
              style={[styles.submitButton, submitting && { opacity: 0.7 }]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Text style={styles.submitButtonText}>Notify Me When Live</Text>
                  <Send size={16} color="#FFFFFF" />
                </>
              )}
            </Pressable>
          </View>
        )}
      </View>

      {/* Demo Switcher for Testing / Evaluation */}
      <View style={styles.demoCard}>
        <Text style={styles.demoTitle}>Developer / Evaluation Controls</Text>
        <Text style={styles.demoSubtitle}>
          Want to test the full catalog and ordering inside the 10km express zone?
        </Text>
        <Pressable
          style={styles.demoButton}
          onPress={onSwitchToDemoLocation}
        >
          <Sparkles size={16} color={colors.accent} />
          <Text style={styles.demoButtonText}>
            Switch to Kozhikode Central (Within 10km Hub)
          </Text>
        </Pressable>
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
    padding: 22,
    alignItems: "center",
    paddingBottom: 40,
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  title: {
    fontSize: 23,
    fontWeight: "800",
    color: colors.primaryDark,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
    maxWidth: 320,
  },
  distanceCard: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 18,
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
  distanceText: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },
  highlightText: {
    fontWeight: "800",
    color: colors.accent,
  },
  formCard: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  formHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.primaryDark,
  },
  formSubtitle: {
    fontSize: 12,
    color: colors.textSoft,
    marginBottom: 16,
  },
  form: {
    gap: 12,
  },
  inputGroup: {
    gap: 4,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.primary,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
  },
  consentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginTop: 6,
    marginBottom: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.textSoft,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  checkboxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  consentText: {
    flex: 1,
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 16,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 6,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  successBox: {
    alignItems: "center",
    paddingVertical: 20,
    gap: 10,
  },
  successTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.primary,
    textAlign: "center",
  },
  successDesc: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 18,
  },
  errorBox: {
    backgroundColor: "#FBE7E3",
    padding: 10,
    borderRadius: 8,
    marginBottom: 6,
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
    fontWeight: "600",
  },
  demoCard: {
    width: "100%",
    backgroundColor: colors.primaryTint,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#C5D8D3",
    padding: 16,
    alignItems: "center",
    gap: 6,
  },
  demoTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.primary,
    textTransform: "uppercase",
  },
  demoSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: 6,
  },
  demoButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  demoButtonText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "800",
  },
  chooseLocationBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    marginBottom: 18,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  chooseLocationBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
});
