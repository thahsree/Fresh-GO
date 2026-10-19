"use client";

import { useState, useEffect, useCallback } from "react";
import {
  api,
  DeliveryFeeSettings,
  DeliveryZoneItem,
  AdminUser,
} from "../lib/api";
import {
  Truck,
  Sparkles,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Save,
  ShieldCheck,
  Percent,
  Sliders,
  DollarSign,
  Package,
  Layers,
  MapPin,
  Clock,
  Info,
  ChevronRight,
  TrendingDown,
  RotateCcw,
} from "lucide-react";

type DeliveryFeeViewProps = {
  currentUser?: AdminUser | null;
  onToast: (msg: string, type?: "success" | "error" | "info" | "delete") => void;
};

export function DeliveryFeeView({ currentUser, onToast }: DeliveryFeeViewProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<DeliveryFeeSettings | null>(null);

  // Form State
  const [baseDeliveryFee, setBaseDeliveryFee] = useState<number>(0);
  const [handlingFee, setHandlingFee] = useState<number>(0);
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState<number>(0);
  const [minOrderAmount, setMinOrderAmount] = useState<number>(0);
  const [hasChanges, setHasChanges] = useState(false);

  // Zone specific state
  const [zones, setZones] = useState<DeliveryZoneItem[]>([]);
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
  const [zoneFormData, setZoneFormData] = useState<{
    baseDeliveryFee: number;
    freeDeliveryThreshold: number;
    minOrderAmount: number;
  }>({
    baseDeliveryFee: 0,
    freeDeliveryThreshold: 0,
    minOrderAmount: 0,
  });

  // Simulator State
  const [simulatorCartValue, setSimulatorCartValue] = useState<number>(350);

  // Fetch Delivery Fee Settings
  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.deliveryFee.getSettings();
      if (data) {
        setSettings(data);
        setBaseDeliveryFee(data.deliveryFee ?? 0);
        setHandlingFee(data.handlingFee ?? 0);
        setFreeDeliveryThreshold(data.freeDeliveryThreshold ?? 0);
        setMinOrderAmount(data.minOrderAmount ?? 0);
        setZones(data.zones || []);
      }
    } catch (err: any) {
      console.warn("Could not fetch delivery fee settings:", err);
      onToast("Unable to load delivery settings from backend", "error");
    } finally {
      setLoading(false);
      setHasChanges(false);
    }
  }, [onToast]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Track Unsaved Changes
  const updateBaseFee = (val: number) => {
    setBaseDeliveryFee(Math.max(0, val));
    setHasChanges(true);
  };

  const updateHandlingFee = (val: number) => {
    setHandlingFee(Math.max(0, val));
    setHasChanges(true);
  };

  const updateFreeThreshold = (val: number) => {
    setFreeDeliveryThreshold(Math.max(0, val));
    setHasChanges(true);
  };

  const updateMinOrder = (val: number) => {
    setMinOrderAmount(Math.max(0, val));
    setHasChanges(true);
  };

  // 1-Click Zero Delivery Fee
  const handleQuickZeroFee = () => {
    setBaseDeliveryFee(0);
    setHandlingFee(0);
    setFreeDeliveryThreshold(0);
    setHasChanges(true);
    onToast("Preset selected: 100% Free Delivery & Zero Handling Fee", "info");
  };

  // Save Settings Globally
  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const updated = await api.deliveryFee.updateSettings({
        deliveryFee: baseDeliveryFee,
        freeDeliveryThreshold,
        minOrderAmount,
        handlingFee,
      });

      if (updated) {
        setSettings(updated);
        setZones(updated.zones || []);
        setHasChanges(false);
        const feeText = baseDeliveryFee === 0 ? "FREE (₹0)" : `₹${baseDeliveryFee}`;
        onToast(`Delivery fee updated successfully to ${feeText}!`, "success");
      }
    } catch (err: any) {
      console.error("Failed to update delivery settings:", err);
      onToast(err.message || "Failed to save delivery fee settings", "error");
    } finally {
      setSaving(false);
    }
  };

  // Save Specific Zone Settings
  const handleSaveZone = async (zoneId: string) => {
    try {
      await api.deliveryFee.updateSettings({
        zoneId,
        deliveryFee: zoneFormData.baseDeliveryFee,
        freeDeliveryThreshold: zoneFormData.freeDeliveryThreshold,
        minOrderAmount: zoneFormData.minOrderAmount,
      });
      setEditingZoneId(null);
      onToast("Zone delivery settings updated successfully!", "success");
      fetchSettings();
    } catch (err: any) {
      onToast(err.message || "Failed to update zone", "error");
    }
  };

  // Simulator Calculation
  const simDeliveryFee =
    baseDeliveryFee === 0 ||
    (freeDeliveryThreshold > 0 && simulatorCartValue >= freeDeliveryThreshold)
      ? 0
      : baseDeliveryFee;
  const simHandlingFee = handlingFee;
  const simTotalPay = simulatorCartValue + simDeliveryFee + simHandlingFee;

  return (
    <div style={{ padding: "24px 32px", maxWidth: "1280px", margin: "0 auto" }}>
      {/* Top Header Card */}
      <div
        style={{
          background: "linear-gradient(135deg, #1F4D46 0%, #153833 100%)",
          borderRadius: "16px",
          padding: "28px 32px",
          color: "#FFFFFF",
          marginBottom: "28px",
          boxShadow: "0 10px 25px -5px rgba(31, 77, 70, 0.25)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "20px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "12px",
                background: "rgba(255, 255, 255, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backdropFilter: "blur(8px)",
              }}
            >
              <Truck size={22} color="#FFFFFF" />
            </div>
            <div>
              <h1 style={{ fontSize: "22px", fontWeight: "800", margin: 0, letterSpacing: "-0.02em" }}>
                Delivery Fee & Logistics Pricing
              </h1>
              <p style={{ margin: "2px 0 0 0", fontSize: "13px", color: "rgba(255, 255, 255, 0.8)" }}>
                Live control over delivery charges, free delivery thresholds, and customer packaging fees
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <button
            type="button"
            onClick={fetchSettings}
            disabled={loading || saving}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 16px",
              borderRadius: "10px",
              background: "rgba(255, 255, 255, 0.12)",
              color: "#FFFFFF",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>

          <button
            type="button"
            onClick={handleQuickZeroFee}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 18px",
              borderRadius: "10px",
              background: "#2E7D5B",
              color: "#FFFFFF",
              border: "none",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(46, 125, 91, 0.35)",
            }}
          >
            <Sparkles size={16} />
            Set to ₹0 (Free Delivery)
          </button>
        </div>
      </div>

      {/* Status Bar */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "18px",
          marginBottom: "28px",
        }}
      >
        {/* Card 1: Active Delivery Fee */}
        <div
          style={{
            background: "#FFFFFF",
            borderRadius: "14px",
            padding: "20px 24px",
            border: "1px solid #E2E8E5",
            boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "13px", fontWeight: "600", color: "#6A7B76" }}>Current Delivery Fee</span>
            <span
              style={{
                fontSize: "11px",
                fontWeight: "700",
                padding: "3px 8px",
                borderRadius: "999px",
                background: baseDeliveryFee === 0 ? "#EAF7EF" : "#FFF4EE",
                color: baseDeliveryFee === 0 ? "#2E7D5B" : "#E5623E",
              }}
            >
              {baseDeliveryFee === 0 ? "FREE ACTIVE" : "STANDARD FEE"}
            </span>
          </div>
          <div style={{ fontSize: "32px", fontWeight: "800", color: "#1F4D46" }}>
            {baseDeliveryFee === 0 ? (
              <span style={{ color: "#2E7D5B", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                ₹0 <span style={{ fontSize: "16px", fontWeight: "700" }}>· FREE</span>
              </span>
            ) : (
              `₹${baseDeliveryFee}`
            )}
          </div>
          <p style={{ margin: "6px 0 0 0", fontSize: "12px", color: "#8C9B96" }}>
            {baseDeliveryFee === 0
              ? "Customers enjoy ₹0 free delivery on all orders"
              : `Charged to customers per delivery order`}
          </p>
        </div>

        {/* Card 2: Handling Fee */}
        <div
          style={{
            background: "#FFFFFF",
            borderRadius: "14px",
            padding: "20px 24px",
            border: "1px solid #E2E8E5",
            boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "13px", fontWeight: "600", color: "#6A7B76" }}>Handling & Packaging Fee</span>
            <span
              style={{
                fontSize: "11px",
                fontWeight: "700",
                padding: "3px 8px",
                borderRadius: "999px",
                background: handlingFee === 0 ? "#EAF7EF" : "#F4F6F5",
                color: handlingFee === 0 ? "#2E7D5B" : "#1F4D46",
              }}
            >
              {handlingFee === 0 ? "WAIVED" : "ACTIVE"}
            </span>
          </div>
          <div style={{ fontSize: "32px", fontWeight: "800", color: "#1F4D46" }}>
            {handlingFee === 0 ? (
              <span style={{ color: "#2E7D5B", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                ₹0 <span style={{ fontSize: "16px", fontWeight: "700" }}>· WAIVED</span>
              </span>
            ) : (
              `₹${handlingFee}`
            )}
          </div>
          <p style={{ margin: "6px 0 0 0", fontSize: "12px", color: "#8C9B96" }}>
            {handlingFee === 0 ? "No packaging fee charged to customer" : "Packaging & insulation fee per cart"}
          </p>
        </div>

        {/* Card 3: Free Delivery Threshold */}
        <div
          style={{
            background: "#FFFFFF",
            borderRadius: "14px",
            padding: "20px 24px",
            border: "1px solid #E2E8E5",
            boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "13px", fontWeight: "600", color: "#6A7B76" }}>Free Delivery Threshold</span>
            <span
              style={{
                fontSize: "11px",
                fontWeight: "700",
                padding: "3px 8px",
                borderRadius: "999px",
                background: freeDeliveryThreshold === 0 ? "#EAF7EF" : "#EFF4FF",
                color: freeDeliveryThreshold === 0 ? "#2E7D5B" : "#3B82F6",
              }}
            >
              {freeDeliveryThreshold === 0 ? "ALWAYS FREE" : `ABOVE ₹${freeDeliveryThreshold}`}
            </span>
          </div>
          <div style={{ fontSize: "32px", fontWeight: "800", color: "#1F4D46" }}>
            {freeDeliveryThreshold === 0 ? "₹0 (Always Free)" : `₹${freeDeliveryThreshold}`}
          </div>
          <p style={{ margin: "6px 0 0 0", fontSize: "12px", color: "#8C9B96" }}>
            {freeDeliveryThreshold === 0
              ? "All orders qualify for free delivery regardless of cart value"
              : `Orders over ₹${freeDeliveryThreshold} receive 100% free delivery`}
          </p>
        </div>
      </div>

      {/* Main Content: Left Controls & Right Simulator */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: "28px", alignItems: "start" }}>
        {/* Left Column: Delivery Fee Controls */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Main Controls Card */}
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: "16px",
              padding: "28px 30px",
              border: "1px solid #E2E8E5",
              boxShadow: "0 4px 14px rgba(0,0,0,0.04)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
              <Sliders size={20} color="#1F4D46" />
              <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#1F4D46", margin: 0 }}>
                Global Fee Controls
              </h2>
            </div>

            {/* Field 1: Standard Delivery Fee */}
            <div style={{ marginBottom: "26px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <label style={{ fontSize: "14px", fontWeight: "700", color: "#223B36" }}>
                  Base Delivery Fee (₹)
                </label>
                <span style={{ fontSize: "13px", fontWeight: "700", color: baseDeliveryFee === 0 ? "#2E7D5B" : "#1F4D46" }}>
                  {baseDeliveryFee === 0 ? "Currently FREE (₹0)" : `₹${baseDeliveryFee}`}
                </span>
              </div>
              <p style={{ fontSize: "12px", color: "#6A7B76", margin: "0 0 10px 0" }}>
                Default shipping charge applied to customers during checkout. Set to 0 for storewide free delivery.
              </p>

              <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "12px" }}>
                <div style={{ position: "relative", flex: 1 }}>
                  <span
                    style={{
                      position: "absolute",
                      left: "14px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      fontWeight: "700",
                      color: "#6A7B76",
                    }}
                  >
                    ₹
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={baseDeliveryFee}
                    onChange={(e) => updateBaseFee(Number(e.target.value))}
                    style={{
                      width: "100%",
                      padding: "11px 16px 11px 32px",
                      borderRadius: "10px",
                      border: "1.5px solid #D5DDD9",
                      fontSize: "15px",
                      fontWeight: "700",
                      color: "#1F4D46",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => updateBaseFee(Math.max(0, baseDeliveryFee - 5))}
                  style={{
                    padding: "11px 16px",
                    borderRadius: "10px",
                    border: "1px solid #D5DDD9",
                    background: "#F4F6F5",
                    fontSize: "14px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  -5
                </button>
                <button
                  type="button"
                  onClick={() => updateBaseFee(baseDeliveryFee + 5)}
                  style={{
                    padding: "11px 16px",
                    borderRadius: "10px",
                    border: "1px solid #D5DDD9",
                    background: "#F4F6F5",
                    fontSize: "14px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  +5
                </button>
              </div>

              {/* Quick Presets for Delivery Fee */}
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {[
                  { label: "₹0 (Free)", val: 0 },
                  { label: "₹15", val: 15 },
                  { label: "₹25", val: 25 },
                  { label: "₹30", val: 30 },
                  { label: "₹35", val: 35 },
                  { label: "₹40", val: 40 },
                ].map((p) => (
                  <button
                    key={p.val}
                    type="button"
                    onClick={() => updateBaseFee(p.val)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "8px",
                      border: baseDeliveryFee === p.val ? "1.5px solid #2E7D5B" : "1px solid #D8E0DC",
                      background: baseDeliveryFee === p.val ? "#EAF7EF" : "#FFFFFF",
                      color: baseDeliveryFee === p.val ? "#2E7D5B" : "#4A5A55",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Field 2: Handling & Packaging Fee */}
            <div style={{ marginBottom: "26px", paddingTop: "20px", borderTop: "1px solid #EEF2F0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <label style={{ fontSize: "14px", fontWeight: "700", color: "#223B36" }}>
                  Handling & Packaging Fee (₹)
                </label>
                <span style={{ fontSize: "13px", fontWeight: "700", color: handlingFee === 0 ? "#2E7D5B" : "#1F4D46" }}>
                  {handlingFee === 0 ? "Currently FREE (₹0)" : `₹${handlingFee}`}
                </span>
              </div>
              <p style={{ fontSize: "12px", color: "#6A7B76", margin: "0 0 10px 0" }}>
                Fee for cooling packs, food-grade thermal insulation, and vacuum packaging. Set to 0 to waive fee.
              </p>

              <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "12px" }}>
                <div style={{ position: "relative", flex: 1 }}>
                  <span
                    style={{
                      position: "absolute",
                      left: "14px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      fontWeight: "700",
                      color: "#6A7B76",
                    }}
                  >
                    ₹
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={handlingFee}
                    onChange={(e) => updateHandlingFee(Number(e.target.value))}
                    style={{
                      width: "100%",
                      padding: "11px 16px 11px 32px",
                      borderRadius: "10px",
                      border: "1.5px solid #D5DDD9",
                      fontSize: "15px",
                      fontWeight: "700",
                      color: "#1F4D46",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => updateHandlingFee(Math.max(0, handlingFee - 5))}
                  style={{
                    padding: "11px 16px",
                    borderRadius: "10px",
                    border: "1px solid #D5DDD9",
                    background: "#F4F6F5",
                    fontSize: "14px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  -5
                </button>
                <button
                  type="button"
                  onClick={() => updateHandlingFee(handlingFee + 5)}
                  style={{
                    padding: "11px 16px",
                    borderRadius: "10px",
                    border: "1px solid #D5DDD9",
                    background: "#F4F6F5",
                    fontSize: "14px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  +5
                </button>
              </div>

              {/* Quick Presets for Handling Fee */}
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {[
                  { label: "₹0 (Waived)", val: 0 },
                  { label: "₹10", val: 10 },
                  { label: "₹15", val: 15 },
                  { label: "₹20", val: 20 },
                ].map((p) => (
                  <button
                    key={p.val}
                    type="button"
                    onClick={() => updateHandlingFee(p.val)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "8px",
                      border: handlingFee === p.val ? "1.5px solid #2E7D5B" : "1px solid #D8E0DC",
                      background: handlingFee === p.val ? "#EAF7EF" : "#FFFFFF",
                      color: handlingFee === p.val ? "#2E7D5B" : "#4A5A55",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Field 3: Free Delivery Threshold */}
            <div style={{ marginBottom: "26px", paddingTop: "20px", borderTop: "1px solid #EEF2F0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <label style={{ fontSize: "14px", fontWeight: "700", color: "#223B36" }}>
                  Free Delivery Cart Threshold (₹)
                </label>
                <span style={{ fontSize: "13px", fontWeight: "700", color: "#1F4D46" }}>
                  {freeDeliveryThreshold === 0 ? "Always Free" : `Free Above ₹${freeDeliveryThreshold}`}
                </span>
              </div>
              <p style={{ fontSize: "12px", color: "#6A7B76", margin: "0 0 10px 0" }}>
                Orders with cart subtotal reaching this amount automatically get ₹0 delivery fee. Set to 0 if all orders get free delivery.
              </p>

              <div style={{ position: "relative", marginBottom: "12px" }}>
                <span
                  style={{
                    position: "absolute",
                    left: "14px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontWeight: "700",
                    color: "#6A7B76",
                  }}
                >
                  ₹
                </span>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={freeDeliveryThreshold}
                  onChange={(e) => updateFreeThreshold(Number(e.target.value))}
                  style={{
                    width: "100%",
                    padding: "11px 16px 11px 32px",
                    borderRadius: "10px",
                    border: "1.5px solid #D5DDD9",
                    fontSize: "15px",
                    fontWeight: "700",
                    color: "#1F4D46",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Quick Presets for Threshold */}
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {[
                  { label: "₹0 (Always Free)", val: 0 },
                  { label: "₹299", val: 299 },
                  { label: "₹499", val: 499 },
                  { label: "₹799", val: 799 },
                  { label: "₹999", val: 999 },
                ].map((p) => (
                  <button
                    key={p.val}
                    type="button"
                    onClick={() => updateFreeThreshold(p.val)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "8px",
                      border: freeDeliveryThreshold === p.val ? "1.5px solid #2E7D5B" : "1px solid #D8E0DC",
                      background: freeDeliveryThreshold === p.val ? "#EAF7EF" : "#FFFFFF",
                      color: freeDeliveryThreshold === p.val ? "#2E7D5B" : "#4A5A55",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Field 4: Minimum Order Value */}
            <div style={{ paddingTop: "20px", borderTop: "1px solid #EEF2F0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <label style={{ fontSize: "14px", fontWeight: "700", color: "#223B36" }}>
                  Minimum Order Amount (₹)
                </label>
                <span style={{ fontSize: "13px", fontWeight: "700", color: "#1F4D46" }}>
                  {minOrderAmount === 0 ? "No Minimum" : `Min ₹${minOrderAmount}`}
                </span>
              </div>
              <p style={{ fontSize: "12px", color: "#6A7B76", margin: "0 0 10px 0" }}>
                Minimum subtotal required before a customer can place an order. Set to 0 to remove minimum requirements.
              </p>

              <div style={{ position: "relative", marginBottom: "12px" }}>
                <span
                  style={{
                    position: "absolute",
                    left: "14px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontWeight: "700",
                    color: "#6A7B76",
                  }}
                >
                  ₹
                </span>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={minOrderAmount}
                  onChange={(e) => updateMinOrder(Number(e.target.value))}
                  style={{
                    width: "100%",
                    padding: "11px 16px 11px 32px",
                    borderRadius: "10px",
                    border: "1.5px solid #D5DDD9",
                    fontSize: "15px",
                    fontWeight: "700",
                    color: "#1F4D46",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Quick Presets for Minimum Order */}
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {[
                  { label: "₹0 (No Minimum)", val: 0 },
                  { label: "₹99", val: 99 },
                  { label: "₹149", val: 149 },
                  { label: "₹199", val: 199 },
                ].map((p) => (
                  <button
                    key={p.val}
                    type="button"
                    onClick={() => updateMinOrder(p.val)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "8px",
                      border: minOrderAmount === p.val ? "1.5px solid #2E7D5B" : "1px solid #D8E0DC",
                      background: minOrderAmount === p.val ? "#EAF7EF" : "#FFFFFF",
                      color: minOrderAmount === p.val ? "#2E7D5B" : "#4A5A55",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Save Button Row */}
            <div
              style={{
                marginTop: "28px",
                paddingTop: "20px",
                borderTop: "1.5px solid #E2E8E5",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                {hasChanges ? (
                  <span style={{ fontSize: "13px", fontWeight: "700", color: "#E5623E", display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <AlertCircle size={15} /> Unsaved changes pending
                  </span>
                ) : (
                  <span style={{ fontSize: "13px", fontWeight: "600", color: "#2E7D5B", display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <CheckCircle size={15} /> All delivery fee settings in sync
                  </span>
                )}
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                {hasChanges && (
                  <button
                    type="button"
                    onClick={fetchSettings}
                    style={{
                      padding: "10px 16px",
                      borderRadius: "10px",
                      border: "1px solid #D5DDD9",
                      background: "#FFFFFF",
                      color: "#4A5A55",
                      fontSize: "13px",
                      fontWeight: "700",
                      cursor: "pointer",
                    }}
                  >
                    Reset
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleSaveSettings}
                  disabled={saving}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "11px 24px",
                    borderRadius: "10px",
                    background: hasChanges ? "#E5623E" : "#1F4D46",
                    color: "#FFFFFF",
                    border: "none",
                    fontSize: "14px",
                    fontWeight: "800",
                    cursor: "pointer",
                    boxShadow: hasChanges
                      ? "0 4px 14px rgba(229, 98, 62, 0.35)"
                      : "0 4px 14px rgba(31, 77, 70, 0.25)",
                    transition: "all 0.2s ease",
                  }}
                >
                  <Save size={16} />
                  {saving ? "Saving..." : "Save Delivery Fee Settings"}
                </button>
              </div>
            </div>
          </div>

          {/* Delivery Zones Table Card */}
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: "16px",
              padding: "24px 28px",
              border: "1px solid #E2E8E5",
              boxShadow: "0 4px 14px rgba(0,0,0,0.04)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <MapPin size={20} color="#1F4D46" />
                <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#1F4D46", margin: 0 }}>
                  Delivery Zones ({zones.length})
                </h3>
              </div>
              <span style={{ fontSize: "12px", color: "#6A7B76" }}>
                Global fee applies across all active zones
              </span>
            </div>

            {zones.length === 0 ? (
              <p style={{ fontSize: "13px", color: "#8C9B96", fontStyle: "italic" }}>
                No delivery zones registered. Global default settings will be used.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {zones.map((zone) => {
                  const isEditing = editingZoneId === zone.id;
                  return (
                    <div
                      key={zone.id}
                      style={{
                        padding: "16px 20px",
                        borderRadius: "12px",
                        background: "#F8FAF9",
                        border: "1px solid #E2E8E5",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "14px",
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontWeight: "700", fontSize: "14px", color: "#1F4D46" }}>
                            {zone.name}
                          </span>
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: "700",
                              padding: "2px 7px",
                              borderRadius: "6px",
                              background: zone.isActive ? "#EAF7EF" : "#FEE2E2",
                              color: zone.isActive ? "#2E7D5B" : "#DC2626",
                            }}
                          >
                            {zone.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <div style={{ display: "flex", gap: "16px", fontSize: "12px", color: "#6A7B76", marginTop: "4px" }}>
                          <span>Radius: <strong>{zone.radiusKm} km</strong></span>
                          <span>Delivery Fee: <strong>{zone.baseDeliveryFee === 0 ? "FREE (₹0)" : `₹${zone.baseDeliveryFee}`}</strong></span>
                          <span>Free Above: <strong>₹{zone.freeDeliveryThreshold}</strong></span>
                        </div>
                      </div>

                      {isEditing ? (
                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <span style={{ fontSize: "11px", color: "#6A7B76" }}>Fee:</span>
                            <input
                              type="number"
                              min="0"
                              value={zoneFormData.baseDeliveryFee}
                              onChange={(e) =>
                                setZoneFormData((prev) => ({
                                  ...prev,
                                  baseDeliveryFee: Number(e.target.value),
                                }))
                              }
                              style={{
                                width: "65px",
                                padding: "4px 8px",
                                borderRadius: "6px",
                                border: "1px solid #CCD5D1",
                                fontSize: "12px",
                              }}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSaveZone(zone.id)}
                            style={{
                              padding: "5px 12px",
                              borderRadius: "6px",
                              background: "#2E7D5B",
                              color: "#FFFFFF",
                              border: "none",
                              fontSize: "12px",
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingZoneId(null)}
                            style={{
                              padding: "5px 10px",
                              borderRadius: "6px",
                              background: "#FFFFFF",
                              border: "1px solid #CCD5D1",
                              fontSize: "12px",
                              cursor: "pointer",
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingZoneId(zone.id);
                            setZoneFormData({
                              baseDeliveryFee: zone.baseDeliveryFee,
                              freeDeliveryThreshold: zone.freeDeliveryThreshold,
                              minOrderAmount: zone.minOrderAmount,
                            });
                          }}
                          style={{
                            padding: "6px 14px",
                            borderRadius: "8px",
                            border: "1px solid #CCD5D1",
                            background: "#FFFFFF",
                            color: "#1F4D46",
                            fontSize: "12px",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          Edit Zone
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Customer Cart Simulation */}
        <div style={{ position: "sticky", top: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Customer View Simulator */}
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: "16px",
              padding: "24px 26px",
              border: "1px solid #E2E8E5",
              boxShadow: "0 6px 18px rgba(0,0,0,0.05)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
              <Package size={18} color="#1F4D46" />
              <h3 style={{ fontSize: "16px", fontWeight: "800", color: "#1F4D46", margin: 0 }}>
                Customer Checkout Preview
              </h3>
            </div>
            <p style={{ fontSize: "12px", color: "#6A7B76", margin: "0 0 18px 0" }}>
              This simulates the exact Bill Details breakdown displayed to customers in the mobile cart view.
            </p>

            {/* Simulated Cart Value Slider */}
            <div style={{ marginBottom: "20px", background: "#F8FAF9", padding: "14px 16px", borderRadius: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "12px", fontWeight: "700", color: "#4A5A55" }}>
                  Test Cart Subtotal:
                </span>
                <span style={{ fontSize: "14px", fontWeight: "800", color: "#1F4D46" }}>
                  ₹{simulatorCartValue}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1500"
                step="50"
                value={simulatorCartValue}
                onChange={(e) => setSimulatorCartValue(Number(e.target.value))}
                style={{ width: "100%", accentColor: "#1F4D46", cursor: "pointer" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#8C9B96", marginTop: "4px" }}>
                <span>₹0</span>
                <span>₹500</span>
                <span>₹1,000</span>
                <span>₹1,500</span>
              </div>
            </div>

            {/* Mobile Bill Preview Card */}
            <div
              style={{
                borderRadius: "14px",
                border: "1.5px solid #E2E8E5",
                background: "#FAFCFB",
                padding: "18px 20px",
              }}
            >
              <div style={{ fontSize: "13px", fontWeight: "800", color: "#1F4D46", marginBottom: "14px", letterSpacing: "0.02em" }}>
                BILL DETAILS
              </div>

              {/* Row 1: Item Total */}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "10px", color: "#4A5A55" }}>
                <span>Item Total</span>
                <span style={{ fontWeight: "700", color: "#1F4D46" }}>₹{simulatorCartValue}</span>
              </div>

              {/* Row 2: Delivery Fee */}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "10px", color: "#4A5A55" }}>
                <span>Delivery Fee</span>
                {simDeliveryFee === 0 ? (
                  <span style={{ fontWeight: "700", color: "#2E7D5B" }}>FREE</span>
                ) : (
                  <span style={{ fontWeight: "700", color: "#1F4D46" }}>₹{simDeliveryFee}</span>
                )}
              </div>

              {/* Row 3: Handling & Packaging */}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "12px", color: "#4A5A55" }}>
                <span>Handling & Packaging</span>
                {simHandlingFee === 0 ? (
                  <span style={{ fontWeight: "700", color: "#2E7D5B" }}>FREE</span>
                ) : (
                  <span style={{ fontWeight: "700", color: "#1F4D46" }}>₹{simHandlingFee}</span>
                )}
              </div>

              {/* Divider */}
              <div style={{ height: "1px", background: "#D8E0DC", margin: "10px 0" }} />

              {/* Row 4: Grand Total */}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "15px", fontWeight: "800", color: "#1F4D46" }}>
                <span>To Pay</span>
                <span style={{ color: "#1F4D46" }}>₹{simTotalPay}</span>
              </div>
            </div>

            {/* Note badge */}
            <div
              style={{
                marginTop: "16px",
                padding: "10px 14px",
                borderRadius: "10px",
                background: baseDeliveryFee === 0 && handlingFee === 0 ? "#EAF7EF" : "#F4F6F5",
                color: baseDeliveryFee === 0 && handlingFee === 0 ? "#2E7D5B" : "#4A5A55",
                fontSize: "12px",
                lineHeight: "1.4",
                display: "flex",
                alignItems: "flex-start",
                gap: "8px",
              }}
            >
              <Info size={16} style={{ flexShrink: 0, marginTop: "1px" }} />
              <div>
                {baseDeliveryFee === 0 && handlingFee === 0 ? (
                  <span>
                    <strong>Zero Fee Policy Active:</strong> Customers pay only for the products they select, boosting checkout conversion!
                  </span>
                ) : (
                  <span>
                    Customers will see <strong>₹{simDeliveryFee}</strong> delivery and{" "}
                    <strong>₹{simHandlingFee}</strong> handling fee applied at checkout.
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Help Box */}
          <div
            style={{
              background: "#F4F6F5",
              borderRadius: "14px",
              padding: "18px 20px",
              border: "1px solid #E2E8E5",
              fontSize: "12px",
              color: "#6A7B76",
              lineHeight: 1.5,
            }}
          >
            <div style={{ fontWeight: "700", color: "#1F4D46", marginBottom: "4px" }}>
              💡 Delivery Fee Best Practices
            </div>
            When delivery fee is set to ₹0, the customer app highlights free delivery with green badges across product pages and checkout, resulting in higher order volumes.
          </div>
        </div>
      </div>
    </div>
  );
}
