import React from "react";
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
} from "lucide-react";
import { DeliverySettings } from "../models/delivery";
import { DeliveryHub, DeliveryUser } from "../lib/api";

type SettingsViewProps = {
  settings: DeliverySettings;
  onUpdateSettings: (update: Partial<DeliverySettings>) => void;
  isOnline: boolean;
  onToggleOnline: () => void;
  hubs: DeliveryHub[];
  selectedHub: DeliveryHub | null;
  onChangeHub: (hub: DeliveryHub) => void;
  user: DeliveryUser | null;
  onLogout: () => void;
  onOpenHelp?: () => void;
  onOpenSafety?: () => void;
  onOpenReport?: () => void;
};

export function SettingsView({
  settings,
  onUpdateSettings,
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

      {/* Fulfillment Hub Selection (Zero Dummy Data, Real Backend Hubs) */}
      <section className="settings-section">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <h2>Fulfillment Hub</h2>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#1f4d46" }}>
            Orders received from this hub
          </span>
        </div>
        <div className="card setting-card" style={{ padding: "8px" }}>
          {hubs.length === 0 ? (
            <div style={{ padding: 14, textAlign: "center", color: "#5c6b66", fontSize: 12 }}>
              Loading registered fulfillment hubs...
            </div>
          ) : (
            hubs.map((hub) => {
              const isSelected = selectedHub?.id === hub.id;
              return (
                <div
                  key={hub.id}
                  onClick={() => onChangeHub(hub)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 14px",
                    borderRadius: "10px",
                    cursor: "pointer",
                    background: isSelected ? "#e4ece9" : "transparent",
                    transition: "background 0.15s ease",
                    borderBottom: "1px solid #e3ddcf",
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "8px",
                      background: isSelected ? "#1f4d46" : "#f6f2ea",
                      color: isSelected ? "#FFFFFF" : "#1f4d46",
                      display: "grid",
                      placeItems: "center",
                      flexShrink: 0,
                    }}
                  >
                    <MapPin size={16} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <strong style={{ fontSize: 13, color: isSelected ? "#1f4d46" : "#17211e" }}>
                        {hub.name}
                      </strong>
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 800,
                          padding: "2px 6px",
                          borderRadius: 4,
                          background: isSelected ? "#1f4d46" : "#e3ddcf",
                          color: isSelected ? "#FFFFFF" : "#5c6b66",
                        }}
                      >
                        {hub.code}
                      </span>
                    </div>
                    <span style={{ display: "block", fontSize: 11, color: "#5c6b66", marginTop: 2 }}>
                      {hub.address}, {hub.city}
                    </span>
                  </div>
                  {isSelected && (
                    <div
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        background: "#1f4d46",
                        color: "#FFFFFF",
                        display: "grid",
                        placeItems: "center",
                      }}
                    >
                      <Check size={13} strokeWidth={3} />
                    </div>
                  )}
                </div>
              );
            })
          )}
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
