import React, { useState, useEffect } from "react";
import { Button } from "@fresh-food/ui";
import { Bell, CheckCircle2, CircleDollarSign, MapPin, PackageCheck, Radio, VolumeX, X } from "lucide-react";
import { DeliveryRequest } from "../models/delivery";
import { DeliveryHub } from "../lib/api";

type DashboardViewProps = {
  isOnline: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onSilenceAlert?: () => void;
  onOpenHistory: () => void;
  request: DeliveryRequest | null;
  availableOrdersCount?: number;
  todayEarnings: number;
  selectedHub: DeliveryHub | null;
  onOpenSettings?: () => void;
};

export function DashboardView({
  isOnline,
  onAccept,
  onDecline,
  onSilenceAlert,
  onOpenHistory,
  request,
  availableOrdersCount = 0,
  todayEarnings,
  selectedHub,
  onOpenSettings,
}: DashboardViewProps) {
  const [isAlertMuted, setIsAlertMuted] = useState(false);

  useEffect(() => {
    setIsAlertMuted(false);
  }, [request?.id]);

  const todayDate = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });

  return (
    <>
      <div className="view-heading">
        <p className="eyebrow">{todayDate}</p>
        <h1>Fulfillment Radar</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
          <span style={hubBadgeStyle}>
            <MapPin size={12} color="#1f4d46" />
            {selectedHub ? `${selectedHub.name} (${selectedHub.code})` : "No Hub Selected"}
          </span>
          {onOpenSettings && (
            <button type="button" onClick={onOpenSettings} style={changeHubLinkStyle}>
              Change Hub
            </button>
          )}
        </div>
      </div>

      <section className="metric-grid" aria-label="Today’s delivery summary">
        <div className="metric-card">
          <PackageCheck size={18} />
          <strong>{availableOrdersCount}</strong>
          <span>Orders at hub</span>
        </div>
        <div className="metric-card">
          <CheckCircle2 size={18} />
          <strong>{request ? "1" : "0"}</strong>
          <span>Ready to accept</span>
        </div>
        {/* Earnings metric card commented out
        <div className="metric-card highlight">
          <CircleDollarSign size={18} />
          <strong>₹{todayEarnings.toLocaleString()}</strong>
          <span>Earned today</span>
        </div>
        */}
      </section>

      {request ? (
        <section className="card request-card" style={{ borderColor: "#1f4d46", borderWidth: 2 }}>
          <div className="card-heading">
            <div>
              <span className="status-label" style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <span
                  style={{
                    display: "inline-block",
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    backgroundColor: isAlertMuted ? "#9ca3af" : "#2e7d5b",
                    animation: isAlertMuted ? "none" : "pulse 1.2s infinite",
                  }}
                />
                <Bell size={12} color={isAlertMuted ? "#6b7280" : "#2e7d5b"} />
                {isAlertMuted ? "Alert Muted" : "Alert Ringing"} · Ready for Pickup
              </span>
              <h2>Order #{request.orderNumber || request.id}</h2>
            </div>
            <span className="eta-chip">{request.eta}</span>
          </div>

          <div className="delivery-route">
            <div>
              <i className="route-point pickup" />
              <span>Pickup Hub</span>
              <strong>{request.pickup}</strong>
              <small>{request.pickupAddress}</small>
            </div>
            <div>
              <i className="route-point drop" />
              <span>Customer Drop-off</span>
              <strong>{request.dropAddress}</strong>
              <small>
                {request.distance} · {request.items} items
                {request.itemsSummary ? ` (${request.itemsSummary})` : ""}
              </small>
            </div>
          </div>

          <div className="request-meta">
            <span>{request.payment}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {!isAlertMuted && onSilenceAlert && (
                <button
                  type="button"
                  onClick={() => {
                    onSilenceAlert();
                    setIsAlertMuted(true);
                  }}
                  title="Silence alert chime"
                  style={{
                    background: "#f3f4f6",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    padding: "4px 8px",
                    fontSize: "11px",
                    color: "#4b5563",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  <VolumeX size={12} /> Silence Chime
                </button>
              )}
              {/* Earnings on order alert card commented out
              <strong style={{ color: "#1f4d46", fontSize: 13 }}>
                Earn ₹{request.earnings}
              </strong>
              */}
            </div>
          </div>

          {!isOnline && (
            <p className="inline-notice">You are currently offline. Go online in Settings to accept this request.</p>
          )}

          <div className="split-actions">
            <Button
              variant="outline"
              label="Dismiss"
              icon={<X size={17} />}
              onPress={() => onDecline()}
            />
            <Button
              variant="primary"
              label="Accept Delivery"
              disabled={!isOnline}
              onPress={() => onAccept()}
            />
          </div>
        </section>
      ) : (
        <section className="empty-state">
          <span className="empty-icon" style={{ background: "#e4ece9", color: "#1f4d46" }}>
            <Radio size={24} style={{ animation: "pulse 2s infinite" }} />
          </span>
          <h2>Listening for Hub Orders</h2>
          <p>
            {isOnline
              ? `Connected to ${selectedHub?.name || "your hub"}. Real-time customer orders placed for this hub will appear here automatically.`
              : "You are currently offline. Switch on Duty Status to start receiving dispatch requests."}
          </p>
        </section>
      )}

      <button className="text-action" type="button" onClick={onOpenHistory}>
        View today’s completed deliveries
      </button>
    </>
  );
}

const hubBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  background: "#e4ece9",
  color: "#1f4d46",
  padding: "4px 8px",
  borderRadius: "999px",
  fontSize: "11px",
  fontWeight: 700,
};

const changeHubLinkStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "#1f4d46",
  fontSize: "11px",
  fontWeight: 700,
  textDecoration: "underline",
  cursor: "pointer",
  padding: 0,
};
