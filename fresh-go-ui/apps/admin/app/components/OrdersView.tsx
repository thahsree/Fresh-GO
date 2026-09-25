"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@fresh-food/ui";
import { QueueOrder } from "../lib/api";

type OrdersViewProps = {
  assigned: string[];
  onAssign: (id: string) => void;
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

export function OrdersView({
  assigned,
  onAssign,
  liveOrders,
  onUpdateStatus,
}: OrdersViewProps) {
  const [search, setSearch] = useState("");

  const hasLiveOrders = liveOrders && liveOrders.length > 0;

  // Format table rows
  const displayRows = hasLiveOrders
    ? liveOrders.map((o) => {
        const itemsSummary =
          o.items && o.items.length > 0
            ? o.items
                .map(
                  (i) =>
                    `${i.product?.name || "Item"}${i.cutName ? ` (${i.cutName})` : ""} × ${i.quantity}`
                )
                .join(", ")
            : "No items";

        return {
          id: o.id,
          displayId: o.orderNumber || o.id.slice(0, 8),
          customer: o.customer?.name || o.customer?.phone || "Customer",
          items: itemsSummary,
          amount: o.totalAmount,
          rawStatus: o.status,
          statusObj: formatStatus(o.status),
          zone: o.deliveryAddress?.zoneName || "Kozhikode Central",
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
              ? `${liveOrders.length} live orders in database`
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
              <th>Items</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Zone / Partner</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "30px", color: "var(--muted)" }}>
                  No matching orders found.
                </td>
              </tr>
            ) : (
              paginatedOrders.map((order) => {
                return (
                  <tr key={order.id}>
                    <td>
                      <strong>#{order.displayId}</strong>
                    </td>
                    <td>{order.customer}</td>
                    <td style={{ maxWidth: 260, whiteSpace: "normal" }}>
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
                      <div style={{ display: "flex", gap: "6px" }}>
                        <Button
                          size="sm"
                          variant={order.isAssigned ? "ghost" : "primary"}
                          disabled={order.isAssigned}
                          label={order.isAssigned ? "Assigned" : "Assign"}
                          onPress={() => onAssign(order.id)}
                        />
                        {onUpdateStatus && order.rawStatus === "CONFIRMED" && (
                          <button
                            type="button"
                            className="assign"
                            style={{ background: "#0F2E29" }}
                            onClick={() => onUpdateStatus(order.id, "CUTTING_PREPARING")}
                          >
                            Prep
                          </button>
                        )}
                        {onUpdateStatus && order.rawStatus === "CUTTING_PREPARING" && (
                          <button
                            type="button"
                            className="assign"
                            style={{ background: "#2E7D5B" }}
                            onClick={() => onUpdateStatus(order.id, "PACKED")}
                          >
                            Pack
                          </button>
                        )}
                        {onUpdateStatus && order.rawStatus === "PACKED" && (
                          <button
                            type="button"
                            className="assign"
                            style={{ background: "#1F4D46" }}
                            onClick={() => onUpdateStatus(order.id, "DISPATCH_READY")}
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
              <span>Prev</span>
            </button>

            <div className="pagination-pages">
              {getPageNumbers(currentPage, totalPages).map((p, idx) =>
                p === "..." ? (
                  <span key={`ellipsis-${idx}`} className="pagination-ellipsis">
                    …
                  </span>
                ) : (
                  <button
                    key={`page-${p}`}
                    type="button"
                    className={`pagination-page-btn ${
                      currentPage === p ? "active" : ""
                    }`}
                    onClick={() => goToPage(Number(p))}
                  >
                    {p}
                  </button>
                )
              )}
            </div>

            <button
              type="button"
              className="pagination-btn"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              aria-label="Next page"
            >
              <span>Next</span>
              <ChevronRight size={15} />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages: (number | "...")[] = [1];
  if (current > 3) {
    pages.push("...");
  }
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }
  if (current < total - 2) {
    pages.push("...");
  }
  pages.push(total);
  return pages;
}
