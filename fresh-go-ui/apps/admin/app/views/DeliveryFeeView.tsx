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
  RefreshCw,
  Save,
  MapPin,
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

  // Form State
  const [baseDeliveryFee, setBaseDeliveryFee] = useState<number>(0);
  const [handlingFee, setHandlingFee] = useState<number>(0);
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState<number>(0);
  const [minOrderAmount, setMinOrderAmount] = useState<number>(0);
  const [hasChanges, setHasChanges] = useState(false);

  // Zone state
  const [zones, setZones] = useState<DeliveryZoneItem[]>([]);
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
  const [zoneFee, setZoneFee] = useState<number>(0);

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
      onToast("Unable to load delivery settings", "error");
    } finally {
      setLoading(false);
      setHasChanges(false);
    }
  }, [onToast]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

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
        const feeText = baseDeliveryFee === 0 ? "Free (Rs 0)" : `Rs ${baseDeliveryFee}`;
        onToast(`Delivery fee updated to ${feeText}`, "success");
      }
    } catch (err: any) {
      onToast(err.message || "Failed to save delivery settings", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveZone = async (zoneId: string) => {
    try {
      await api.deliveryFee.updateSettings({
        zoneId,
        deliveryFee: zoneFee,
        freeDeliveryThreshold: 0,
        minOrderAmount: 0,
      });
      setEditingZoneId(null);
      onToast("Zone updated successfully", "success");
      fetchSettings();
    } catch (err: any) {
      onToast(err.message || "Failed to update zone", "error");
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

        <button
          type="button"
          onClick={fetchSettings}
          disabled={loading || saving}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 14px",
            borderRadius: "8px",
            background: "#F4F7F5",
            color: "#334B45",
            border: "1px solid #D5DDD9",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
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
                  onChange={(e) => {
                    setBaseDeliveryFee(Math.max(0, Number(e.target.value)));
                    setHasChanges(true);
                  }}
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
                  onChange={(e) => {
                    setHandlingFee(Math.max(0, Number(e.target.value)));
                    setHasChanges(true);
                  }}
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
                  onChange={(e) => {
                    setFreeDeliveryThreshold(Math.max(0, Number(e.target.value)));
                    setHasChanges(true);
                  }}
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
                  onChange={(e) => {
                    setMinOrderAmount(Math.max(0, Number(e.target.value)));
                    setHasChanges(true);
                  }}
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

      {/* Delivery Zones Card */}
      {zones.length > 0 && (
        <div
          style={{
            background: "#FFFFFF",
            borderRadius: "14px",
            border: "1px solid #E2E8E5",
            boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "14px 20px",
              borderBottom: "1px solid #EEF2F0",
              background: "#F8FAF9",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <MapPin size={15} color="#1F4D46" />
            <h2
              style={{
                fontSize: "14px",
                fontWeight: 700,
                color: "#1F4D46",
                margin: 0,
              }}
            >
              Delivery Zones ({zones.length})
            </h2>
          </div>

          <div style={{ padding: "4px 20px 16px" }}>
            {zones.map((zone, i) => {
              const isEditing = editingZoneId === zone.id;
              return (
                <div
                  key={zone.id}
                  style={{
                    padding: "12px 0",
                    borderBottom: i < zones.length - 1 ? "1px solid #EEF2F0" : "none",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "10px",
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        marginBottom: "2px",
                      }}
                    >
                      <span style={{ fontSize: "14px", fontWeight: 700, color: "#1F4D46" }}>
                        {zone.name}
                      </span>
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          padding: "2px 7px",
                          borderRadius: "6px",
                          background: zone.isActive ? "#EAF7EF" : "#FEE2E2",
                          color: zone.isActive ? "#2E7D5B" : "#DC2626",
                        }}
                      >
                        {zone.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <span style={{ fontSize: "12px", color: "#7A8F89" }}>
                      {zone.radiusKm} km · Fee:{" "}
                      <strong>
                        {zone.baseDeliveryFee === 0 ? "FREE" : `Rs ${zone.baseDeliveryFee}`}
                      </strong>
                      {" "}&middot; Free above:{" "}
                      <strong>Rs {zone.freeDeliveryThreshold}</strong>
                    </span>
                  </div>

                  {isEditing ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <div style={{ position: "relative" }}>
                        <span
                          style={{
                            position: "absolute",
                            left: "9px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            fontSize: "11px",
                            color: "#7A8F89",
                            fontWeight: 700,
                          }}
                        >
                          Rs
                        </span>
                        <input
                          type="number"
                          min="0"
                          value={zoneFee}
                          onChange={(e) => setZoneFee(Number(e.target.value))}
                          style={{
                            width: "80px",
                            padding: "7px 8px 7px 28px",
                            borderRadius: "7px",
                            border: "1.5px solid #D5DDD9",
                            fontSize: "13px",
                            fontWeight: 600,
                          }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSaveZone(zone.id)}
                        style={{
                          padding: "7px 14px",
                          borderRadius: "7px",
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
                          padding: "7px 12px",
                          borderRadius: "7px",
                          background: "#FFFFFF",
                          border: "1px solid #D5DDD9",
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
                        setZoneFee(zone.baseDeliveryFee);
                      }}
                      style={{
                        padding: "7px 14px",
                        borderRadius: "7px",
                        border: "1px solid #D5DDD9",
                        background: "#FFFFFF",
                        color: "#1F4D46",
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Edit
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
