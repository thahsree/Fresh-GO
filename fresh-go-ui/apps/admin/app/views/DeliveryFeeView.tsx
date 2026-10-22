"use client";

import { useState, useEffect, useCallback } from "react";
import {
  api,
  DeliveryFeeSettings,
  AdminUser,
} from "../lib/api";
import {
  Truck,
  Save,
  AlertCircle,
  CheckCircle,
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

  // Form State: number | string to allow natural typing without sticky '0' or '013'
  const [baseDeliveryFee, setBaseDeliveryFee] = useState<number | string>(0);
  const [handlingFee, setHandlingFee] = useState<number | string>(0);
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState<number | string>(0);
  const [minOrderAmount, setMinOrderAmount] = useState<number | string>(0);
  const [hasChanges, setHasChanges] = useState(false);

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
      }
    } catch (err: any) {
      onToast("Unable to load delivery settings", "error");
    } finally {
      setLoading(false);
      setHasChanges(false);
    }
  }, [onToast]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Clean typing handler: removes leading 0 when typing numbers (e.g. 013 -> 13) and allows backspacing to empty
  const handleNumberInput = (
    val: string,
    setter: (v: number | string) => void
  ) => {
    if (val === "") {
      setter("");
      setHasChanges(true);
      return;
    }
    // Remove leading zeros when typing (prevents 013)
    const cleaned = val.replace(/^0+(?=\d)/, "");
    setter(cleaned);
    setHasChanges(true);
  };

  const handleBlurNumber = (
    val: number | string,
    setter: (v: number | string) => void
  ) => {
    if (val === "" || isNaN(Number(val))) {
      setter(0);
    } else {
      setter(Math.max(0, Number(val)));
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    const dFee = Number(baseDeliveryFee) || 0;
    const hFee = Number(handlingFee) || 0;
    const fThreshold = Number(freeDeliveryThreshold) || 0;
    const mOrder = Number(minOrderAmount) || 0;

    try {
      const updated = await api.deliveryFee.updateSettings({
        deliveryFee: dFee,
        freeDeliveryThreshold: fThreshold,
        minOrderAmount: mOrder,
        handlingFee: hFee,
      });
      if (updated) {
        setBaseDeliveryFee(updated.deliveryFee ?? dFee);
        setHandlingFee(updated.handlingFee ?? hFee);
        setFreeDeliveryThreshold(updated.freeDeliveryThreshold ?? fThreshold);
        setMinOrderAmount(updated.minOrderAmount ?? mOrder);
        setHasChanges(false);
        const feeText = dFee === 0 ? "Free (Rs 0)" : `Rs ${dFee}`;
        onToast(`Delivery fee & handling fee updated successfully! (${feeText}, Handling: Rs ${hFee})`, "success");
      }
    } catch (err: any) {
      onToast(err.message || "Failed to save delivery settings", "error");
    } finally {
      setSaving(false);
    }
  };



  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px 10px 30px",
    borderRadius: "8px",
    border: "1.5px solid #D5DDD9",
    fontSize: "15px",
    fontWeight: 600,
    color: "#1F4D46",
    outline: "none",
    boxSizing: "border-box",
    background: "#FAFCFB",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "13px",
    fontWeight: 700,
    color: "#334B45",
    display: "block",
    marginBottom: "4px",
  };

  const hintStyle: React.CSSProperties = {
    fontSize: "12px",
    color: "#7A8F89",
    marginBottom: "8px",
    display: "block",
  };

  const rupeePrefix: React.CSSProperties = {
    position: "absolute",
    left: "11px",
    top: "50%",
    transform: "translateY(-50%)",
    fontWeight: 700,
    color: "#7A8F89",
    fontSize: "14px",
    pointerEvents: "none",
  };

  return (
    <div
      style={{
        padding: "20px 16px",
        maxWidth: "700px",
        margin: "0 auto",
        fontFamily: "inherit",
      }}
    >
      <style>{`
        .df-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        @media (max-width: 560px) {
          .df-grid-2 {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {/* Page Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "10px",
              background: "#1F4D46",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Truck size={18} color="#FFFFFF" />
          </div>
          <div>
            <h1
              style={{
                fontSize: "18px",
                fontWeight: 800,
                color: "#1F4D46",
                margin: 0,
                letterSpacing: "-0.02em",
              }}
            >
              Delivery Fee Settings
            </h1>
            <p style={{ margin: 0, fontSize: "12px", color: "#7A8F89" }}>
              Global delivery charges and order thresholds
            </p>
          </div>
        </div>
      </div>

      {/* Main Settings Card */}
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: "14px",
          border: "1px solid #E2E8E5",
          boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
          overflow: "hidden",
          marginBottom: "20px",
        }}
      >
        {/* Card Header */}
        <div
          style={{
            padding: "14px 20px",
            borderBottom: "1px solid #EEF2F0",
            background: "#F8FAF9",
          }}
        >
          <h2
            style={{
              fontSize: "14px",
              fontWeight: 700,
              color: "#1F4D46",
              margin: 0,
            }}
          >
            Global Fee Controls
          </h2>
        </div>

        {/* Fields */}
        <div style={{ padding: "20px" }}>
          {/* Row 1: Delivery Fee + Handling Fee */}
          <div className="df-grid-2" style={{ marginBottom: "16px" }}>
            <div>
              <label style={labelStyle}>Delivery Fee</label>
              <span style={hintStyle}>Charge per order. Set 0 for free delivery.</span>
              <div style={{ position: "relative" }}>
                <span style={rupeePrefix}>Rs</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={baseDeliveryFee}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => handleNumberInput(e.target.value, setBaseDeliveryFee)}
                  onBlur={() => handleBlurNumber(baseDeliveryFee, setBaseDeliveryFee)}
                  style={{ ...inputStyle, paddingLeft: "36px" }}
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Handling & Packaging Fee</label>
              <span style={hintStyle}>Packaging cost per order. Set 0 to waive.</span>
              <div style={{ position: "relative" }}>
                <span style={rupeePrefix}>Rs</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={handlingFee}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => handleNumberInput(e.target.value, setHandlingFee)}
                  onBlur={() => handleBlurNumber(handlingFee, setHandlingFee)}
                  style={{ ...inputStyle, paddingLeft: "36px" }}
                />
              </div>
            </div>
          </div>

          {/* Row 2: Free Threshold + Min Order */}
          <div className="df-grid-2">
            <div>
              <label style={labelStyle}>Free Delivery Above</label>
              <span style={hintStyle}>Cart value to waive delivery fee. Set 0 = always free.</span>
              <div style={{ position: "relative" }}>
                <span style={rupeePrefix}>Rs</span>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={freeDeliveryThreshold}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => handleNumberInput(e.target.value, setFreeDeliveryThreshold)}
                  onBlur={() => handleBlurNumber(freeDeliveryThreshold, setFreeDeliveryThreshold)}
                  style={{ ...inputStyle, paddingLeft: "36px" }}
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Minimum Order Amount</label>
              <span style={hintStyle}>Minimum cart to place an order. Set 0 to disable.</span>
              <div style={{ position: "relative" }}>
                <span style={rupeePrefix}>Rs</span>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={minOrderAmount}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => handleNumberInput(e.target.value, setMinOrderAmount)}
                  onBlur={() => handleBlurNumber(minOrderAmount, setMinOrderAmount)}
                  style={{ ...inputStyle, paddingLeft: "36px" }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer / Save Row */}
        <div
          style={{
            padding: "14px 20px",
            borderTop: "1px solid #EEF2F0",
            background: "#F8FAF9",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <div style={{ fontSize: "12.5px", fontWeight: 600 }}>
            {hasChanges ? (
              <span
                style={{
                  color: "#E5623E",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                }}
              >
                <AlertCircle size={14} /> Unsaved changes
              </span>
            ) : (
              <span
                style={{
                  color: "#2E7D5B",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                }}
              >
                <CheckCircle size={14} /> Settings are saved
              </span>
            )}
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            {hasChanges && (
              <button
                type="button"
                onClick={fetchSettings}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "9px 16px",
                  borderRadius: "8px",
                  border: "1px solid #D5DDD9",
                  background: "#FFFFFF",
                  color: "#4A5A55",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <RotateCcw size={13} /> Reset
              </button>
            )}
            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={saving}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "9px 20px",
                borderRadius: "8px",
                background: hasChanges ? "#E5623E" : "#1F4D46",
                color: "#FFFFFF",
                border: "none",
                fontSize: "13px",
                fontWeight: 700,
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.7 : 1,
                transition: "background 0.2s ease",
              }}
            >
              <Save size={14} />
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
