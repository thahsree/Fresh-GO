import { colors, radius, spacing } from "@fresh-food/design-tokens";
import { AlertCircle, RefreshCw, WifiOff } from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { API_BASE } from "../lib/api";

type BackendConnectionErrorProps = {
  errorMessage?: string | null;
  onRetry: () => Promise<void> | void;
  onOpenHelp?: () => void;
};

export function BackendConnectionError({
  errorMessage,
  onRetry,
  onOpenHelp,
}: BackendConnectionErrorProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryNotice, setRetryNotice] = useState<string | null>(null);

  const handleRetry = async () => {
    setIsRetrying(true);
    setRetryNotice(null);
    try {
      await onRetry();
    } catch (err: any) {
      setRetryNotice(
        err?.message || "Server still unreachable. Please verify backend is running on port 4000."
      );
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Brand Header */}
      <View style={styles.brandRow}>
        <Image
          source={require("../assets/freshgologo.png")}
          style={styles.brandLogo}
          resizeMode="contain"
        />
        <View style={styles.statusPill}>
          <View style={styles.statusDot} />
          <Text style={styles.statusPillText}>STORE OFFLINE</Text>
        </View>
      </View>

      {/* Main Error Illustration & Card */}
      <View style={styles.mainCard}>
        {/* Glow Icon Backdrop */}
        <View style={styles.iconCircleOuter}>
          <View style={styles.iconCircleInner}>
            <WifiOff size={38} color={colors.primary} />
          </View>
        </View>

        <Text style={styles.title}>Unable to Connect to Store</Text>
        <Text style={styles.subtitle}>
          We couldn't reach the live FreshGo servers to load today's fresh
          catch, cuts, and categories.
        </Text>

        {/* Diagnostic Endpoint Information */}
        <View style={styles.infoBox}>
          <View style={styles.infoRow}>
            <AlertCircle size={16} color={colors.warning} />
            <Text style={styles.infoLabel}>Server Endpoint:</Text>
          </View>
          <Text style={styles.infoEndpoint} numberOfLines={2}>
            {API_BASE}
          </Text>
          {errorMessage ? (
            <Text style={styles.errorDetail}>
              Notice: {errorMessage}
            </Text>
          ) : null}
        </View>

        {/* Retry Failed Notice */}
        {retryNotice ? (
          <View style={styles.noticeBox}>
            <Text style={styles.noticeText}>{retryNotice}</Text>
          </View>
        ) : null}

        {/* Primary CTA: Retry Connection */}
        <Pressable
          style={[styles.retryButton, isRetrying && styles.retryButtonDisabled]}
          onPress={handleRetry}
          disabled={isRetrying}
          accessibilityRole="button"
        >
          {isRetrying ? (
            <>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.retryButtonText}>Connecting to Server...</Text>
            </>
          ) : (
            <>
              <RefreshCw size={18} color="#FFFFFF" />
              <Text style={styles.retryButtonText}>Retry Connection</Text>
            </>
          )}
        </Pressable>

        {/* Secondary: Help & Support */}
        {onOpenHelp ? (
          <Pressable
            style={styles.helpButton}
            onPress={onOpenHelp}
            accessibilityRole="button"
          >
            <Text style={styles.helpButtonText}>Need Help or Support?</Text>
          </Pressable>
        ) : null}
      </View>

      {/* Footer Info */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          FreshGo Hyperlocal Seafood & Meat Delivery
        </Text>
        <Text style={styles.footerSub}>
          Connects in real-time to your nearest dark store hub
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 20,
    paddingVertical: 24,
    justifyContent: "space-between",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
    marginTop: 8,
  },
  brandLogo: {
    width: 130,
    height: 38,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.warningTint,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    gap: 6,
    borderWidth: 1,
    borderColor: "#EAD7B8",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.warning,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.warning,
    letterSpacing: 0.5,
  },
  mainCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },
  iconCircleOuter: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primaryTint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  iconCircleInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1F4D46",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
    textAlign: "center",
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: 22,
    paddingHorizontal: 8,
  },
  infoBox: {
    width: "100%",
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.text,
  },
  infoEndpoint: {
    fontSize: 12,
    fontFamily: "monospace",
    color: colors.primary,
    fontWeight: "600",
    paddingLeft: 22,
  },
  errorDetail: {
    fontSize: 11,
    color: colors.error,
    marginTop: 6,
    paddingLeft: 22,
  },
  noticeBox: {
    width: "100%",
    backgroundColor: colors.errorTint,
    borderRadius: radius.sm,
    padding: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F4C4BD",
  },
  noticeText: {
    fontSize: 12,
    color: colors.error,
    textAlign: "center",
    fontWeight: "500",
  },
  retryButton: {
    width: "100%",
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  retryButtonDisabled: {
    opacity: 0.7,
  },
  retryButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  helpButton: {
    marginTop: 14,
    paddingVertical: 8,
  },
  helpButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primary,
  },
  footer: {
    alignItems: "center",
    marginTop: 24,
    marginBottom: 8,
  },
  footerText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSoft,
  },
  footerSub: {
    fontSize: 11,
    color: colors.textSoft,
    marginTop: 2,
  },
});
