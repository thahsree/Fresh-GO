"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "../../lib/api";
import { ShieldAlert, ArrowRight, Phone, KeyRound, Sparkles, Building2 } from "lucide-react";

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("+918888888888");
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
      const user = await api.loginSuperAdmin(phone, otp);
      if (user) {
        router.push("/super-admin");
      }
    } catch (err: any) {
      setError(
        err?.message ||
          "Authentication failed. Please verify that this account has SUPER_ADMIN privileges."
      );
    } finally {
      setLoading(false);
    }
  };

  const fillDefaultCredentials = () => {
    setPhone("+918888888888");
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
        background: "radial-gradient(ellipse at bottom, #11221F 0%, #061210 100%)",
        padding: "20px",
        fontFamily: "'Manrope', sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "460px",
          background: "#0D221E",
          border: "1px solid #1E463F",
          borderRadius: "20px",
          boxShadow: "0 30px 80px rgba(0, 0, 0, 0.6), 0 0 30px rgba(46, 125, 91, 0.15)",
          padding: "40px 36px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Top Gold/Emerald Bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "4px",
            background: "linear-gradient(90deg, #E5623E, #F2C94C, #2E7D5B)",
          }}
        />

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "64px",
              height: "64px",
              borderRadius: "16px",
              background: "rgba(229, 98, 62, 0.15)",
              border: "1px solid rgba(229, 98, 62, 0.35)",
              color: "#E5623E",
              marginBottom: "16px",
            }}
          >
            <ShieldAlert size={32} />
          </div>
          <div
            style={{
              display: "inline-block",
              padding: "4px 10px",
              borderRadius: "999px",
              background: "rgba(242, 201, 76, 0.15)",
              color: "#F2C94C",
              fontSize: "11px",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "1px",
              marginBottom: "10px",
            }}
          >
            RESTRICTED ACCESS · RBAC ENFORCED
          </div>
          <h1
            style={{
              fontFamily: "'Fraunces', serif",
              fontSize: "28px",
              fontWeight: 700,
              color: "#FFFFFF",
              marginBottom: "8px",
              letterSpacing: "-0.5px",
            }}
          >
            Super Admin Portal
          </h1>
          <p style={{ fontSize: "13px", color: "#8B968F", margin: 0 }}>
            Central Hub Operations & Global Sales Governance
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            style={{
              padding: "12px 14px",
              borderRadius: "8px",
              background: "rgba(190, 68, 54, 0.2)",
              border: "1px solid rgba(190, 68, 54, 0.4)",
              color: "#FF9B8F",
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
          <form onSubmit={handleSendOtp} style={{ display: "grid", gap: "18px" }}>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "11px",
                  fontWeight: 800,
                  color: "#B7C9C3",
                  marginBottom: "8px",
                  textTransform: "uppercase",
                  letterSpacing: "0.8px",
                }}
              >
                Super Admin Mobile Number
              </label>
              <div style={{ position: "relative" }}>
                <Phone
                  size={18}
                  style={{
                    position: "absolute",
                    left: "14px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#5C6B66",
                  }}
                />
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+918888888888"
                  required
                  style={{
                    width: "100%",
                    padding: "14px 14px 14px 44px",
                    borderRadius: "10px",
                    border: "1px solid #1F4D46",
                    background: "#081715",
                    color: "#FFFFFF",
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
                padding: "14px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #E5623E 0%, #C44522 100%)",
                color: "#FFFFFF",
                fontSize: "14px",
                fontWeight: 800,
                border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                boxShadow: "0 6px 18px rgba(229, 98, 62, 0.35)",
              }}
            >
              {loading ? "Authenticating..." : "Request Access OTP"}
              <ArrowRight size={16} />
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} style={{ display: "grid", gap: "18px" }}>
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "8px",
                }}
              >
                <label
                  style={{
                    fontSize: "11px",
                    fontWeight: 800,
                    color: "#B7C9C3",
                    textTransform: "uppercase",
                    letterSpacing: "0.8px",
                  }}
                >
                  Enter Verification Code
                </label>
                <button
                  type="button"
                  onClick={() => setStep("phone")}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#F2C94C",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  Edit Number
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
                    color: "#5C6B66",
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
                    padding: "14px 14px 14px 44px",
                    borderRadius: "10px",
                    border: "1px solid #1F4D46",
                    background: "#081715",
                    color: "#FFFFFF",
                    fontSize: "20px",
                    fontFamily: "monospace",
                    letterSpacing: "5px",
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
                padding: "14px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #2E7D5B 0%, #1F4D46 100%)",
                color: "#FFFFFF",
                fontSize: "14px",
                fontWeight: 800,
                border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                boxShadow: "0 6px 18px rgba(46, 125, 91, 0.35)",
              }}
            >
              {loading ? "Verifying Credentials..." : "Enter Super Admin Suite"}
              <ShieldAlert size={18} />
            </button>
          </form>
        )}

        {/* Dev Fast-fill */}
        <div
          style={{
            marginTop: "26px",
            padding: "14px",
            borderRadius: "10px",
            background: "rgba(255, 255, 255, 0.04)",
            border: "1px dashed rgba(255, 255, 255, 0.12)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              color: "#8B968F",
              marginBottom: "8px",
              fontWeight: 600,
            }}
          >
            Developer Mode Super Admin Login:
          </div>
          <button
            type="button"
            onClick={fillDefaultCredentials}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 14px",
              borderRadius: "6px",
              background: "rgba(242, 201, 76, 0.12)",
              border: "1px solid rgba(242, 201, 76, 0.25)",
              color: "#F2C94C",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <Sparkles size={14} />
            Autofill Super Admin (+918888888888)
          </button>
        </div>
      </div>
    </div>
  );
}
