"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Phone,
  MapPin,
  User,
  Scissors,
  Package,
  Clock,
  Truck,
  Store,
  Receipt,
  Eye,
} from "lucide-react";
import { QueueOrder } from "../lib/api";

type OrdersViewProps = {
  assigned?: string[];
  onAssign?: (id: string) => void;
  liveOrders?: QueueOrder[];
  onUpdateStatus?: (id: string, status: string) => void;
  isLoading?: boolean;
};

function formatStatus(status: string): { label: string; className: string } {
  switch (status.toUpperCase()) {
    case "CONFIRMED":
    case "PLACED":
      return { label: "Confirmed", className: "badge warning" };
    case "CUTTING_PREPARING":
      return { label: "Cutting / Prep", className: "badge warning" };
    case "PACKED":
      return { label: "Packed", className: "badge warning" };
    case "DISPATCH_READY":
      return { label: "Ready to Dispatch", className: "badge success" };
    case "ASSIGNED":
      return { label: "Assigned", className: "badge success" };
    case "OUT_FOR_DELIVERY":
      return { label: "Out for Delivery", className: "badge success" };
    case "DELIVERED":
      return { label: "Delivered", className: "badge success" };
    case "CANCELLED":
      return { label: "Cancelled", className: "badge error" };
    default:
      return { label: status, className: "badge warning" };
  }
}

function getAddressString(order: QueueOrder): string {
  if ((order as any).deliveryAddressSnapshotJson) {
    try {
      const snap =
        typeof (order as any).deliveryAddressSnapshotJson === "string"
          ? JSON.parse((order as any).deliveryAddressSnapshotJson)
          : (order as any).deliveryAddressSnapshotJson;
      const parts = [
        snap.title,
        snap.street,
        snap.landmark,
        snap.area,
        snap.city,
        snap.pincode,
      ].filter(Boolean);
      if (parts.length > 0) return parts.join(", ");
    } catch {
      // ignore
    }
  }
  if (order.deliveryAddress) {
    if (typeof order.deliveryAddress === "string") return order.deliveryAddress;
    const parts = [
      order.deliveryAddress.title,
      order.deliveryAddress.street,
      order.deliveryAddress.landmark,
      order.deliveryAddress.area,
      order.deliveryAddress.city,
      order.deliveryAddress.pincode,
    ].filter(Boolean);
    if (parts.length > 0) return parts.join(", ");
  }
  return "Doorstep Delivery Point";
}

