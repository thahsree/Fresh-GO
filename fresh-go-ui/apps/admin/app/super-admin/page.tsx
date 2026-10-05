"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, AdminUser } from "../lib/api";
import { HubsManagementView } from "./components/HubsManagementView";
import { SalesReportView } from "./components/SalesReportView";
import { DeliveryPartnersView } from "../components/DeliveryPartnersView";
import {
  ShieldAlert,
  BarChart3,
  LogOut,
  Building,
  CheckCircle,
  AlertCircle,
  Info,
  Bike,
} from "lucide-react";

export default function SuperAdminDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"hubs" | "reports" | "delivery">("hubs");
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info" | "delete";
  } | null>(null);

  const showToast = (
    message: string,
    type: "success" | "error" | "info" | "delete" = "success"
  ) => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((cur) => (cur?.message === message ? null : cur));
    }, 4500);
  };

  useEffect(() => {
    const adminUser = api.getSuperAdminUser();
    if (!adminUser || adminUser.role !== "SUPER_ADMIN") {
      router.replace("/super-admin/login");
    } else {
      setUser(adminUser);
      setLoading(false);
    }
  }, [router]);

  const handleLogout = () => {
    api.clearSession();
    router.push("/super-admin/login");
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#0D221E",
          color: "#FFFFFF",
          fontFamily: "'Manrope', sans-serif",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              border: "3px solid #1F4D46",
              borderTopColor: "#E5623E",
              animation: "spin 1s linear infinite",
              margin: "0 auto 16px",
            }}
          />
          <p style={{ fontSize: "14px", color: "#B7C9C3", fontWeight: 600 }}>
            Verifying Super Admin Authorization...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F6F2EA",
        color: "#17211E",
        fontFamily: "'Manrope', sans-serif",
      }}
    >
      {/* Top Banner Header */}
      <header
        style={{
          background: "#0D221E",
          borderBottom: "1px solid #1E463F",
          padding: "16px 36px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          color: "#FFFFFF",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.25)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #E5623E, #C44522)",
              display: "grid",
              placeItems: "center",
              boxShadow: "0 4px 12px rgba(229, 98, 62, 0.35)",
            }}
          >
            <ShieldAlert size={22} color="#FFFFFF" />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  fontFamily: "'Fraunces', serif",
                  fontSize: "20px",
                  fontWeight: 700,
                  letterSpacing: "-0.3px",
                }}
              >
                FreshGo
              </span>
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 800,
                  background: "rgba(242, 201, 76, 0.18)",
                  color: "#F2C94C",
                  padding: "3px 8px",
                  borderRadius: "999px",
                  textTransform: "uppercase",
                  letterSpacing: "0.8px",
                }}
              >
                SUPER ADMIN
              </span>
            </div>
            <p style={{ fontSize: "11px", color: "#8B968F", margin: 0 }}>
              Central Hub Governance & Multi-Store Reporting
            </p>
          </div>
        </div>

        {/* Navigation Tabs in Topbar */}
        <div
          style={{
            display: "inline-flex",
            background: "#081715",
            borderRadius: "10px",
            padding: "4px",
            border: "1px solid #1F4D46",
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab("hubs")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 16px",
              borderRadius: "8px",
              border: "none",
              background: activeTab === "hubs" ? "#1F4D46" : "transparent",
              color: activeTab === "hubs" ? "#FFFFFF" : "#8B968F",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <Building size={16} />
            Hubs & Geo-Fences
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("reports")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 16px",
              borderRadius: "8px",
              border: "none",
              background: activeTab === "reports" ? "#1F4D46" : "transparent",
              color: activeTab === "reports" ? "#FFFFFF" : "#8B968F",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <BarChart3 size={16} />
            Sales Reports & Analytics
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("delivery")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 16px",
              borderRadius: "8px",
              border: "none",
              background: activeTab === "delivery" ? "#1F4D46" : "transparent",
              color: activeTab === "delivery" ? "#FFFFFF" : "#8B968F",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <Bike size={16} />
            Delivery Partners
          </button>
        </div>

        {/* Right Side Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {/* User Badge */}
          <div
            style={{
              background: "rgba(46, 125, 91, 0.15)",
              border: "1px solid rgba(46, 125, 91, 0.35)",
              padding: "6px 12px",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: 700,
              color: "#4AE39C",
            }}
          >
            {user?.name || "Super Admin"}
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            title="Log Out"
            style={{
              background: "transparent",
              border: "1px solid #1E463F",
              color: "#BE4436",
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ padding: "32px 36px", maxWidth: "1400px", margin: "0 auto" }}>
        {activeTab === "hubs" && <HubsManagementView onToast={showToast} />}
        {activeTab === "reports" && <SalesReportView onToast={showToast} />}
        {activeTab === "delivery" && (
          <DeliveryPartnersView currentUser={user} onToast={showToast} />
        )}
      </main>

      {/* Toast Notification Container */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: "28px",
            right: "28px",
            zIndex: 100000,
            background:
              toast.type === "error" || toast.type === "delete"
                ? "#BE4436"
                : toast.type === "info"
                ? "#1F4D46"
                : "#2E7D5B",
            color: "#FFFFFF",
            padding: "14px 20px",
            borderRadius: "12px",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.25)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "13px",
            fontWeight: 700,
            animation: "toastSlideInTop 0.25s ease-out",
          }}
        >
          {toast.type === "error" || toast.type === "delete" ? (
            <AlertCircle size={18} />
          ) : toast.type === "info" ? (
            <Info size={18} />
          ) : (
            <CheckCircle size={18} />
          )}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
