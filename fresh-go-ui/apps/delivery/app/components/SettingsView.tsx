import React, { useState } from "react";
import {
  BadgeHelp,
  Bike,
  Check,
  ChevronRight,
  LogOut,
  MapPin,
  MapPinned,
  ShieldCheck,
  Star,
  Volume2,
  AlertCircle,
  Building,
  CheckCircle2,
  Send,
  X,
} from "lucide-react";
import { AlertSoundType, DeliverySettings } from "../models/delivery";
import { AlertSoundOption, ALERT_SOUND_OPTIONS } from "../lib/sound";
import { DeliveryHub, DeliveryUser, deliveryApi } from "../lib/api";

type SettingsViewProps = {
  settings: DeliverySettings;
  onUpdateSettings: (update: Partial<DeliverySettings>) => void;
  onTestSoundAlert?: (soundType?: AlertSoundType) => void;
  soundOptions?: AlertSoundOption[];
  isOnline: boolean;
  onToggleOnline: () => void;
  hubs: DeliveryHub[];
  selectedHub: DeliveryHub | null;
  onChangeHub?: (hub: DeliveryHub) => void;
  user: DeliveryUser | null;
  onLogout: () => void;
  onOpenHelp?: () => void;
  onOpenSafety?: () => void;
  onOpenReport?: () => void;
};

