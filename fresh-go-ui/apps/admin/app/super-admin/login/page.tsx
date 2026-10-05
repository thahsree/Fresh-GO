"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "../../lib/api";
import { ShieldCheck, ArrowRight, Phone, Lock, Sparkles, Eye, EyeOff } from "lucide-react";

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    const cleanNumber = phone.replace(/[\s-]/g, "");
    if (!cleanNumber) {
      setError("Please enter your Super Admin mobile number.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);
    try {
      const user = await api.loginSuperAdmin(cleanNumber, password);
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

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(ellipse at bottom, #11221F 0%, #061210 100%)",
        padding: "24px 20px",
        fontFamily: "'Manrope', sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "440px",
          background: "#0D221E",
          border: "1px solid #1E463F",
          borderRadius: "20px",
          boxShadow: "0 30px 80px rgba(0, 0, 0, 0.6), 0 0 30px rgba(46, 125, 91, 0.15)",
          padding: "38px 32px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Accent top border strip */}
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
        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "60px",
              height: "60px",
              borderRadius: "16px",
              background: "rgba(229, 98, 62, 0.15)",
              border: "1px solid rgba(229, 98, 62, 0.35)",
              color: "#E5623E",
              marginBottom: "14px",
            }}
          >
            <ShieldCheck size={30} />
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
              marginBottom: "8px",
            }}
          >
            RESTRICTED ACCESS · RBAC ENFORCED
          </div>
          <h1
            style={{
              fontFamily: "'Fraunces', serif",
              fontSize: "26px",
              fontWeight: 700,
              color: "#FFFFFF",
              marginBottom: "6px",
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

        {/* Login Form */}
        <form onSubmit={handleLogin} style={{ display: "grid", gap: "18px" }}>
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
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter mobile number"
                required
                style={{
                  width: "100%",
                  padding: "13px 14px 13px 44px",
                  borderRadius: "10px",
                  border: "1px solid #1F4D46",
                  background: "#081715",
                  color: "#FFFFFF",
                  fontSize: "14px",
                  fontFamily: "inherit",
                  fontWeight: 600,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

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
                Password
              </label>
            </div>
            <div style={{ position: "relative" }}>
              <Lock
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
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                style={{
                  width: "100%",
                  padding: "13px 44px 13px 44px",
                  borderRadius: "10px",
                  border: "1px solid #1F4D46",
                  background: "#081715",
                  color: "#FFFFFF",
                  fontSize: "14px",
                  fontFamily: "inherit",
                  fontWeight: 600,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  color: "#8B968F",
                  cursor: "pointer",
                  display: "grid",
                  placeItems: "center",
                  padding: "4px",
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
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
              marginTop: "4px",
            }}
          >
            {loading ? "Authenticating..." : "Sign In to Super Admin"}
            <ArrowRight size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
