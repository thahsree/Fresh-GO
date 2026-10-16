"use client";

import { useState, useMemo, useEffect } from "react";
import { api, QueueOrder, ActivePartner, AdminUser } from "../lib/api";
import { CustomDropdown } from "./CustomDropdown";
import { CancelOrderModal } from "./CancelOrderModal";
import { ClearCashModal } from "./ClearCashModal";
import { Search, Loader2 } from "lucide-react";

type DispatchViewProps = {
  assigned: string[];
  onAssign: (orderId: string, partnerProfileId?: string) => Promise<void> | void;
  onUpdateStatus?: (orderId: string, status: string, note?: string) => Promise<void> | void;
  orders?: QueueOrder[];
  partners?: ActivePartner[];
  currentUser?: AdminUser | null;
};

type FilterTab = "ALL" | "PLACED" | "CUTTING" | "PACKED" | "ASSIGNED" | "UNASSIGNED";

const ALL_STATUS_OPTIONS = [
  { value: "PLACED", label: "Placed" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "CUTTING_PREPARING", label: "Cutting / Prep" },
  { value: "PACKED", label: "Packed" },
  { value: "DISPATCH_READY", label: "Ready to Dispatch" },
  { value: "ASSIGNED", label: "Assigned to Rider" },
  { value: "OUT_FOR_DELIVERY", label: "Out for Delivery" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "CANCELLED", label: "Cancelled" },
];

function isActiveOrder(o: QueueOrder): boolean {
  const s = (o.status || "").toUpperCase();
  return (
    s !== "DELIVERED" &&
    s !== "CANCELLED" &&
    s !== "FAILED_DELIVERY" &&
    s !== "RETURNED_TO_HUB"
  );
}

function getStatusBadge(status: string): { label: string; bg: string; color: string; icon: string } {
  switch (status.toUpperCase()) {
    case "PLACED":
      return { label: "Placed", bg: "#FEF3C7", color: "#92400E", icon: "📋" };
    case "CONFIRMED":
      return { label: "Confirmed", bg: "#E0F2FE", color: "#0369A1", icon: "✓" };
    case "CUTTING_PREPARING":
      return { label: "Cutting / Prep", bg: "#FFEDD5", color: "#C2410C", icon: "🔪" };
    case "PACKED":
      return { label: "Packed", bg: "#EDE9FE", color: "#6D28D9", icon: "📦" };
    case "DISPATCH_READY":
      return { label: "Ready to Dispatch", bg: "#DCFCE7", color: "#15803D", icon: "🚀" };
    case "ASSIGNED":
      return { label: "Assigned", bg: "#CCFBF1", color: "#0F766E", icon: "👤" };
    case "OUT_FOR_DELIVERY":
      return { label: "Out for Delivery", bg: "#D1FAE5", color: "#047857", icon: "🚴" };
    default:
      return { label: status, bg: "#F1F5F9", color: "#475569", icon: "•" };
  }
}

function formatAddress(order: QueueOrder): string {
  if ((order as any).deliveryAddressSnapshotJson) {
    try {
      const snap =
        typeof (order as any).deliveryAddressSnapshotJson === "string"
          ? JSON.parse((order as any).deliveryAddressSnapshotJson)
          : (order as any).deliveryAddressSnapshotJson;
      const parts = [snap.title, snap.street, snap.area, snap.city].filter(Boolean);
      if (parts.length > 0) return parts.join(", ");
    } catch {}
  }
  if (order.deliveryAddress) {
    if (typeof order.deliveryAddress === "string") return order.deliveryAddress;
    const parts = [
      order.deliveryAddress.title,
      order.deliveryAddress.street,
      order.deliveryAddress.area,
      order.deliveryAddress.city,
    ].filter(Boolean);
    if (parts.length > 0) return parts.join(", ");
  }
  return "";
}