export function SettingsView({
  settings,
  onUpdateSettings,
  onTestSoundAlert,
  soundOptions = ALERT_SOUND_OPTIONS,
  isOnline,
  onToggleOnline,
  hubs,
  selectedHub,
  onChangeHub,
  user,
  onLogout,
  onOpenHelp,
  onOpenSafety,
  onOpenReport,
}: SettingsViewProps) {
  const partnerName = user?.name || "Delivery Partner";
  const partnerPhone = user?.phone || "";
  const partnerInitials = partnerName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const partnerProfile = user?.partnerProfile;
  const rating = partnerProfile?.rating || 5.0;
  const completedCount = partnerProfile?.completedDeliveries || 0;
  const cashInHand = partnerProfile?.codCashInHand || 0;

  // Hub Transfer Request States (no direct switching)
  const [requestTargetHub, setRequestTargetHub] = useState<DeliveryHub | null>(null);
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false);
  const [transferSubmittedHub, setTransferSubmittedHub] = useState<DeliveryHub | null>(null);
  const [transferError, setTransferError] = useState<string | null>(null);

  return (
    <>
      <div className="view-heading">
        <p className="eyebrow">Account & Preferences</p>
        <h1>Settings</h1>
        <p>Control your fulfillment hub, duty availability, and profile.</p>
      </div>

      {/* Duty Status */}
      <section className="settings-section duty-status-section" style={{ marginTop: 0 }}>
        <h2>Duty Status</h2>
        <div className={`card setting-card duty-card ${isOnline ? "duty-online" : "duty-offline"}`}>
          <div className="duty-card-content" style={{ padding: "16px" }}>
            <div className="duty-info">
              <div className="duty-indicator-row">
                <span className={`duty-dot ${isOnline ? "online" : "offline"}`} />
                <strong>{isOnline ? "Online & Available" : "Currently Offline"}</strong>
              </div>
              <p>
                {isOnline
                  ? "You are actively receiving live orders from your selected hub."
                  : "Switch on duty status to start receiving incoming delivery requests."}
              </p>
            </div>
            <button
              className={`duty-toggle-switch ${isOnline ? "on" : ""}`}
              type="button"
              role="switch"
              aria-checked={isOnline}
              aria-label="Toggle Online/Offline status"
              onClick={onToggleOnline}
            >
              <i />
            </button>
          </div>
        </div>
      </section>

      {/* Partner Profile Card */}
      <section className="card profile-card" style={{ marginTop: 14 }}>
        <span className="profile-initials">{partnerInitials}</span>
        <div>
          <h2>{partnerName}</h2>
          <p>{partnerPhone} · FreshGo Partner</p>
          <div style={{ display: "flex", gap: 10, marginTop: 4, fontSize: 11, color: "#5c6b66" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
              <Star size={12} color="#e5623e" fill="#e5623e" /> {rating.toFixed(1)}
            </span>
            <span>•</span>
            <span>{completedCount} runs delivered</span>
            <span>•</span>
            <span>COD in Hand: ₹{cashInHand}</span>
          </div>
        </div>
      </section>

      {/* Fulfillment Hub Section: Request-Only Transfers (Direct Switching Prohibited) */}
      <section className="settings-section">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "10px" }}>
          <h2>Fulfillment Hub</h2>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#1f4d46" }}>
            Assigned Hub & Transfer Requests
          </span>
        </div>

        {/* Current Assigned & Approved Hub */}
        <div
          className="card setting-card"
          style={{
            padding: "16px",
            marginBottom: "12px",
            border: "1.5px solid #1f4d46",
            background: "#f4f8f6",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: "10px",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "#1f4d46",
                color: "#FFFFFF",
                padding: "4px 10px",
                borderRadius: "999px",
                fontSize: "10px",
                fontWeight: 800,
                letterSpacing: "0.5px",
              }}
            >
              <Check size={12} strokeWidth={3} />
              CURRENT ASSIGNED HUB (APPROVED)
            </div>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 800,
                color: "#1f4d46",
                background: "#e4ece9",
                padding: "3px 8px",
                borderRadius: "6px",
              }}
            >
              {selectedHub?.code || "PRIMARY"}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: "10px",
                background: "#1f4d46",
                color: "#FFFFFF",
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
              }}
            >
              <Building size={20} />
            </div>
            <div>
              <strong style={{ fontSize: "14px", color: "#0f2e29", display: "block" }}>
                {selectedHub?.name || "Kozhikode Fulfillment Center"}
              </strong>
              <span style={{ fontSize: "11.5px", color: "#5c6b66", display: "block", marginTop: "3px" }}>
                {selectedHub?.address}, {selectedHub?.city}
              </span>
              <span
                style={{
                  display: "inline-block",
                  fontSize: "11px",
                  color: "#2e7d5b",
                  fontWeight: 700,
                  marginTop: "6px",
                }}
              >
                ● You receive delivery dispatches exclusively from this hub
              </span>
            </div>
          </div>
        </div>

        {/* Transfer Notice Banner */}
        <div
          style={{
            padding: "12px 14px",
            borderRadius: "10px",
            background: "#fff9f5",
            border: "1px solid #fbd4c8",
            display: "flex",
            gap: "10px",
            alignItems: "flex-start",
            marginBottom: "14px",
          }}
        >
          <AlertCircle size={16} color="#e5623e" style={{ flexShrink: 0, marginTop: "2px" }} />
          <div style={{ fontSize: "11.5px", color: "#6e2b18", lineHeight: 1.45 }}>
            <strong>Hub Transfer Policy:</strong> Fulfillment hubs cannot be switched instantly by riders. To transfer to another hub, you must submit a transfer request and visit the new hub in person with your original Driving Licence for physical document verification by the Hub Admin.
          </div>
        </div>

        {/* Transfer Submitted Success Notice */}
        {transferSubmittedHub && (
          <div
            style={{
              padding: "14px",
              borderRadius: "12px",
              background: "#e8f5e9",
              border: "1.5px solid #2e7d5b",
              marginBottom: "14px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                color: "#1f4d46",
                fontWeight: 800,
                fontSize: "13px",
                marginBottom: "6px",
              }}
            >
              <CheckCircle2 size={18} color="#2e7d5b" />
              Transfer Request Submitted for {transferSubmittedHub.name}!
            </div>
            <p style={{ margin: "0 0 8px", fontSize: "12px", color: "#153a34", lineHeight: 1.45 }}>
              Your request to transfer to <strong>{transferSubmittedHub.name}</strong> has been forwarded to the Hub Admin.
            </p>
            <div
              style={{
                background: "#FFFFFF",
                padding: "10px 12px",
                borderRadius: "8px",
                fontSize: "11px",
                color: "#0f2e29",
                border: "1px dashed #2e7d5b",
              }}
            >
              📍 <strong>Mandatory In-Person Visit:</strong> Please visit{" "}
              <strong>{transferSubmittedHub.name}</strong> ({transferSubmittedHub.address},{" "}
              {transferSubmittedHub.city}) with your original Driving Licence for physical document verification.
            </div>
            <button
              type="button"
              onClick={() => setTransferSubmittedHub(null)}
              style={{
                marginTop: "10px",
                background: "#1f4d46",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "6px",
                padding: "6px 14px",
                fontSize: "11px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Understood
            </button>
          </div>
        )}

        {/* Other Hubs: Request Transfer Available */}


        {/* Transfer Confirmation Modal */}

      </section>

      {/* Order Alerts & Sound Preferences */}
      <section className="settings-section">
        <h2>Order Alerts & Sound</h2>
        <div className="card setting-card" style={{ padding: "16px" }}>
          {/* Main Toggle */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  background: settings.soundAlerts !== false ? "#e4ece9" : "#f1f5f9",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: settings.soundAlerts !== false ? "#1f4d46" : "#64748b",
                }}
              >
                <Volume2 size={20} />
              </div>
              <div>
                <strong style={{ fontSize: "14px", display: "block", color: "#111827" }}>
                  Continuous Order Ringing
                </strong>
                <span style={{ fontSize: "12px", color: "#6b7280" }}>
                  Alert sound loops continuously until order is accepted
                </span>
              </div>
            </div>
            <button
              className={`duty-toggle-switch ${settings.soundAlerts !== false ? "on" : ""}`}
              type="button"
              role="switch"
              aria-checked={settings.soundAlerts !== false}
              aria-label="Toggle continuous order alert"
              onClick={() =>
                onUpdateSettings({ soundAlerts: settings.soundAlerts === false ? true : false })
              }
            >
              <i />
            </button>
          </div>

          {/* Loop Behavior Info Notice */}
          <div
            style={{
              marginTop: 12,
              padding: "10px 12px",
              background: "#f0fdf4",
              border: "1px dashed #2e7d5b",
              borderRadius: "8px",
              fontSize: "11px",
              color: "#166534",
              display: "flex",
              alignItems: "center",
              gap: 8,
              lineHeight: 1.4,
            }}
          >
            <span style={{ fontSize: "15px" }}>🔁</span>
            <span>
              <strong>Loop Mode Active:</strong> Incoming orders ring repeatedly every 3.2s with audio & vibration until you tap <strong>Accept Delivery</strong>.
            </span>
          </div>

          {/* Sound Presets List */}
          <div style={{ marginTop: 16 }}>
            <span
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: "#1f2937",
                display: "block",
                marginBottom: 8,
              }}
            >
              Select Alert Tone ({soundOptions.length} Options)
            </span>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {soundOptions.map((opt) => {
                const isSelected = (settings.alertSound || "chime") === opt.id;
                return (
                  <div
                    key={opt.id}
                    onClick={() => {
                      onUpdateSettings({ alertSound: opt.id });
                      onTestSoundAlert?.(opt.id);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 12px",
                      borderRadius: "10px",
                      border: isSelected ? "2px solid #1f4d46" : "1px solid #e5e7eb",
                      background: isSelected ? "#f4f8f6" : "#ffffff",
                      cursor: "pointer",
                      transition: "all 0.15s ease-in-out",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: "50%",
                          border: isSelected ? "5px solid #1f4d46" : "2px solid #9ca3af",
                          backgroundColor: "#ffffff",
                          boxSizing: "border-box",
                          flexShrink: 0,
                        }}
                      />
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <strong
                            style={{
                              fontSize: "13px",
                              color: isSelected ? "#1f4d46" : "#1f2937",
                            }}
                          >
                            {opt.title}
                          </strong>
                          <span
                            style={{
                              fontSize: "10px",
                              fontWeight: 700,
                              padding: "1px 6px",
                              borderRadius: "4px",
                              background: isSelected ? "#dcfce7" : "#f3f4f6",
                              color: isSelected ? "#166534" : "#6b7280",
                            }}
                          >
                            {opt.tag}
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: "11px",
                            color: "#6b7280",
                            display: "block",
                            marginTop: 2,
                          }}
                        >
                          {opt.description}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      title={`Preview ${opt.title}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onTestSoundAlert?.(opt.id);
                      }}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "6px 12px",
                        borderRadius: "6px",
                        background: isSelected ? "#1f4d46" : "#f1f5f9",
                        color: isSelected ? "#ffffff" : "#334155",
                        fontSize: "11px",
                        fontWeight: 700,
                        border: "none",
                        cursor: "pointer",
                        flexShrink: 0,
                      }}
                    >
                      <Volume2 size={13} /> Test
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Work Preferences */}
      <section className="settings-section">
        <h2>Work Preferences</h2>
        <div className="card setting-card">
          <div className="setting-detail">
            <Bike size={18} />
            <div>
              <span>Vehicle Type</span>
              <strong>{settings.vehicle}</strong>
            </div>
          </div>
          <div className="choice-group" aria-label="Vehicle">
            {(["Bike", "Scooter"] as const).map((vehicle) => (
              <button
                key={vehicle}
                className={settings.vehicle === vehicle ? "active" : ""}
                type="button"
                onClick={() => onUpdateSettings({ vehicle })}
              >
                {vehicle}
              </button>
            ))}
          </div>
          <div className="setting-detail bordered">
            <MapPinned size={18} />
            <div>
              <span>Active City Area</span>
              <strong>{selectedHub?.city || "Kozhikode"}</strong>
            </div>
            <ChevronRight size={17} />
          </div>
        </div>
      </section>

      {/* Support & Safety Links */}
      <section className="settings-section">
        <h2>Support & Safety</h2>
        <div className="card setting-card support-links">
          <button type="button" onClick={onOpenHelp}>
            <BadgeHelp size={18} /> Help Centre <ChevronRight size={17} />
          </button>
          <button type="button" onClick={onOpenSafety}>
            <ShieldCheck size={18} /> Safety Toolkit <ChevronRight size={17} />
          </button>
          <button type="button" onClick={onOpenReport}>
            <Volume2 size={18} /> Report an Issue <ChevronRight size={17} />
          </button>
        </div>
      </section>

      {/* Logout Action */}
      <section className="settings-section" style={{ marginBottom: 30 }}>
        <button
          type="button"
          onClick={onLogout}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: "14px",
            border: "1px solid #fca5a5",
            borderRadius: "12px",
            background: "#fff5f3",
            color: "#be4436",
            fontSize: "13px",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          <LogOut size={16} /> Sign Out Partner Account
        </button>
      </section>
    </>
  );
}
