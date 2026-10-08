"use client";

import { useState } from "react";
import { QueueOrder, ActivePartner, AdminUser } from "../lib/api";
import { CustomDropdown } from "./CustomDropdown";

type DispatchViewProps = {
  assigned: string[];
  onAssign: (orderId: string, partnerProfileId?: string) => void;
  orders?: QueueOrder[];
  partners?: ActivePartner[];
  currentUser?: AdminUser | null;
};

export function DispatchView({
  assigned,
  onAssign,
  orders = [],
  partners = [],
  currentUser,
}: DispatchViewProps) {
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>("");
  const [rowPartnerMap, setRowPartnerMap] = useState<Record<string, string>>({});

  const unassignedOrders = orders.filter(
    (o) =>
      !o.deliveryPartner &&
      o.status !== "ASSIGNED" &&
      o.status !== "OUT_FOR_DELIVERY" &&
      o.status !== "DELIVERED" &&
      !assigned.includes(o.id)
  );

  const onlineCount = partners.filter((p) => p.isOnline).length;
  const hubName = currentUser?.hub?.name || "Fulfillment Hub";
  const hubAddress = currentUser?.hub?.address || "Local Express Delivery Coverage Zone";

  return (
    <div className="grid">
      <section className="panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2>Live dispatch & delivery partners</h2>
          <span className="badge success">
            {onlineCount} online · {partners.length} total
          </span>
        </div>

        <div className="attention" style={{ marginBottom: 18 }}>
          {partners.length === 0 ? (
            <div style={{ padding: "20px 14px", textAlign: "center", background: "#F6F2EA", borderRadius: "10px" }}>
              <p style={{ margin: 0, color: "var(--muted)", fontSize: "13px", fontWeight: 700 }}>
                No delivery partners registered for {hubName} yet.
              </p>
              <small style={{ color: "var(--soft)", fontSize: "11px", display: "block", marginTop: "4px" }}>
                Delivery partners who register for this hub will appear here once approved.
              </small>
            </div>
          ) : (
            partners.map((partner) => {
              const partnerName =
                partner.name || partner.user?.name || "Delivery Partner";
              const partnerPhone =
                partner.phone || partner.user?.phone || "No phone number";
              const vehicle = partner.vehicleType || "BIKE";
              const rating = partner.rating || 5.0;
              const isBusy = (partner.activeOrdersCount || 0) > 0;
              const isOnline = partner.isOnline;

              return (
                <div key={partner.id} style={{ padding: "10px 0" }}>
                  <div>
                    <strong>{partnerName}</strong>
                    <p className="muted" style={{ margin: "2px 0 0" }}>
                      {vehicle} · {partnerPhone} · ⭐ {rating}
                    </p>
                  </div>
                  <span
                    className={`badge ${!isOnline ? "error" : isBusy ? "warning" : "success"}`}
                    style={
                      !isOnline
                        ? { background: "#EAEAEA", color: "#666" }
                        : undefined
                    }
                  >
                    {!isOnline
                      ? "Offline"
                      : isBusy
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
              📍 {hubName}
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>
              {hubAddress} · Instant 25-min Dispatch
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
              Default dispatch partner for queue:
            </label>
            <CustomDropdown
              value={selectedPartnerId}
              onChange={setSelectedPartnerId}
              options={[
                { value: "", label: "Auto-assign nearest partner" },
                ...partners.map((p) => {
                  const partnerName = p.name || p.user?.name || "Rider";
                  const vehicle = p.vehicleType || "BIKE";
                  return {
                    value: p.id,
                    label: `${partnerName} (${vehicle})`,
                    badge: p.isOnline ? "Online" : "Offline",
                    badgeColor: p.isOnline ? "#10B981" : "#94A3B8",
                  };
                }),
              ]}
            />
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
            {unassignedOrders.map((o) => {
              const currentChoice =
                rowPartnerMap[o.id] !== undefined
                  ? rowPartnerMap[o.id]
                  : selectedPartnerId;

              return (
                <div
                  className="row"
                  key={o.id}
                  style={{
                    alignItems: "center",
                    padding: "12px 0",
                    flexWrap: "wrap",
                    gap: "10px",
                  }}
                >
                  <div style={{ flex: 1, minWidth: "220px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <strong>#{o.orderNumber || o.id.slice(0, 8)}</strong>
                      <span className="muted">
                        · {o.customer?.name || "Customer"} · Rs {o.totalAmount}
                      </span>
                    </div>
                    {o.items && o.items.length > 0 && (
                      <div
                        style={{
                          fontSize: "11px",
                          color: "#1F4D46",
                          marginTop: "3px",
                          fontWeight: 600,
                        }}
                      >
                        🔪{" "}
                        {o.items
                          .map(
                            (i: any) =>
                              `${i.product?.name || "Item"}${
                                i.cutName ? ` (${i.cutName})` : ""
                              } × ${i.quantity}`
                          )
                          .join(", ")}
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {partners.length > 0 && (
                      <CustomDropdown
                        size="sm"
                        value={currentChoice}
                        onChange={(val) =>
                          setRowPartnerMap((prev) => ({
                            ...prev,
                            [o.id]: val,
                          }))
                        }
                        options={[
                          { value: "", label: "Auto-assign" },
                          ...partners.map((p) => {
                            const pName = p.name || p.user?.name || "Rider";
                            const vehicle = p.vehicleType || "BIKE";
                            return {
                              value: p.id,
                              label: `${pName} (${vehicle})`,
                              badge: p.isOnline ? "Online" : "Offline",
                              badgeColor: p.isOnline ? "#10B981" : "#94A3B8",
                            };
                          }),
                        ]}
                        style={{ minWidth: "170px" }}
                        align="right"
                      />
                    )}
                    <button
                      className="assign"
                      disabled={assigned.includes(o.id)}
                      onClick={() => onAssign(o.id, currentChoice || undefined)}
                    >
                      {assigned.includes(o.id) ? "Assigned" : "Assign rider"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
