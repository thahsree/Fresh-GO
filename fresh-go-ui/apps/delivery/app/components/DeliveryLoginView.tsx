"use client";

import React, { useState } from "react";
import { Bike, CheckCircle2, ChevronRight, Lock, Phone, Sparkles } from "lucide-react";
import { deliveryApi, DeliveryUser } from "../lib/api";

type DeliveryLoginViewProps = {
  onLoginSuccess: (user: DeliveryUser) => void;
};

export function DeliveryLoginView({ onLoginSuccess }: DeliveryLoginViewProps) {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devHint, setDevHint] = useState<string | null>(null);

  const cleanPhone = (input: string) => {
    const digits = input.replace(/\D/g, "");
    if (digits.startsWith("91") && digits.length > 10) {
      return `+${digits}`;
    }
    return `+91${digits.slice(-10)}`;
  };

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    const formatted = cleanPhone(phone);
    if (formatted.length < 13) {
      setError("Please enter a valid 10-digit mobile number");
      return;
    }

    setIsLoading(true);
    try {
      const res = await deliveryApi.sendOtp(formatted);
      setStep("otp");
      if (res.devOtp) {
        setDevHint(`Dev hint: Use OTP ${res.devOtp}`);
        setOtp(res.devOtp);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to send OTP. Please check backend connection.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    if (otp.trim().length < 4) {
      setError("Please enter the 6-digit verification code");
      return;
    }

    const formatted = cleanPhone(phone);
    setIsLoading(true);
    try {
      const res = await deliveryApi.verifyOtp(formatted, otp.trim(), "Delivery Partner");
      onLoginSuccess(res.user);
    } catch (err: any) {
      setError(err?.message || "Invalid verification code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Brand Header */}
        <div style={styles.header}>
          <div style={styles.logoBadge}>
            <Bike size={28} color="#FFFFFF" />
          </div>
          <div style={{ textAlign: "center" }}>
            <span style={styles.brandTitle}>FreshGo Delivery</span>
            <span style={styles.brandSub}>Rider Partner Portal</span>
          </div>
        </div>

        {/* Form Body */}
        {step === "phone" ? (
          <form onSubmit={handleSendOtp} style={styles.form}>
            <div style={styles.titleWrap}>
              <h1 style={styles.title}>Partner Sign In</h1>
              <p style={styles.subtitle}>
                Enter your mobile number to access your assigned hub orders, dispatch requests, and daily earnings.
              </p>
            </div>

            {error && <div style={styles.errorBox}>{error}</div>}

            <div style={styles.inputGroup}>
              <label style={styles.label}>MOBILE NUMBER</label>
              <div style={styles.phoneInputWrap}>
                <span style={styles.phonePrefix}>+91</span>
                <input
                  type="tel"
                  style={styles.input}
                  placeholder="98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  maxLength={14}
                  autoFocus
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || phone.replace(/\D/g, "").length < 10}
              style={{
                ...styles.button,
                opacity: isLoading || phone.replace(/\D/g, "").length < 10 ? 0.6 : 1,
              }}
            >
              {isLoading ? "Sending OTP..." : "Get OTP Code"}
              <ChevronRight size={18} />
            </button>

            <div style={styles.infoBanner}>
              <Sparkles size={16} color="#1f4d46" />
              <span>Fast 1-tap OTP verification · Auto hub assignment</span>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} style={styles.form}>
            <div style={styles.titleWrap}>
              <h1 style={styles.title}>Enter Verification Code</h1>
              <p style={styles.subtitle}>
                We sent a 6-digit OTP code to <strong>{cleanPhone(phone)}</strong>
              </p>
            </div>

            {error && <div style={styles.errorBox}>{error}</div>}
            {devHint && <div style={styles.hintBox}>{devHint}</div>}

            <div style={styles.inputGroup}>
              <label style={styles.label}>6-DIGIT OTP</label>
              <div style={styles.otpInputWrap}>
                <Lock size={18} color="#8b968f" style={{ marginLeft: 12 }} />
                <input
                  type="text"
                  style={styles.input}
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  maxLength={6}
                  autoFocus
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || otp.trim().length < 4}
              style={{
                ...styles.button,
                opacity: isLoading || otp.trim().length < 4 ? 0.6 : 1,
              }}
            >
              {isLoading ? "Verifying..." : "Verify & Go Online"}
              <CheckCircle2 size={18} />
            </button>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
              <button
                type="button"
                onClick={() => {
                  setStep("phone");
                  setError(null);
                }}
                style={styles.textBtn}
              >
                Change mobile number
              </button>
              <button
                type="button"
                onClick={() => handleSendOtp()}
                style={styles.textBtn}
              >
                Resend OTP
              </button>
            </div>
          </form>
        )}

        <div style={styles.footer}>
          <span>FreshGo Cold-Chain Delivery Network · Kerala</span>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    background: "linear-gradient(135deg, #0f2e29 0%, #1f4d46 100%)",
    fontFamily: "'Manrope', sans-serif",
  },
  card: {
    width: "min(100%, 420px)",
    background: "#FFFFFF",
    borderRadius: "20px",
    boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
    overflow: "hidden",
  },
  header: {
    background: "#0f2e29",
    padding: "28px 24px 24px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "12px",
    color: "#FFFFFF",
  },
  logoBadge: {
    width: "56px",
    height: "56px",
    borderRadius: "16px",
    background: "linear-gradient(135deg, #1f4d46, #2e7d5b)",
    display: "grid",
    placeItems: "center",
    boxShadow: "0 6px 16px rgba(0,0,0,0.3)",
  },
  brandTitle: {
    display: "block",
    fontSize: "20px",
    fontWeight: 800,
    letterSpacing: "-0.02em",
  },
  brandSub: {
    display: "block",
    fontSize: "11px",
    color: "#aee7d1",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    marginTop: "2px",
    fontWeight: 700,
  },
  form: {
    padding: "28px 24px",
    display: "flex",
    flexDirection: "column",
    gap: "18px",
  },
  titleWrap: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  title: {
    margin: 0,
    fontSize: "20px",
    fontWeight: 800,
    color: "#17211e",
    letterSpacing: "-0.02em",
  },
  subtitle: {
    margin: 0,
    fontSize: "12px",
    lineHeight: "1.5",
    color: "#5c6b66",
  },
  errorBox: {
    padding: "10px 14px",
    background: "#fff5f3",
    border: "1px solid #fca5a5",
    borderRadius: "10px",
    color: "#be4436",
    fontSize: "12px",
    fontWeight: 600,
  },
  hintBox: {
    padding: "10px 14px",
    background: "#e3f1e9",
    border: "1px solid #a7d7c5",
    borderRadius: "10px",
    color: "#1f4d46",
    fontSize: "12px",
    fontWeight: 700,
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  label: {
    fontSize: "10px",
    fontWeight: 800,
    letterSpacing: "0.06em",
    color: "#5c6b66",
  },
  phoneInputWrap: {
    display: "flex",
    alignItems: "center",
    border: "1.5px solid #e3ddcf",
    borderRadius: "12px",
    overflow: "hidden",
    background: "#fcfbf9",
  },
  otpInputWrap: {
    display: "flex",
    alignItems: "center",
    border: "1.5px solid #e3ddcf",
    borderRadius: "12px",
    overflow: "hidden",
    background: "#fcfbf9",
  },
  phonePrefix: {
    padding: "0 14px",
    fontWeight: 800,
    fontSize: "14px",
    color: "#1f4d46",
    borderRight: "1px solid #e3ddcf",
    background: "#f6f2ea",
    lineHeight: "46px",
  },
  input: {
    flex: 1,
    border: "none",
    outline: "none",
    background: "transparent",
    padding: "12px 14px",
    fontSize: "15px",
    fontWeight: 700,
    color: "#17211e",
    fontFamily: "inherit",
  },
  button: {
    border: "none",
    borderRadius: "12px",
    background: "#1f4d46",
    color: "#FFFFFF",
    minHeight: "48px",
    padding: "0 18px",
    fontSize: "14px",
    fontWeight: 800,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(31,77,70,0.3)",
    transition: "transform 0.15s ease",
  },
  infoBanner: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 12px",
    borderRadius: "10px",
    background: "#f6f2ea",
    fontSize: "11px",
    fontWeight: 700,
    color: "#1f4d46",
  },
  textBtn: {
    border: "none",
    background: "transparent",
    color: "#1f4d46",
    fontSize: "11px",
    fontWeight: 700,
    cursor: "pointer",
    padding: "4px 0",
  },
  footer: {
    padding: "16px",
    textAlign: "center",
    borderTop: "1px solid #f6f2ea",
    background: "#faf8f4",
    fontSize: "10px",
    fontWeight: 700,
    color: "#8b968f",
  },
};
