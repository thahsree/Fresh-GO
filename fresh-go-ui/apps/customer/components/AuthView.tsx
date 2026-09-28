import { colors } from "@fresh-food/design-tokens";
import {
  ArrowLeft,
  CheckCircle2,
  Phone,
  RotateCw,
  ShieldCheck,
  Sparkles,
  User,
  X,
} from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { customerApi } from "../lib/api";
import { dispatchOrderNotification } from "../lib/notifications";
import type { UserProfile } from "./ProfileView";

type AuthViewProps = {
  visible: boolean;
  onClose: () => void;
  onSuccess: (user: UserProfile) => void;
};

export function AuthView({ visible, onClose, onSuccess }: AuthViewProps) {
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const [isMock, setIsMock] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [timer, setTimer] = useState(30);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setStep("phone");
      setErrorMessage("");
      setOtp("");
      setDevOtp("");
    }
  }, [visible]);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (step === "otp" && timer > 0) {
      timerRef.current = setTimeout(() => {
        setTimer((t) => t - 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [step, timer]);

  const handleSendOtp = async () => {
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length !== 10) {
      setErrorMessage("Please enter a valid 10-digit mobile number");
      return;
    }

    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setErrorMessage("Please enter a valid mobile number starting with 6, 7, 8, or 9");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const res = await customerApi.sendOtp(cleanPhone);
      const code = res.devOtp || (res.isMock ? "123456" : "");
      setDevOtp(code);
      setIsMock(Boolean(res.isMock));
      if (res.isMock && code) {
        setOtp(code);
      } else {
        setOtp("");
      }
      setStep("otp");
      setTimer(30);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to send OTP. Please check the number.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const cleanOtp = otp.trim();
    if (cleanOtp.length < 4) {
      setErrorMessage("Please enter the 6-digit verification code");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const res = await customerApi.verifyOtp(phone, cleanOtp, name);
      if (res.success && res.user) {
        onSuccess(res.user);
        dispatchOrderNotification({
          orderId: "LOGIN",
          status: "confirmed",
          title: "Welcome to FreshGo! 🌿",
          message: `Logged in as ${res.user.name} (${res.user.phone})`,
        });
        onClose();
      } else {
        setErrorMessage(res.error || "Invalid or expired verification code.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Invalid or expired verification code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (timer > 0) return;
    const cleanPhone = phone.replace(/\D/g, "");
    setIsLoading(true);
    setErrorMessage("");
    try {
      const res = await customerApi.sendOtp(cleanPhone);
      const code = res.devOtp || (res.isMock ? "123456" : "");
      setDevOtp(code);
      setIsMock(Boolean(res.isMock));
      if (res.isMock && code) setOtp(code);
      setTimer(30);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to resend code");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.overlay}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.container}>
          {/* Header with FreshGo Logo & Title */}
          <View style={styles.header}>
            <View style={styles.logoRow}>
              <Image
                source={require("../assets/FreshGologonew.png")}
                style={styles.logoImage}
                resizeMode="contain"
              />
              <View>
                <Text style={styles.logoText}>FreshGo</Text>
                <Text style={styles.logoTagline}>Fresh Catch & Direct Meats</Text>
              </View>
            </View>
            <Pressable
              style={styles.closeBtn}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <X size={18} color={colors.primaryDark} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {step === "phone" ? (
              /* STEP 1: MOBILE NUMBER */
              <View style={styles.content}>
                <View style={styles.titleSection}>
                  <Text style={styles.mainTitle}>Enter Mobile Number</Text>
                  <Text style={styles.subtitle}>
                    We will send a 6-digit one-time verification code to verify your account.
                  </Text>
                </View>

                {/* Mobile Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Mobile Number</Text>
                  <View style={styles.phoneInputWrapper}>
                    <View style={styles.countryCodeBadge}>
                      <Text style={styles.flagText}>🇮🇳</Text>
                      <Text style={styles.countryCodeText}>+91</Text>
                    </View>
                    <TextInput
                      value={phone}
                      onChangeText={(val) => {
                        const clean = val.replace(/\D/g, "").slice(0, 10);
                        setPhone(clean);
                        if (errorMessage) setErrorMessage("");
                      }}
                      placeholder="Enter 10-digit number"
                      keyboardType="phone-pad"
                      maxLength={10}
                      style={styles.phoneInput}
                      placeholderTextColor={colors.textSoft}
                      autoFocus
                    />
                  </View>
                </View>

                {/* Name Input (Optional) */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Your Name (Optional)</Text>
                  <View style={styles.textInputWrapper}>
                    <User size={16} color={colors.textSoft} />
                    <TextInput
                      value={name}
                      onChangeText={setName}
                      placeholder="e.g. Rahul Sharma"
                      style={styles.textInput}
                      placeholderTextColor={colors.textSoft}
                    />
                  </View>
                </View>

                {/* Error message */}
                {!!errorMessage && (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  </View>
                )}

                {/* Submit button */}
                <Pressable
                  style={[
                    styles.primaryBtn,
                    (isLoading || phone.replace(/\D/g, "").length !== 10) &&
                      styles.disabledBtn,
                  ]}
                  onPress={handleSendOtp}
                  disabled={isLoading || phone.replace(/\D/g, "").length !== 10}
                  accessibilityRole="button"
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Get OTP Code</Text>
                  )}
                </Pressable>

                {/* Trust info */}
                <View style={styles.trustBadge}>
                  <ShieldCheck size={14} color={colors.primary} />
                  <Text style={styles.trustText}>
                    100% Secure · Instant OTP Verification · No passwords
                  </Text>
                </View>

                {/* Dev hint badge */}
                <View style={styles.devHintBox}>
                  <Sparkles size={13} color="#B45309" />
                  <Text style={styles.devHintText}>
                    Dev Mode Active: Test OTP <Text style={styles.devHintBold}>123456</Text> will be simulated & auto-filled on the next screen.
                  </Text>
                </View>
              </View>
            ) : (
              /* STEP 2: OTP VERIFICATION */
              <View style={styles.content}>
                <Pressable
                  style={styles.backRow}
                  onPress={() => {
                    setStep("phone");
                    setErrorMessage("");
                  }}
                >
                  <ArrowLeft size={16} color={colors.primary} />
                  <Text style={styles.backText}>Change Mobile Number</Text>
                </Pressable>

                <View style={styles.titleSection}>
                  <Text style={styles.mainTitle}>Enter Verification Code</Text>
                  <Text style={styles.subtitle}>
                    We have sent a 6-digit verification code to{" "}
                    <Text style={styles.phoneHighlight}>+91 {phone}</Text>
                  </Text>
                </View>

                {/* OTP Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>One-Time Password (OTP)</Text>
                  <View style={styles.otpInputWrapper}>
                    <TextInput
                      value={otp}
                      onChangeText={(val) => {
                        const clean = val.replace(/\D/g, "").slice(0, 6);
                        setOtp(clean);
                        if (errorMessage) setErrorMessage("");
                      }}
                      placeholder="• • • • • •"
                      keyboardType="number-pad"
                      maxLength={6}
                      style={styles.otpInput}
                      placeholderTextColor={colors.textSoft}
                      autoFocus
                    />
                  </View>
                </View>

                {/* Simulated Mode Banner or Dev Pill */}
                {isMock ? (
                  <View style={styles.mockBanner}>
                    <View style={styles.mockBannerTop}>
                      <Sparkles size={15} color="#B45309" />
                      <Text style={styles.mockBannerTitle}>Why didn't an SMS arrive on your phone?</Text>
                    </View>
                    <Text style={styles.mockBannerDesc}>
                      Physical carrier SMS requires an SMS Gateway (Fast2SMS / Twilio) API key in backend .env.
                      In this development mode, your code is simulated as <Text style={{ fontWeight: "800", color: "#92400E" }}>{devOtp || "123456"}</Text> and auto-filled below!
                    </Text>
                    <View style={styles.mockOtpRow}>
                      <View>
                        <Text style={styles.mockOtpLabel}>Development OTP</Text>
                        <Text style={styles.mockOtpNumber}>{devOtp || "123456"}</Text>
                      </View>
                      <Pressable
                        style={styles.autoFillBtn}
                        onPress={() => {
                          setOtp(devOtp || "123456");
                          setErrorMessage("");
                        }}
                      >
                        <CheckCircle2 size={13} color="#FFFFFF" />
                        <Text style={styles.autoFillBtnText}>Auto-filled</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  !!devOtp && (
                    <Pressable
                      style={styles.demoPill}
                      onPress={() => {
                        setOtp(devOtp);
                        setErrorMessage("");
                      }}
                    >
                      <CheckCircle2 size={13} color={colors.primary} />
                      <Text style={styles.demoPillText}>
                        Dev Code: {devOtp} (Tap to auto-fill)
                      </Text>
                    </Pressable>
                  )
                )}

                {/* Error message */}
                {!!errorMessage && (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  </View>
                )}

                {/* Verify button */}
                <Pressable
                  style={[
                    styles.primaryBtn,
                    (isLoading || otp.trim().length < 4) && styles.disabledBtn,
                  ]}
                  onPress={handleVerifyOtp}
                  disabled={isLoading || otp.trim().length < 4}
                  accessibilityRole="button"
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.primaryBtnText}>
                      {isMock && otp === (devOtp || "123456")
                        ? "Verify & Proceed (123456) →"
                        : "Verify & Proceed →"}
                    </Text>
                  )}
                </Pressable>

                {/* Resend OTP */}
                <View style={styles.resendRow}>
                  {timer > 0 ? (
                    <Text style={styles.resendTimerText}>
                      Resend OTP in <Text style={styles.timerBold}>{timer}s</Text>
                    </Text>
                  ) : (
                    <Pressable
                      style={styles.resendBtn}
                      onPress={handleResendOtp}
                      disabled={isLoading}
                    >
                      <RotateCw size={13} color={colors.accent} />
                      <Text style={styles.resendBtnText}>Resend OTP Code</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "flex-end",
  },
  backdrop: {
    flex: 1,
  },
  container: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
    maxHeight: "92%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logoImage: {
    width: 38,
    height: 38,
    borderRadius: 8,
  },
  logoText: {
    color: colors.primaryDark,
    fontSize: 19,
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  logoTagline: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "600",
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingBottom: 10,
  },
  titleSection: {
    marginBottom: 18,
  },
  mainTitle: {
    color: colors.primaryDark,
    fontSize: 21,
    fontWeight: "800",
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  phoneHighlight: {
    color: colors.primaryDark,
    fontWeight: "700",
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    color: colors.primaryDark,
    fontSize: 12.5,
    fontWeight: "700",
    marginBottom: 7,
  },
  phoneInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    height: 52,
    overflow: "hidden",
  },
  countryCodeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    height: "100%",
    backgroundColor: colors.surface,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  flagText: {
    fontSize: 16,
  },
  countryCodeText: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: "800",
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 14,
    fontSize: 16,
    fontWeight: "700",
    color: colors.primaryDark,
    letterSpacing: 1,
  },
  textInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  otpInputWrapper: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 14,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  otpInput: {
    width: "100%",
    textAlign: "center",
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 12,
    color: colors.primaryDark,
  },
  demoPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    backgroundColor: colors.surfaceAlt,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  demoPillText: {
    fontSize: 11.5,
    color: colors.primaryDark,
    fontWeight: "700",
  },
  mockBanner: {
    backgroundColor: "#FEF3C7",
    borderWidth: 1.5,
    borderColor: "#FCD34D",
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    gap: 6,
  },
  mockBannerTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  mockBannerTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#92400E",
  },
  mockBannerDesc: {
    fontSize: 11,
    color: "#78350F",
    lineHeight: 16,
  },
  mockOtpRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 4,
  },
  mockOtpLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#92400E",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  mockOtpNumber: {
    fontSize: 16,
    fontWeight: "900",
    color: "#92400E",
    letterSpacing: 3,
  },
  autoFillBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#1F4D46",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  autoFillBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  errorBox: {
    backgroundColor: "#FEE2E2",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  errorText: {
    color: "#DC2626",
    fontSize: 12,
    fontWeight: "600",
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    height: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  disabledBtn: {
    opacity: 0.7,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  trustBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingTop: 4,
    paddingBottom: 8,
  },
  trustText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "600",
  },
  devHintBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FCD34D",
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 10,
    marginTop: 4,
    marginBottom: 6,
  },
  devHintText: {
    flex: 1,
    fontSize: 11,
    color: "#92400E",
    lineHeight: 15,
  },
  devHintBold: {
    fontWeight: "900",
    color: "#78350F",
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 14,
    paddingVertical: 4,
  },
  backText: {
    color: colors.primary,
    fontSize: 12.5,
    fontWeight: "700",
  },
  resendRow: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 6,
    paddingBottom: 10,
  },
  resendTimerText: {
    color: colors.textMuted,
    fontSize: 12.5,
  },
  timerBold: {
    color: colors.primaryDark,
    fontWeight: "700",
  },
  resendBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  resendBtnText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "700",
  },
});