export function OrdersView({
  assigned = [],
  liveOrders,
  onUpdateStatus,
}: OrdersViewProps) {
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<QueueOrder | null>(null);

  const hasLiveOrders = liveOrders && liveOrders.length > 0;

  // Format table rows
  const displayRows = hasLiveOrders
    ? liveOrders.map((o) => {
        const itemsSummary =
          o.items && o.items.length > 0
            ? o.items
                .map(
                  (i) =>
                    `${i.product?.name || "Item"}${
                      i.cutName ? ` (${i.cutName})` : ""
                    } × ${i.quantity}`
                )
                .join(", ")
            : "No items";

        return {
          id: o.id,
          rawOrder: o,
          displayId: o.orderNumber || o.id.slice(0, 8),
          customer: o.customer?.name || o.customer?.phone || "Customer",
          items: itemsSummary,
          amount: o.totalAmount,
          rawStatus: o.status,
          statusObj: formatStatus(o.status),
          zone: o.deliveryAddress?.zoneName || (o as any).hub?.name || "Kozhikode Central",
          isAssigned: Boolean(
            o.deliveryPartner ||
              o.status === "ASSIGNED" ||
              o.status === "OUT_FOR_DELIVERY" ||
              assigned.includes(o.id)
          ),
          partnerName: o.deliveryPartner?.user?.name,
        };
      })
    : [];

  const PAGE_SIZE = 25;
  const [currentPage, setCurrentPage] = useState(1);
  const tableWrapRef = useRef<HTMLDivElement>(null);

  const filtered = displayRows.filter(
    (row) =>
      row.displayId.toLowerCase().includes(search.toLowerCase()) ||
      row.customer.toLowerCase().includes(search.toLowerCase()) ||
      row.items.toLowerCase().includes(search.toLowerCase())
  );

  // Reset to page 1 on search
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  // Close drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedOrder(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, totalItems);
  const paginatedOrders = filtered.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    const clamped = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(clamped);
    tableWrapRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <section className="panel products-panel">
      <div className="toolbar">
        <div>
          <h2>Order queue</h2>
          <span className="muted">
            {search.trim()
              ? `${filtered.length} of ${displayRows.length} orders found`
              : hasLiveOrders
              ? `${liveOrders.length} live orders in database (click any row to view cutting & order details)`
              : `${displayRows.length} orders in queue`}
          </span>
        </div>
        <input
          className="search"
          placeholder="Search order, customer, or product"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="table-wrap products-table-wrap" ref={tableWrapRef}>
        <table>
          <thead>
            <tr>
              <th>Order #</th>
              <th>Customer</th>
              <th>Items & Cut Instructions</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Zone / Partner</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  style={{
                    textAlign: "center",
                    padding: "30px",
                    color: "var(--muted)",
                  }}
                >
                  No matching orders found.
                </td>
              </tr>
            ) : (
              paginatedOrders.map((order) => {
                return (
                  <tr
                    key={order.id}
                    className="order-clickable-row"
                    onClick={() => setSelectedOrder(order.rawOrder)}
                    title="Click to view complete order & cut preparation details"
                  >
                    <td>
                      <strong>#{order.displayId}</strong>
                    </td>
                    <td>{order.customer}</td>
                    <td style={{ maxWidth: 280, whiteSpace: "normal" }}>
                      {order.items}
                    </td>
                    <td>Rs {order.amount.toLocaleString()}</td>
                    <td>
                      <span className={order.statusObj.className}>
                        {order.statusObj.label}
                      </span>
                    </td>
                    <td>
                      {order.partnerName ? (
                        <span>
                          <strong>{order.partnerName}</strong>
                          <br />
                          <small className="muted">{order.zone}</small>
                        </span>
                      ) : (
                        order.zone
                      )}
                    </td>
                    <td>
                      <div
                        style={{ display: "flex", gap: "6px" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          className="assign"
                          style={{
                            background: "#F4FAF6",
                            color: "#1F4D46",
                            border: "1px solid #C2E6D2",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                          onClick={() => setSelectedOrder(order.rawOrder)}
                        >
                          <Eye size={12} />
                          Details
                        </button>

                        {onUpdateStatus && order.rawStatus === "CONFIRMED" && (
                          <button
                            type="button"
                            className="assign"
                            style={{ background: "#0F2E29" }}
                            onClick={() =>
                              onUpdateStatus(order.id, "CUTTING_PREPARING")
                            }
                          >
                            Prep
                          </button>
                        )}
                        {onUpdateStatus &&
                          order.rawStatus === "CUTTING_PREPARING" && (
                            <button
                              type="button"
                              className="assign"
                              style={{ background: "#2E7D5B" }}
                              onClick={() =>
                                onUpdateStatus(order.id, "PACKED")
                              }
                            >
                              Pack
                            </button>
                          )}
                        {onUpdateStatus && order.rawStatus === "PACKED" && (
                          <button
                            type="button"
                            className="assign"
                            style={{ background: "#1F4D46" }}
                            onClick={() =>
                              onUpdateStatus(order.id, "DISPATCH_READY")
                            }
                          >
                            Ready
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="pagination-bar">
        <div className="pagination-info">
          {totalItems > 0 ? (
            <>
              Showing <strong>{startIndex + 1}</strong>–<strong>{endIndex}</strong> of{" "}
              <strong>{totalItems}</strong> orders
              <span style={{ color: "var(--soft)", marginLeft: 8 }}>
                (Page {currentPage} of {totalPages} · 25 per page)
              </span>
            </>
          ) : (
            "0 orders found"
          )}
        </div>

        {totalPages > 1 && (
          <div className="pagination-controls">
            <button
              type="button"
              className="pagination-btn"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              aria-label="Previous page"
            >
              <ChevronLeft size={15} />
            </button>

            <div className="pagination-pages">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (pageNum) => {
                  if (
                    totalPages > 7 &&
                    pageNum !== 1 &&
                    pageNum !== totalPages &&
                    Math.abs(pageNum - currentPage) > 1
                  ) {
                    if (
                      pageNum === 2 ||
                      pageNum === totalPages - 1
                    ) {
                      return (
                        <span key={pageNum} className="pagination-ellipsis">
                          …
                        </span>
                      );
                    }
                    return null;
                  }

                  return (
                    <button
                      key={pageNum}
                      type="button"
                      className={`pagination-page-btn ${
                        currentPage === pageNum ? "active" : ""
                      }`}
                      onClick={() => goToPage(pageNum)}
                    >
                      {pageNum}
                    </button>
                  );
                }
              )}
            </div>

            <button
              type="button"
              className="pagination-btn"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              aria-label="Next page"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        )}
      </div>

      {/* Slide-Up Bottom Drawer for Order Details */}
      {selectedOrder && (
        <div
          className="order-drawer-backdrop"
          onClick={() => setSelectedOrder(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="order-drawer"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Grab handle pill */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                paddingTop: 8,
                paddingBottom: 4,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 4,
                  borderRadius: 2,
                  background: "var(--border)",
                }}
              />
            </div>

            {/* Header */}
            <div className="order-drawer-header">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <h2
                  style={{
                    margin: 0,
                    fontSize: 18,
                    color: "var(--dark)",
                    fontWeight: 800,
                  }}
                >
                  Order #{selectedOrder.orderNumber || selectedOrder.id.slice(0, 8)}
                </h2>
                <span className={formatStatus(selectedOrder.status).className}>
                  {formatStatus(selectedOrder.status).label}
                </span>
                <span
                  className="muted"
                  style={{
                    fontSize: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <Clock size={13} />
                  {selectedOrder.placedAt
                    ? new Date(selectedOrder.placedAt).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })
                    : "Recent Order"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                style={{
                  border: "1px solid var(--border)",
                  background: "#FFFFFF",
                  borderRadius: "50%",
                  width: 34,
                  height: 34,
                  display: "grid",
                  placeItems: "center",
                  color: "var(--muted)",
                  cursor: "pointer",
                }}
                aria-label="Close details"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="order-drawer-body">
              {/* Left Column: Items & Cutting Preparations */}
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 14,
                  }}
                >
                  <h3
                    style={{
                      fontSize: 15,
                      fontWeight: 800,
                      color: "var(--dark)",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Package size={16} color="var(--primary)" />
                    Order Items & Cutting Details
                  </h3>
                  <span
                    className="badge"
                    style={{ background: "#E4ECE9", color: "#1F4D46" }}
                  >
                    {selectedOrder.items?.reduce(
                      (sum, i) => sum + (i.quantity || 1),
                      0
                    ) || selectedOrder.items?.length || 0}{" "}
                    items
                  </span>
                </div>

                <div style={{ display: "grid", gap: 12 }}>
                  {!selectedOrder.items || selectedOrder.items.length === 0 ? (
                    <div
                      style={{
                        padding: 20,
                        textAlign: "center",
                        color: "var(--muted)",
                        background: "#FAFAF8",
                        borderRadius: 8,
                      }}
                    >
                      No item details available.
                    </div>
                  ) : (
                    selectedOrder.items.map((item, idx) => {
                      const cutTitle =
                        item.cutName || (item as any).cutOption?.name;
                      const cutDesc = (item as any).cutOption?.description;
                      const cutPrice = (item as any).cutOption?.extraPrice;

                      return (
                        <div
                          key={item.id || idx}
                          style={{
                            border: "1px solid var(--border)",
                            borderRadius: 12,
                            padding: 14,
                            background: "#FFFFFF",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "flex-start",
                              gap: 10,
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                gap: 12,
                                alignItems: "center",
                              }}
                            >
                              {item.product?.imageUrl ? (
                                <img
                                  src={item.product.imageUrl}
                                  alt={item.product.name}
                                  style={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: 8,
                                    objectFit: "cover",
                                  }}
                                />
                              ) : (
                                <div
                                  style={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: 8,
                                    background: "#E4ECE9",
                                    display: "grid",
                                    placeItems: "center",
                                    fontSize: 22,
                                  }}
                                >
                                  🐟
                                </div>
                              )}
                              <div>
                                <h4
                                  style={{
                                    margin: 0,
                                    fontSize: 14,
                                    fontWeight: 800,
                                    color: "var(--text)",
                                  }}
                                >
                                  {item.product?.name || "Fresh Item"}
                                </h4>
                                <span className="muted" style={{ fontSize: 12 }}>
                                  Quantity: <strong>{item.quantity}</strong> ×{" "}
                                  {item.product?.unit || "unit"} · ₹
                                  {item.unitPrice || 0} each
                                </span>
                              </div>
                            </div>

                            <div style={{ textAlign: "right" }}>
                              <strong
                                style={{
                                  fontSize: 14,
                                  color: "var(--dark)",
                                }}
                              >
                                ₹
                                {item.totalPrice ||
                                  item.quantity * item.unitPrice ||
                                  0}
                              </strong>
                            </div>
                          </div>

                          {/* Cutting Preparation Box */}
                          <div
                            style={{
                              marginTop: 10,
                              padding: "9px 12px",
                              borderRadius: 8,
                              background: cutTitle ? "#F0F7F4" : "#F7F6F2",
                              border: cutTitle
                                ? "1px solid #C2E6D2"
                                : "1px dashed var(--border)",
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 8,
                            }}
                          >
                            <Scissors
                              size={15}
                              style={{
                                color: cutTitle ? "#1F4D46" : "var(--muted)",
                                marginTop: 2,
                                flexShrink: 0,
                              }}
                            />
                            <div style={{ flex: 1 }}>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 6,
                                  flexWrap: "wrap",
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: 12,
                                    fontWeight: 800,
                                    color: cutTitle
                                      ? "#165039"
                                      : "var(--muted)",
                                  }}
                                >
                                  {cutTitle
                                    ? `Cut Preparation: ${cutTitle}`
                                    : "Standard Preparation: Whole / Cleaned"}
                                </span>
                                {cutPrice && cutPrice > 0 ? (
                                  <span
                                    className="badge"
                                    style={{
                                      background: "#D8EEDF",
                                      color: "#165039",
                                      fontSize: 10,
                                    }}
                                  >
                                    +₹{cutPrice}
                                  </span>
                                ) : null}
                              </div>
                              {cutDesc && (
                                <p
                                  style={{
                                    margin: "2px 0 0",
                                    fontSize: 11,
                                    color: "#4A6B5D",
                                  }}
                                >
                                  {cutDesc}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {selectedOrder.notes && (
                  <div
                    style={{
                      marginTop: 14,
                      padding: 12,
                      background: "#FBF7EF",
                      borderRadius: 8,
                      border: "1px solid #EFE4CF",
                      fontSize: 12,
                      color: "#7E5813",
                    }}
                  >
                    <strong>📝 Order Notes:</strong> {selectedOrder.notes}
                  </div>
                )}
              </div>

              {/* Right Column: Customer, Hub, Delivery, Price */}
              <div style={{ display: "grid", gap: 14, alignContent: "start" }}>
                {/* Customer Card */}
                <div
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    padding: 14,
                    background: "#FAFAF8",
                  }}
                >
                  <h4
                    style={{
                      margin: "0 0 10px",
                      fontSize: 13,
                      fontWeight: 800,
                      color: "var(--dark)",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <User size={15} color="var(--primary)" />
                    Customer Details
                  </h4>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "var(--text)",
                    }}
                  >
                    {selectedOrder.customer?.name || "Customer"}
                  </div>
                  {selectedOrder.customer?.phone && (
                    <div style={{ marginTop: 4 }}>
                      <a
                        href={`tel:${selectedOrder.customer.phone}`}
                        style={{
                          color: "var(--primary)",
                          textDecoration: "none",
                          fontSize: 12,
                          fontWeight: 700,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <Phone size={12} />
                        {selectedOrder.customer.phone}
                      </a>
                    </div>
                  )}

                  <div
                    style={{
                      marginTop: 10,
                      paddingTop: 8,
                      borderTop: "1px solid var(--border)",
                      display: "flex",
                      gap: 6,
                      alignItems: "flex-start",
                    }}
                  >
                    <MapPin
                      size={14}
                      color="var(--accent)"
                      style={{ marginTop: 2, flexShrink: 0 }}
                    />
                    <span
                      style={{
                        fontSize: 12,
                        color: "var(--muted)",
                        lineHeight: 1.4,
                      }}
                    >
                      {getAddressString(selectedOrder)}
                    </span>
                  </div>
                </div>

                {/* Hub & Rider Card */}
                <div
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    padding: 14,
                    background: "#FAFAF8",
                  }}
                >
                  <div style={{ marginBottom: 10 }}>
                    <h4
                      style={{
                        margin: "0 0 4px",
                        fontSize: 13,
                        fontWeight: 800,
                        color: "var(--dark)",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <Store size={15} color="var(--primary)" />
                      Fulfillment Hub
                    </h4>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--text)",
                      }}
                    >
                      {(selectedOrder as any).hub?.name || "Central Hub"}
                    </span>
                  </div>

                  <div
                    style={{
                      paddingTop: 8,
                      borderTop: "1px solid var(--border)",
                    }}
                  >
                    <h4
                      style={{
                        margin: "0 0 6px",
                        fontSize: 13,
                        fontWeight: 800,
                        color: "var(--dark)",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <Truck size={15} color="var(--primary)" />
                      Delivery Partner
                    </h4>
                    {selectedOrder.deliveryPartner ? (
                      <div style={{ fontSize: 12, color: "var(--text)" }}>
                        <strong>
                          {selectedOrder.deliveryPartner.user?.name ||
                            "Assigned Rider"}
                        </strong>
                        {selectedOrder.deliveryPartner.user?.phone && (
                          <div style={{ color: "var(--muted)", marginTop: 2 }}>
                            📞 {selectedOrder.deliveryPartner.user.phone}
                          </div>
                        )}
                        <span
                          className="badge success"
                          style={{ marginTop: 6, display: "inline-block" }}
                        >
                          ✓ Assigned for Delivery
                        </span>
                      </div>
                    ) : (
                      <div>
                        <span
                          className="badge warning"
                          style={{
                            display: "inline-block",
                            marginBottom: 4,
                          }}
                        >
                          ⚠️ Rider Not Assigned
                        </span>
                        <div style={{ fontSize: 11, color: "var(--muted)" }}>
                          Assign rider in the Dispatch Tower tab.
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Pricing Card */}
                <div
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    padding: 14,
                    background: "#FAFAF8",
                  }}
                >
                  <h4
                    style={{
                      margin: "0 0 10px",
                      fontSize: 13,
                      fontWeight: 800,
                      color: "var(--dark)",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Receipt size={15} color="var(--primary)" />
                    Bill Summary
                  </h4>
                  <div style={{ display: "grid", gap: 6, fontSize: 12 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span className="muted">Items Subtotal</span>
                      <span>
                        ₹
                        {(selectedOrder as any).subtotal ||
                          selectedOrder.items?.reduce(
                            (s, i) => s + (i.totalPrice || 0),
                            0
                          ) ||
                          selectedOrder.totalAmount}
                      </span>
                    </div>
                    {Number((selectedOrder as any).cuttingChargesTotal || 0) >
                      0 && (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          color: "#165039",
                        }}
                      >
                        <span>Cutting & Prep Charges</span>
                        <span>
                          +₹{(selectedOrder as any).cuttingChargesTotal}
                        </span>
                      </div>
                    )}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span className="muted">Delivery Fee</span>
                      <span>
                        {Number((selectedOrder as any).deliveryFee || 0) === 0
                          ? "FREE"
                          : `₹${(selectedOrder as any).deliveryFee}`}
                      </span>
                    </div>
                    {Number((selectedOrder as any).discountAmount || 0) > 0 && (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          color: "var(--error)",
                        }}
                      >
                        <span>Discount</span>
                        <span>-₹{(selectedOrder as any).discountAmount}</span>
                      </div>
                    )}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        paddingTop: 8,
                        marginTop: 4,
                        borderTop: "1px solid var(--border)",
                        fontSize: 15,
                        fontWeight: 800,
                        color: "var(--dark)",
                      }}
                    >
                      <span>Total Amount</span>
                      <span>₹{selectedOrder.totalAmount}</span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginTop: 4,
                      }}
                    >
                      <span className="muted">Payment</span>
                      <span
                        className="badge"
                        style={{ background: "#E4ECE9", color: "#1F4D46" }}
                      >
                        {selectedOrder.paymentMethod || "COD"} ·{" "}
                        {selectedOrder.paymentStatus || "PENDING"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status Update Quick Buttons */}
                {onUpdateStatus && (
                  <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                    {(selectedOrder.status === "CONFIRMED" ||
                      selectedOrder.status === "PLACED") && (
                      <button
                        type="button"
                        className="primary"
                        style={{
                          flex: 1,
                          padding: "10px",
                          fontSize: 12,
                          borderRadius: 8,
                        }}
                        onClick={() => {
                          onUpdateStatus(
                            selectedOrder.id,
                            "CUTTING_PREPARING"
                          );
                          setSelectedOrder((prev) =>
                            prev ? { ...prev, status: "CUTTING_PREPARING" } : null
                          );
                        }}
                      >
                        🔪 Move to Cutting / Prep
                      </button>
                    )}
                    {selectedOrder.status === "CUTTING_PREPARING" && (
                      <button
                        type="button"
                        className="primary"
                        style={{
                          flex: 1,
                          padding: "10px",
                          fontSize: 12,
                          borderRadius: 8,
                          background: "#2E7D5B",
                        }}
                        onClick={() => {
                          onUpdateStatus(selectedOrder.id, "PACKED");
                          setSelectedOrder((prev) =>
                            prev ? { ...prev, status: "PACKED" } : null
                          );
                        }}
                      >
                        📦 Mark as Packed
                      </button>
                    )}
                    {selectedOrder.status === "PACKED" && (
                      <button
                        type="button"
                        className="primary"
                        style={{
                          flex: 1,
                          padding: "10px",
                          fontSize: 12,
                          borderRadius: 8,
                          background: "#1F4D46",
                        }}
                        onClick={() => {
                          onUpdateStatus(selectedOrder.id, "DISPATCH_READY");
                          setSelectedOrder((prev) =>
                            prev ? { ...prev, status: "DISPATCH_READY" } : null
                          );
                        }}
                      >
                        🚀 Ready for Dispatch
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
