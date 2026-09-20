import { colors } from "@fresh-food/design-tokens";
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  Phone,
  Sparkles,
  User,
  X,
} from "lucide-react-native";
import React, { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { UserProfile } from "./ProfileView";

type AuthViewProps = {
  visible: boolean;
  onClose: () => void;
  onSuccess: (user: UserProfile) => void;
};

export function AuthView({ visible, onClose, onSuccess }: AuthViewProps) {
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [showPassword, setShowPassword] = useState(false);

  // Form states
  const [loginIdentifier, setLoginIdentifier] = useState("+91 98765 43210");
  const [loginPassword, setLoginPassword] = useState("freshgo123");

  const [signupName, setSignupName] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");

  const handleLogin = () => {
    onSuccess({
      name: "Thashreef R.",
      phone: loginIdentifier.includes("@") ? "+91 98765 43210" : loginIdentifier,
      email: loginIdentifier.includes("@") ? loginIdentifier : "thashreef@freshgo.in",
      isLoggedIn: true,
    });
    onClose();
  };

  const handleSignup = () => {
    onSuccess({
      name: signupName.trim() || "Thashreef R.",
      phone: signupPhone.trim() || "+91 98765 43210",
      email: signupEmail.trim() || "thashreef@freshgo.in",
      isLoggedIn: true,
    });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoRow}>
              <View style={styles.logoBadge}>
                <Sparkles size={16} color="#FFFFFF" />
              </View>
              <Text style={styles.logoText}>FreshGo</Text>
            </View>
            <Pressable
              style={styles.closeBtn}
              onPress={onClose}
              accessibilityRole="button"
            >
              <X size={18} color={colors.primaryDark} />
            </Pressable>
          </View>

          {/* Tab Switcher */}
          <View style={styles.tabSwitcher}>
            <Pressable
              style={[styles.tabBtn, tab === "login" && styles.tabBtnActive]}
              onPress={() => setTab("login")}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  tab === "login" && styles.tabBtnTextActive,
                ]}
              >
                Log In
              </Text>
            </Pressable>

            <Pressable
              style={[styles.tabBtn, tab === "signup" && styles.tabBtnActive]}
              onPress={() => setTab("signup")}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  tab === "signup" && styles.tabBtnTextActive,
                ]}
              >
                Sign Up
              </Text>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {tab === "login" ? (
              /* LOGIN FORM */
              <View style={styles.form}>
                <Text style={styles.formTitle}>Welcome Back!</Text>
                <Text style={styles.formSubtitle}>
                  Enter your phone number or email to access your fresh basket.
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Phone or Email</Text>
                  <View style={styles.inputWrapper}>
                    <Mail size={16} color={colors.textSoft} />
                    <TextInput
                      value={loginIdentifier}
                      onChangeText={setLoginIdentifier}
                      placeholder="e.g. +91 98765 43210"
                      style={styles.input}
                      placeholderTextColor={colors.textSoft}
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <View style={styles.passwordLabelRow}>
                    <Text style={styles.inputLabel}>Password</Text>
                    <Pressable>
                      <Text style={styles.forgotLink}>Forgot?</Text>
                    </Pressable>
                  </View>
                  <View style={styles.inputWrapper}>
                    <Lock size={16} color={colors.textSoft} />
                    <TextInput
                      value={loginPassword}
                      onChangeText={setLoginPassword}
                      placeholder="Enter password"
                      secureTextEntry={!showPassword}
                      style={styles.input}
                      placeholderTextColor={colors.textSoft}
                    />
                    <Pressable
                      onPress={() => setShowPassword((p) => !p)}
                      style={styles.eyeBtn}
                    >
                      {showPassword ? (
                        <EyeOff size={16} color={colors.textSoft} />
                      ) : (
                        <Eye size={16} color={colors.textSoft} />
                      )}
                    </Pressable>
                  </View>
                </View>

                <Pressable
                  style={styles.submitBtn}
                  onPress={handleLogin}
                  accessibilityRole="button"
                >
                  <Text style={styles.submitBtnText}>Log In to FreshGo</Text>
                </Pressable>

                <View style={styles.switchRow}>
                  <Text style={styles.switchText}>Don't have an account?</Text>
                  <Pressable onPress={() => setTab("signup")}>
                    <Text style={styles.switchLink}> Sign Up</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              /* SIGNUP FORM */
              <View style={styles.form}>
                <Text style={styles.formTitle}>Create Account</Text>
                <Text style={styles.formSubtitle}>
                  Join FreshGo for daily fresh catch & farm-direct meats.
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Full Name</Text>
                  <View style={styles.inputWrapper}>
                    <User size={16} color={colors.textSoft} />
                    <TextInput
                      value={signupName}
                      onChangeText={setSignupName}
                      placeholder="e.g. Thashreef R."
                      style={styles.input}
                      placeholderTextColor={colors.textSoft}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Mobile Number</Text>
                  <View style={styles.inputWrapper}>
                    <Phone size={16} color={colors.textSoft} />
                    <TextInput
                      value={signupPhone}
                      onChangeText={setSignupPhone}
                      placeholder="+91 98765 43210"
                      keyboardType="phone-pad"
                      style={styles.input}
                      placeholderTextColor={colors.textSoft}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email Address</Text>
                  <View style={styles.inputWrapper}>
                    <Mail size={16} color={colors.textSoft} />
                    <TextInput
                      value={signupEmail}
                      onChangeText={setSignupEmail}
                      placeholder="name@example.com"
                      keyboardType="email-address"
                      style={styles.input}
                      placeholderTextColor={colors.textSoft}
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Password</Text>
                  <View style={styles.inputWrapper}>
                    <Lock size={16} color={colors.textSoft} />
                    <TextInput
                      value={signupPassword}
                      onChangeText={setSignupPassword}
                      placeholder="Create a strong password"
                      secureTextEntry={!showPassword}
                      style={styles.input}
                      placeholderTextColor={colors.textSoft}
                    />
                    <Pressable
                      onPress={() => setShowPassword((p) => !p)}
                      style={styles.eyeBtn}
                    >
                      {showPassword ? (
                        <EyeOff size={16} color={colors.textSoft} />
                      ) : (
                        <Eye size={16} color={colors.textSoft} />
                      )}
                    </Pressable>
                  </View>
                </View>

                <Pressable
                  style={styles.submitBtn}
                  onPress={handleSignup}
                  accessibilityRole="button"
                >
                  <Text style={styles.submitBtnText}>Create Account</Text>
                </Pressable>

                <View style={styles.switchRow}>
                  <Text style={styles.switchText}>Already have an account?</Text>
                  <Pressable onPress={() => setTab("login")}>
                    <Text style={styles.switchLink}> Log In</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
    maxHeight: "90%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logoBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    color: colors.primaryDark,
    fontSize: 18,
    fontWeight: "800",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  tabSwitcher: {
    flexDirection: "row",
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
  },
  tabBtnActive: {
    backgroundColor: colors.surface,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  tabBtnText: {
    color: colors.textSoft,
    fontSize: 13,
    fontWeight: "700",
  },
  tabBtnTextActive: {
    color: colors.primaryDark,
  },
  form: {
    paddingBottom: 10,
  },
  formTitle: {
    color: colors.primaryDark,
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 4,
  },
  formSubtitle: {
    color: colors.textMuted,
    fontSize: 12.5,
    lineHeight: 18,
    marginBottom: 18,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
  },
  passwordLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  forgotLink: {
    color: colors.accent,
    fontSize: 11.5,
    fontWeight: "700",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
  },
  eyeBtn: {
    padding: 6,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 14,
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 6,
  },
  switchText: {
    color: colors.textMuted,
    fontSize: 12.5,
  },
  switchLink: {
    color: colors.accent,
    fontSize: 12.5,
    fontWeight: "800",
  },
});
