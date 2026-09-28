"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "../lib/api";
import { ShieldCheck, MapPin, ArrowRight, Phone, KeyRound, Sparkles } from "lucide-react";

export default function HubAdminLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("+919999999999");
  const [otp, setOtp] = useState("123456");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.sendOtp(phone);
      setStep("otp");
    } catch (err: any) {
      setError(err?.message || "Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await api.loginHubAdmin(phone, otp);
      if (user) {
        router.push("/");
      }
    } catch (err: any) {
      setError(err?.message || "Invalid OTP or authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  const fillDefaultCredentials = () => {
    setPhone("+919999999999");
    setOtp("123456");
    setError(null);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(circle at 10% 20%, #153A34 0%, #0F2E29 90%)",
        padding: "20px",
        fontFamily: "'Manrope', sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "440px",
          background: "#FFFFFF",
          borderRadius: "18px",
          boxShadow: "0 25px 60px rgba(0, 0, 0, 0.35)",
          padding: "36px 32px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Top Accent Strip */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "5px",
            background: "linear-gradient(90deg, #1F4D46, #2E7D5B, #E5623E)",
          }}
        />

        {/* Header Branding */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "56px",
              height: "56px",
              borderRadius: "14px",
              background: "#E4ECE9",
              color: "#1F4D46",
              marginBottom: "14px",
            }}
          >
            <MapPin size={28} />
          </div>
          <h1
            style={{
              fontFamily: "'Fraunces', serif",
              fontSize: "26px",
              fontWeight: 700,
              color: "#0F2E29",
              marginBottom: "6px",
            }}
          >
            FreshGo Hub Admin
          </h1>
          <p style={{ fontSize: "13px", color: "#5C6B66", margin: 0 }}>
            Dispatch, Inventory & Orders Portal
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            style={{
              padding: "12px 14px",
              borderRadius: "8px",
              background: "#FBE7E3",
              color: "#BE4436",
              fontSize: "13px",
              fontWeight: 600,
              marginBottom: "20px",
            }}
          >
            {error}
          </div>
        )}

        {/* Form */}
        {step === "phone" ? (
          <form onSubmit={handleSendOtp} style={{ display: "grid", gap: "16px" }}>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#1F4D46",
                  marginBottom: "6px",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Phone Number
              </label>
              <div style={{ position: "relative" }}>
                <Phone
                  size={18}
                  style={{
                    position: "absolute",
                    left: "14px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#8B968F",
                  }}
                />
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+919999999999"
                  required
                  style={{
                    width: "100%",
                    padding: "13px 14px 13px 42px",
                    borderRadius: "10px",
                    border: "1px solid #E3DDCF",
                    fontSize: "14px",
                    fontFamily: "inherit",
                    fontWeight: 600,
                    outline: "none",
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                width: "100%",
                padding: "13px",
                borderRadius: "10px",
                background: "#1F4D46",
                color: "#FFFFFF",
                fontSize: "14px",
                fontWeight: 800,
                border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                boxShadow: "0 4px 12px rgba(31, 77, 70, 0.25)",
              }}
            >
              {loading ? "Sending OTP..." : "Continue with OTP"}
              <ArrowRight size={16} />
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} style={{ display: "grid", gap: "16px" }}>
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "6px",
                }}
              >
                <label
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#1F4D46",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Enter 6-Digit OTP
                </label>
                <button
                  type="button"
                  onClick={() => setStep("phone")}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#2E7D5B",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  Change Phone
                </button>
              </div>
              <div style={{ position: "relative" }}>
                <KeyRound
                  size={18}
                  style={{
                    position: "absolute",
                    left: "14px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#8B968F",
                  }}
                />
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="123456"
                  maxLength={6}
                  required
                  style={{
                    width: "100%",
                    padding: "13px 14px 13px 42px",
                    borderRadius: "10px",
                    border: "1px solid #E3DDCF",
                    fontSize: "18px",
                    fontFamily: "monospace",
                    letterSpacing: "4px",
                    fontWeight: 700,
                    outline: "none",
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                width: "100%",
                padding: "13px",
                borderRadius: "10px",
                background: "#1F4D46",
                color: "#FFFFFF",
                fontSize: "14px",
                fontWeight: 800,
                border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                boxShadow: "0 4px 12px rgba(31, 77, 70, 0.25)",
              }}
            >
              {loading ? "Verifying..." : "Sign In to Hub"}
              <ShieldCheck size={18} />
            </button>
          </form>
        )}

        {/* Demo Fast-fill Badge */}
        <div
          style={{
            marginTop: "24px",
            padding: "12px",
            borderRadius: "10px",
            background: "#F6F2EA",
            border: "1px dashed #E3DDCF",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              color: "#5C6B66",
              marginBottom: "8px",
              fontWeight: 600,
            }}
          >
            Developer Mode Fast Sign-In:
          </div>
          <button
            type="button"
            onClick={fillDefaultCredentials}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 12px",
              borderRadius: "6px",
              background: "#FFFFFF",
              border: "1px solid #E3DDCF",
              color: "#1F4D46",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <Sparkles size={14} color="#E5623E" />
            Fill Default Hub Admin (+919999999999)
          </button>
        </div>
      </div>
    </div>
  );
}