function getTimeAgo(dateString?: string): string {
  if (!dateString) return "";
  try {
    const diffMs = Date.now() - new Date(dateString).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours}h ${diffMins % 60}m ago`;
  } catch {
    return "";
  }
}

export function DispatchView({
  assigned,
  onAssign,
  onUpdateStatus,
  orders = [],
  partners = [],
  currentUser,
}: DispatchViewProps) {
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>("");
  const [rowPartnerMap, setRowPartnerMap] = useState<Record<string, string>>({});
  const [filterTab, setFilterTab] = useState<FilterTab>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);

  const [orderToCancel, setOrderToCancel] = useState<{
    id: string;
    orderNumber?: string;
    customerName?: string;
    totalAmount?: number;
  } | null>(null);

  const [partnerForCashClear, setPartnerForCashClear] = useState<{
    id: string;
    name?: string;
    phone?: string;
    vehicleType?: string;
    codCashInHand?: number;
    hubName?: string;
  } | null>(null);

  const [livePartners, setLivePartners] = useState<ActivePartner[]>(partners);
  useEffect(() => {
    setLivePartners(partners);
  }, [partners]);

  // All active orders in fulfillment pipeline
  const activeOrders = useMemo(() => {
    return orders.filter(isActiveOrder);
  }, [orders]);

  // Tab counts
  const placedCount = useMemo(
    () => activeOrders.filter((o) => o.status === "PLACED" || o.status === "CONFIRMED").length,
    [activeOrders]
  );
  const cuttingCount = useMemo(
    () => activeOrders.filter((o) => o.status === "CUTTING_PREPARING").length,
    [activeOrders]
  );
  const packedReadyCount = useMemo(
    () => activeOrders.filter((o) => o.status === "PACKED" || o.status === "DISPATCH_READY").length,
    [activeOrders]
  );
  const assignedCount = useMemo(
    () => activeOrders.filter((o) => o.status === "ASSIGNED" || o.status === "OUT_FOR_DELIVERY").length,
    [activeOrders]
  );
  const unassignedCount = useMemo(
    () =>
      activeOrders.filter(
        (o) =>
          !o.deliveryPartner &&
          o.status !== "ASSIGNED" &&
          o.status !== "OUT_FOR_DELIVERY" &&
          !assigned.includes(o.id)
      ).length,
    [activeOrders, assigned]
  );

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    let list = activeOrders;

    if (filterTab === "PLACED") {
      list = list.filter((o) => o.status === "PLACED" || o.status === "CONFIRMED");
    } else if (filterTab === "CUTTING") {
      list = list.filter((o) => o.status === "CUTTING_PREPARING");
    } else if (filterTab === "PACKED") {
      list = list.filter((o) => o.status === "PACKED" || o.status === "DISPATCH_READY");
    } else if (filterTab === "ASSIGNED") {
      list = list.filter((o) => o.status === "ASSIGNED" || o.status === "OUT_FOR_DELIVERY");
    } else if (filterTab === "UNASSIGNED") {
      list = list.filter(
        (o) =>
          !o.deliveryPartner &&
          o.status !== "ASSIGNED" &&
          o.status !== "OUT_FOR_DELIVERY" &&
          !assigned.includes(o.id)
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((o) => {
        const num = (o.orderNumber || o.id).toLowerCase();
        const custName = (o.customer?.name || "").toLowerCase();
        const custPhone = (o.customer?.phone || "").toLowerCase();
        const itemsText = (o.items || [])
          .map((i: any) => `${i.product?.name || ""} ${i.cutName || ""}`)
          .join(" ")
          .toLowerCase();
        return (
          num.includes(q) ||
          custName.includes(q) ||
          custPhone.includes(q) ||
          itemsText.includes(q)
        );
      });
    }

    return list;
  }, [activeOrders, filterTab, searchQuery, assigned]);

  const onlineCount = partners.filter((p) => p.isOnline).length;
  const hubName = currentUser?.hub?.name || "Fulfillment Hub";
  const hubAddress = currentUser?.hub?.address || "Local Express Delivery Coverage Zone";

  // Action helper with loading state
  const handleUpdateStatus = async (orderId: string, nextStatus: string) => {
    if (!onUpdateStatus) return;
    setBusyOrderId(orderId);
    try {
      await onUpdateStatus(orderId, nextStatus);
    } finally {
      setBusyOrderId(null);
    }
  };

  const handleAssignRider = async (orderId: string, partnerId?: string) => {
    if (partners.length === 0) {
      alert(
        "No delivery partners are registered or online for this hub. Please onboard or approve riders for this hub first."
      );
      return;
    }
    setBusyOrderId(orderId);
    try {
      await onAssign(orderId, partnerId);
    } finally {
      setBusyOrderId(null);
    }
  };

  return (
    <div className="dispatch-layout">
      {/* Primary Column: Active Fulfillment & Dispatch Orders */}
      <section className="panel" style={{ minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 14,
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: "19px" }}>Active fulfillment orders</h2>
            <p className="muted" style={{ fontSize: "12px", marginTop: "2px" }}>
              Live pipeline for butchery prep, packaging, and rider dispatch
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span className="badge warning">
              {activeOrders.length} active
            </span>
            {unassignedCount > 0 && (
              <span className="badge error">
                {unassignedCount} unassigned
              </span>
            )}
          </div>
        </div>

        {/* Filter Tabs / Pills (Horizontally scrollable on mobile) */}
        <div className="dispatch-filter-pills">
          {[
            { key: "ALL", label: "All Active", count: activeOrders.length },
            { key: "PLACED", label: "Placed / Confirmed", count: placedCount },
            { key: "CUTTING", label: "Cutting / Prep", count: cuttingCount },
            { key: "PACKED", label: "Packed / Ready", count: packedReadyCount },
            { key: "ASSIGNED", label: "Out / Assigned", count: assignedCount },
            { key: "UNASSIGNED", label: "Needs Rider", count: unassignedCount },
          ].map((tab) => {
            const isSelected = filterTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                className="dispatch-filter-pill"
                onClick={() => setFilterTab(tab.key as FilterTab)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "7px 12px",
                  borderRadius: "999px",
                  fontSize: "12px",
                  fontWeight: 700,
                  border: isSelected ? "1px solid var(--primary)" : "1px solid var(--border)",
                  background: isSelected ? "var(--primary)" : "#FFF",
                  color: isSelected ? "#FFF" : "var(--muted)",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "all 0.15s ease",
                }}
              >
                <span>{tab.label}</span>
                <span
                  style={{
                    padding: "1px 6px",
                    borderRadius: "10px",
                    fontSize: "10px",
                    fontWeight: 800,
                    background: isSelected ? "rgba(255, 255, 255, 0.25)" : "var(--alt)",
                    color: isSelected ? "#FFF" : "var(--dark)",
                  }}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Quick Search Toolbar */}
        <div style={{ marginBottom: "14px", position: "relative" }}>
          <Search
            size={16}
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--soft)",
              pointerEvents: "none",
            }}
          />
          <input
            type="text"
            placeholder="Search by order #, customer, phone, or cut..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "9px 12px 9px 36px",
              fontSize: "13px",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              background: "#FFF",
              outline: "none",
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              style={{
                position: "absolute",
                right: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                border: 0,
                background: "transparent",
                color: "var(--muted)",
                fontSize: "11px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Active Orders List */}
        {filteredOrders.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "32px 14px",
              background: "#F8FAF9",
              borderRadius: "12px",
              border: "1px dashed var(--border)",
            }}
          >
            <div style={{ fontSize: "28px", marginBottom: "8px" }}>📦</div>
            <div style={{ color: "#1F4D46", fontWeight: 700, fontSize: "14px", marginBottom: 4 }}>
              {activeOrders.length === 0
                ? "No active orders in fulfillment pipeline"
                : "No orders match the selected filter"}
            </div>
            <p className="muted" style={{ margin: 0, fontSize: "12px" }}>
              {activeOrders.length === 0
                ? "New orders placed by customers will automatically appear here."
                : "Try selecting 'All Active' or clearing your search query."}
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "12px" }}>
            {filteredOrders.map((o) => {
              const badge = getStatusBadge(o.status);
              const isOrderBusy = busyOrderId === o.id;
              const addressStr = formatAddress(o);
              const timeAgo = getTimeAgo(o.placedAt);

              const currentChoice =
                rowPartnerMap[o.id] !== undefined
                  ? rowPartnerMap[o.id]
                  : selectedPartnerId;

              const partnerName =
                o.deliveryPartner?.user?.name ||
                (o as any).deliveryPartnerName ||
                "Rider";
              const partnerPhone =
                o.deliveryPartner?.user?.phone ||
                (o as any).deliveryPartnerPhone ||
                "";
              const isAssigned =
                Boolean(o.deliveryPartner) ||
                o.status === "ASSIGNED" ||
                o.status === "OUT_FOR_DELIVERY" ||
                assigned.includes(o.id);

              return (
                <div key={o.id} className="dispatch-card">
                  {/* Top Header Row */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      flexWrap: "wrap",
                      gap: "8px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                      <strong style={{ fontSize: "14px", color: "var(--dark)" }}>
                        #{o.orderNumber || o.id.slice(0, 8)}
                      </strong>

                      {/* Status Badge */}
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "3px 8px",
                          borderRadius: "999px",
                          fontSize: "11px",
                          fontWeight: 800,
                          background: badge.bg,
                          color: badge.color,
                        }}
                      >
                        <span>{badge.icon}</span>
                        <span>{badge.label}</span>
                      </span>

                      {timeAgo && (
                        <span style={{ fontSize: "11px", color: "var(--soft)" }}>
                          · {timeAgo}
                        </span>
                      )}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontWeight: 800, fontSize: "13px", color: "var(--dark)" }}>
                        ₹{o.totalAmount}
                      </span>
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 800,
                          padding: "2px 6px",
                          borderRadius: "4px",
                          background: o.paymentMethod === "COD" ? "#FEF3C7" : "#E0F2FE",
                          color: o.paymentMethod === "COD" ? "#92400E" : "#0369A1",
                        }}
                      >
                        {o.paymentMethod || "COD"}
                      </span>
                    </div>
                  </div>

                  {/* Customer & Address Details */}
                  <div
                    style={{
                      fontSize: "12px",
                      lineHeight: "1.4",
                      color: "var(--text)",
                      wordBreak: "break-word",
                    }}
                  >
                    <span style={{ fontWeight: 700 }}>
                      👤 {o.customer?.name || "Customer"}
                    </span>
                    {o.customer?.phone && (
                      <span className="muted"> · 📞 {o.customer.phone}</span>
                    )}
                    {addressStr && (
                      <span className="muted" style={{ display: "inline" }}>
                        {" "}· 📍 {addressStr}
                      </span>
                    )}
                  </div>

                  {/* Order Items & Cuts */}
                  {o.items && o.items.length > 0 && (
                    <div
                      style={{
                        background: "#F9FAF9",
                        padding: "8px 10px",
                        borderRadius: "7px",
                        fontSize: "12px",
                        color: "#1F4D46",
                        fontWeight: 600,
                        border: "1px solid #E8EFEA",
                        lineHeight: 1.4,
                        wordBreak: "break-word",
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
                        .join("  |  ")}
                    </div>
                  )}

                  {/* Rider Assignment Info (if assigned) */}
                  {isAssigned && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "11.5px",
                        color: "#0F766E",
                        fontWeight: 700,
                        background: "#F0FDFA",
                        padding: "6px 10px",
                        borderRadius: "6px",
                        border: "1px solid #CCFBF1",
                        flexWrap: "wrap",
                      }}
                    >
                      <span>🚴 Assigned Rider:</span>
                      <span>{partnerName}</span>
                      {partnerPhone && (
                        <span style={{ color: "var(--muted)", fontWeight: 500 }}>
                          ({partnerPhone})
                        </span>
                      )}
                      {o.status === "OUT_FOR_DELIVERY" && (
                        <span className="badge success" style={{ marginLeft: "auto", fontSize: "10px" }}>
                          On Route
                        </span>
                      )}
                    </div>
                  )}

                  {/* Bottom Action Bar (Mobile Responsive) */}
                  <div className="dispatch-card-actions">
                    {/* Primary Stage Actions */}
                    <div className="dispatch-actions-primary">
                      {/* PLACED Stage */}
                      {o.status === "PLACED" && (
                        <>
                          <button
                            type="button"
                            className="assign"
                            disabled={isOrderBusy}
                            style={{
                              background: "#1F4D46",
                              color: "#FFF",
                              padding: "7px 12px",
                              fontSize: "12px",
                              borderRadius: "6px",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                            onClick={() => handleUpdateStatus(o.id, "CONFIRMED")}
                          >
                            {isOrderBusy ? <Loader2 size={13} className="animate-spin" /> : "✓"} Confirm
                          </button>
                          <button
                            type="button"
                            className="assign"
                            disabled={isOrderBusy}
                            style={{
                              background: "#B9791F",
                              color: "#FFF",
                              padding: "7px 12px",
                              fontSize: "12px",
                              borderRadius: "6px",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                            onClick={() => handleUpdateStatus(o.id, "CUTTING_PREPARING")}
                          >
                            🔪 Cut / Prep
                          </button>
                        </>
                      )}

                      {/* CONFIRMED Stage */}
                      {o.status === "CONFIRMED" && (
                        <>
                          <button
                            type="button"
                            className="assign"
                            disabled={isOrderBusy}
                            style={{
                              background: "#B9791F",
                              color: "#FFF",
                              padding: "7px 12px",
                              fontSize: "12px",
                              borderRadius: "6px",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                            onClick={() => handleUpdateStatus(o.id, "CUTTING_PREPARING")}
                          >
                            🔪 Move to Cutting
                          </button>
                          <button
                            type="button"
                            className="assign"
                            disabled={isOrderBusy}
                            style={{
                              background: "#2E7D5B",
                              color: "#FFF",
                              padding: "7px 12px",
                              fontSize: "12px",
                              borderRadius: "6px",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                            onClick={() => handleUpdateStatus(o.id, "PACKED")}
                          >
                            📦 Mark Packed
                          </button>
                        </>
                      )}

                      {/* CUTTING_PREPARING Stage */}
                      {o.status === "CUTTING_PREPARING" && (
                        <>
                          <button
                            type="button"
                            className="assign"
                            disabled={isOrderBusy}
                            style={{
                              background: "#2E7D5B",
                              color: "#FFF",
                              padding: "7px 12px",
                              fontSize: "12px",
                              borderRadius: "6px",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                            onClick={() => handleUpdateStatus(o.id, "PACKED")}
                          >
                            📦 Mark Packed
                          </button>
                          <button
                            type="button"
                            className="assign"
                            disabled={isOrderBusy}
                            style={{
                              background: "#1F4D46",
                              color: "#FFF",
                              padding: "7px 12px",
                              fontSize: "12px",
                              borderRadius: "6px",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                            onClick={() => handleUpdateStatus(o.id, "DISPATCH_READY")}
                          >
                            🚀 Ready to Dispatch
                          </button>
                        </>
                      )}

                      {/* PACKED Stage */}
                      {o.status === "PACKED" && (
                        <button
                          type="button"
                          className="assign"
                          disabled={isOrderBusy}
                          style={{
                            background: "#1F4D46",
                            color: "#FFF",
                            padding: "7px 12px",
                            fontSize: "12px",
                            borderRadius: "6px",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                          onClick={() => handleUpdateStatus(o.id, "DISPATCH_READY")}
                        >
                          🚀 Ready to Dispatch
                        </button>
                      )}

                      {/* Rider Assignment Controls (When packed, ready, or unassigned) */}
                      {(!isAssigned || o.status === "DISPATCH_READY" || o.status === "PACKED") && (
                        <div className="dispatch-rider-assign">
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
                                { value: "", label: "Auto-assign rider" },
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
                            />
                          )}
                          <button
                            className="assign"
                            disabled={isOrderBusy || partners.length === 0}
                            style={{
                              padding: "7px 12px",
                              fontSize: "12px",
                              borderRadius: "6px",
                              background: partners.length === 0 ? "#E2E8F0" : "var(--primary)",
                              color: partners.length === 0 ? "#94A3B8" : "#FFF",
                              cursor: partners.length === 0 ? "not-allowed" : "pointer",
                            }}
                            onClick={() => handleAssignRider(o.id, currentChoice || undefined)}
                          >
                            {isOrderBusy ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : partners.length === 0 ? (
                              "No riders"
                            ) : (
                              "Assign rider"
                            )}
                          </button>
                        </div>
                      )}

                      {/* ASSIGNED Stage Actions */}
                      {o.status === "ASSIGNED" && (
                        <>
                          <button
                            type="button"
                            className="assign"
                            disabled={isOrderBusy}
                            style={{
                              background: "#047857",
                              color: "#FFF",
                              padding: "7px 12px",
                              fontSize: "12px",
                              borderRadius: "6px",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                            onClick={() => handleUpdateStatus(o.id, "OUT_FOR_DELIVERY")}
                          >
                            🚴 Out for Delivery
                          </button>

                          {/* Reassign Option */}
                          {partners.length > 0 && (
                            <div className="dispatch-rider-assign">
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
                                  { value: "", label: "Reassign rider..." },
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
                              />
                              {currentChoice && (
                                <button
                                  type="button"
                                  className="assign"
                                  disabled={isOrderBusy}
                                  style={{
                                    padding: "7px 10px",
                                    fontSize: "11px",
                                    borderRadius: "6px",
                                    background: "var(--primary)",
                                    color: "#FFF",
                                  }}
                                  onClick={() => handleAssignRider(o.id, currentChoice)}
                                >
                                  Reassign
                                </button>
                              )}
                            </div>
                          )}
                        </>
                      )}

                      {/* OUT_FOR_DELIVERY Stage Actions */}
                      {o.status === "OUT_FOR_DELIVERY" && (
                        <button
                          type="button"
                          className="assign"
                          disabled={isOrderBusy}
                          style={{
                            background: "#2E7D5B",
                            color: "#FFF",
                            padding: "7px 12px",
                            fontSize: "12px",
                            borderRadius: "6px",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                          onClick={() => handleUpdateStatus(o.id, "DELIVERED")}
                        >
                          ✓ Mark Delivered
                        </button>
                      )}
                    </div>

                    {/* Secondary Actions: Quick Status Override Dropdown & Cancel */}
                    <div className="dispatch-actions-secondary">
                      {/* Compact Quick Status Override */}
                      <CustomDropdown
                        size="sm"
                        value={o.status}
                        onChange={(val) => {
                          if (val === "CANCELLED") {
                            setOrderToCancel({
                              id: o.id,
                              orderNumber: o.orderNumber || o.id.slice(0, 8),
                              customerName: o.customer?.name || o.customer?.phone,
                              totalAmount: o.totalAmount,
                            });
                          } else {
                            handleUpdateStatus(o.id, val);
                          }
                        }}
                        options={ALL_STATUS_OPTIONS}
                        align="right"
                      />

                      {/* Cancel Order Button */}
                      <button
                        type="button"
                        style={{
                          background: "#FBE7E3",
                          color: "#BE4436",
                          border: "1px solid rgba(190, 68, 54, 0.3)",
                          padding: "7px 12px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          fontWeight: 700,
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                        onClick={() => {
                          setOrderToCancel({
                            id: o.id,
                            orderNumber: o.orderNumber || o.id.slice(0, 8),
                            customerName: o.customer?.name || o.customer?.phone,
                            totalAmount: o.totalAmount,
                          });
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Secondary Column: Live Dispatch Fleet & Hub Information */}
      <section className="panel" style={{ minWidth: 0, height: "fit-content" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: "18px" }}>Delivery fleet</h2>
          <span className="badge success">
            {onlineCount} online · {partners.length} total
          </span>
        </div>

        {partners.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "var(--muted)",
                display: "block",
                marginBottom: 6,
              }}
            >
              Default dispatch partner for queue:
            </label>
            <CustomDropdown
              size="sm"
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

        <div className="attention" style={{ marginBottom: 18 }}>
          {partners.length === 0 ? (
            <div
              style={{
                padding: "20px 14px",
                textAlign: "center",
                background: "#F6F2EA",
                borderRadius: "10px",
              }}
            >
              <p style={{ margin: 0, color: "var(--muted)", fontSize: "13px", fontWeight: 700 }}>
                No delivery partners registered for {hubName} yet.
              </p>
              <small style={{ color: "var(--soft)", fontSize: "11px", display: "block", marginTop: "4px" }}>
                Delivery partners who register for this hub will appear here once approved.
              </small>
            </div>
          ) : (
            livePartners.map((partner) => {
              const partnerName =
                partner.name || partner.user?.name || "Delivery Partner";
              const partnerPhone =
                partner.phone || partner.user?.phone || "No phone number";
              const vehicle = partner.vehicleType || "BIKE";
              const rating = partner.rating || 5.0;
              const isBusy = (partner.activeOrdersCount || 0) > 0;
              const isOnline = partner.isOnline;
              const cashInHand = partner.codCashInHand || 0;

              return (
                <div
                  key={partner.id}
                  style={{
                    padding: "12px 0",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      width: "100%",
                      gap: "8px",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <strong style={{ fontSize: "13px", color: "var(--dark)" }}>
                        {partnerName}
                      </strong>
                      <p className="muted" style={{ margin: "2px 0 0", fontSize: "11px" }}>
                        {vehicle} · {partnerPhone} · ⭐ {rating}
                      </p>

                      {/* Cash in Hand Info & Clear Button */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          marginTop: "6px",
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 700,
                            padding: "2px 6px",
                            borderRadius: "4px",
                            background: cashInHand > 0 ? "#FBE7E3" : "#E3F1E9",
                            color: cashInHand > 0 ? "#BE4436" : "#2E7D5B",
                          }}
                        >
                          💵 ₹{cashInHand.toLocaleString("en-IN")} in hand
                        </span>

                        {cashInHand > 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              setPartnerForCashClear({
                                id: partner.id,
                                name: partnerName,
                                phone: partnerPhone,
                                vehicleType: vehicle,
                                codCashInHand: cashInHand,
                                hubName,
                              })
                            }
                            style={{
                              padding: "2px 7px",
                              fontSize: "10.5px",
                              fontWeight: 800,
                              borderRadius: "4px",
                              background: "#2E7D5B",
                              color: "#FFF",
                              border: 0,
                              cursor: "pointer",
                            }}
                            title="Clear collected COD cash from rider"
                          >
                            Clear Cash
                          </button>
                        )}
                      </div>
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
                </div>
              );
            })
          )}
        </div>

        {/* Hub Location & Dispatch SLA Card */}
        <div className="map-placeholder" style={{ minHeight: "160px", height: "auto" }}>
          <div style={{ textAlign: "center", padding: "16px" }}>
            <div style={{ fontWeight: 800, color: "#1F4D46", fontSize: "15px", marginBottom: 6 }}>
              📍 {hubName}
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)", maxWidth: "260px", margin: "0 auto 8px" }}>
              {hubAddress}
            </div>
            <span className="badge success" style={{ fontSize: "11px" }}>
              ⚡ Instant 25-min Dispatch Hub
            </span>
          </div>
        </div>
      </section>

      {/* Custom Confirmation Modal for Cancelling Orders */}
      <CancelOrderModal
        isOpen={Boolean(orderToCancel)}
        orderId={orderToCancel?.id || null}
        orderNumber={orderToCancel?.orderNumber}
        customerName={orderToCancel?.customerName}
        totalAmount={orderToCancel?.totalAmount}
        onClose={() => setOrderToCancel(null)}
        onConfirm={async (id, reason) => {
          if (onUpdateStatus) {
            await onUpdateStatus(id, "CANCELLED", reason);
          }
        }}
      />

      {/* Control for Admin to Clear Cash of Rider */}
      <ClearCashModal
        isOpen={Boolean(partnerForCashClear)}
        partner={partnerForCashClear}
        onClose={() => setPartnerForCashClear(null)}
        onConfirm={async (partnerId, amount, notes) => {
          try {
            await api.deliveryPartners.clearCash(partnerId, amount, notes);
            setLivePartners((prev) =>
              prev.map((p) =>
                p.id === partnerId
                  ? { ...p, codCashInHand: Math.max(0, (p.codCashInHand || 0) - amount) }
                  : p
              )
            );
            setPartnerForCashClear(null);
          } catch (err: any) {
            alert(err?.message || "Failed to clear cash for partner");
          }
        }}
      />
    </div>
  );
}
