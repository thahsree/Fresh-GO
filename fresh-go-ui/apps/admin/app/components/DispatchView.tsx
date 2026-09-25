"use client";

import { useState } from "react";
import { QueueOrder, ActivePartner } from "../lib/api";

type DispatchViewProps = {
  assigned: string[];
  onAssign: (orderId: string, partnerProfileId?: string) => void;
  orders?: QueueOrder[];
  partners?: ActivePartner[];
};

export function DispatchView({
  assigned,
  onAssign,
  orders = [],
  partners = [],
}: DispatchViewProps) {
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>("");

  const unassignedOrders = orders.filter(
    (o) =>
      !o.deliveryPartner &&
      o.status !== "ASSIGNED" &&
      o.status !== "OUT_FOR_DELIVERY" &&
      o.status !== "DELIVERED" &&
      !assigned.includes(o.id)
  );

  return (
    <div className="grid">
      <section className="panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2>Live dispatch & delivery partners</h2>
          <span className="badge success">
            {partners.length > 0 ? `${partners.length} online rider${partners.length > 1 ? "s" : ""}` : "1 partner seeded"}
          </span>
        </div>

        <div className="attention" style={{ marginBottom: 18 }}>
          {partners.length === 0 ? (
            <div style={{ padding: "10px 0" }}>
              <div>
                <strong>Ramesh K. (Zone 1 Rider)</strong>
                <p className="muted" style={{ margin: "2px 0 0" }}>
                  Bike · +91 91234 56789 · ⭐ 4.9 · Kozhikode Hub
                </p>
              </div>
              <span className="badge success">Available</span>
            </div>
          ) : (
            partners.map((partner) => {
              const partnerName =
                partner.name || partner.user?.name || "Delivery Partner";
              const partnerPhone =
                partner.phone || partner.user?.phone || "+91 91234 56789";
              const vehicle = partner.vehicleType || "BIKE";
              const rating = partner.rating || 4.9;
              const isBusy = (partner.activeOrdersCount || 0) > 0;

              return (
                <div key={partner.id} style={{ padding: "10px 0" }}>
                  <div>
                    <strong>{partnerName}</strong>
                    <p className="muted" style={{ margin: "2px 0 0" }}>
                      {vehicle} · {partnerPhone} · ⭐ {rating}
                    </p>
                  </div>
                  <span
                    className={`badge ${isBusy ? "warning" : "success"}`}
                  >
                    {isBusy
                      ? `${partner.activeOrdersCount} on delivery`
                      : "Available"}
                  </span>
                </div>
              );
            })
          )}
        </div>

        <div className="map-placeholder">
          <div>
            <div style={{ fontWeight: 800, color: "#1F4D46", marginBottom: 4 }}>
              📍 FreshGo Central Hub · Mavoor Road
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>
              Coverage: Zone 1 (12 km radius · Kozhikode Central) · Instant 25-min Dispatch
            </div>
          </div>
        </div>
      </section>

      <section className="panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2>Unassigned orders queue</h2>
          <span className="badge warning">
            {unassignedOrders.length} unassigned
          </span>
        </div>

        {partners.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: 4 }}>
              Select dispatch partner:
            </label>
            <select
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "6px",
                border: "1px solid var(--border)",
                fontSize: "12px",
              }}
              value={selectedPartnerId}
              onChange={(e) => setSelectedPartnerId(e.target.value)}
            >
              <option value="">Auto-assign nearest partner</option>
              {partners.map((p) => {
                const partnerName = p.name || p.user?.name || "Rider";
                const vehicle = p.vehicleType || "BIKE";
                return (
                  <option key={p.id} value={p.id}>
                    {partnerName} ({vehicle})
                  </option>
                );
              })}
            </select>
          </div>
        )}

        {unassignedOrders.length === 0 ? (
          <div
            className="attention"
            style={{
              textAlign: "center",
              padding: "24px 14px",
              background: "#F4FAF6",
              borderRadius: "8px",
              border: "1px solid #D6ECE0",
            }}
          >
            <div
              style={{
                color: "#1F4D46",
                fontWeight: 700,
                fontSize: "14px",
                marginBottom: 4,
              }}
            >
              ✓ All queue orders assigned
            </div>
            <p className="muted" style={{ margin: 0, fontSize: "12px" }}>
              Active delivery riders are fulfilling dispatches. New customer orders will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="attention">
            {unassignedOrders.map((o) => (
              <div className="row" key={o.id}>
                <div>
                  <strong>#{o.orderNumber || o.id.slice(0, 8)}</strong>
                  <span className="muted">
                    {" "}· {o.customer?.name || "Customer"} · Rs {o.totalAmount}
                  </span>
                </div>
                <button
                  className="assign"
                  disabled={assigned.includes(o.id)}
                  onClick={() => onAssign(o.id, selectedPartnerId || undefined)}
                >
                  {assigned.includes(o.id) ? "Assigned" : "Assign rider"}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
