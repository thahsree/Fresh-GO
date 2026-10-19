"use client";

import { useEffect, useMemo, useState } from "react";
import { TrendingUp } from "lucide-react";
import {
  QueueOrder,
  ActivePartner,
  api,
  SalesReportResponse,
  AdminUser,
} from "../lib/api";
import { Product } from "../models/product";

type DashboardViewProps = {
  orders?: QueueOrder[];
  products?: Product[];
  partners?: ActivePartner[];
  currentUser?: AdminUser | null;
  onNavigateDeliveryFee?: () => void;
};

export function DashboardView({
  orders = [],
  products = [],
  partners = [],
  currentUser,
  onNavigateDeliveryFee,
}: DashboardViewProps) {
  const [salesReport, setSalesReport] = useState<SalesReportResponse | null>(null);
  const [metricMode, setMetricMode] = useState<"revenue" | "orders">("revenue");
  const [timeRange, setTimeRange] = useState<7 | 14>(7);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [activeDeliveryFee, setActiveDeliveryFee] = useState<number | null>(null);

  useEffect(() => {
    api.deliveryFee
      .getSettings()
      .then((s) => {
        if (s) setActiveDeliveryFee(s.deliveryFee);
      })
      .catch(() => {});
  }, []);

  // Identify the logged-in hub strictly
  const isSuperAdmin = currentUser?.role === "SUPER_ADMIN";
  const activeHubId = currentUser?.hubId || currentUser?.hub?.id || "";
  const activeHubName = currentUser?.hub?.name || (isSuperAdmin ? "Central Dispatch" : "Main Hub");
  const activeHubCode = currentUser?.hub?.code || (isSuperAdmin ? "ALL" : "HUB");
  const activeHubCity = currentUser?.hub?.city || "";

  // Fetch sales report filtered strictly to this specific logged-in hub
  useEffect(() => {
    let isMounted = true;

    api.analytics
      .getSalesReport(activeHubId ? { hubId: activeHubId } : undefined)
      .then((res) => {
        if (isMounted && res) {
          setSalesReport(res);
        }
      })
      .catch((err) => {
        console.warn("Could not fetch analytics sales report for hub:", err);
      });

    return () => {
      isMounted = false;
    };
  }, [activeHubId]);

  // Filter orders strictly for this specific hub (or all orders if Super Admin with no specific hub)
  const hubOrders = useMemo(() => {
    if (!activeHubId) return orders;
    return orders.filter((o) => {
      const orderHubId = o.hub?.id || (o as any).hubId;
      return orderHubId === activeHubId;
    });
  }, [orders, activeHubId]);

  // Filter partners strictly for this specific hub
  const hubPartners = useMemo(() => {
    if (!activeHubId) return partners;
    return partners.filter((p) => {
      const partnerHubId = (p as any).hubId || p.hub?.id;
      return partnerHubId === activeHubId;
    });
  }, [partners, activeHubId]);

  // Live revenue strictly for this specific hub
  const hubLiveRevenue = useMemo(() => {
    // 1. If sales report has a matching hub in breakdown, use it
    if (salesReport?.hubBreakdown && salesReport.hubBreakdown.length > 0) {
      const matched = salesReport.hubBreakdown.find(
        (h) =>
          (activeHubId && h.hubId === activeHubId) ||
          (activeHubName && h.hubName.toLowerCase() === activeHubName.toLowerCase())
      );
      if (matched && matched.grossRevenue > 0) {
        return Math.round(matched.grossRevenue);
      }
    }

    // 2. If salesReport has general grossRevenue for this filtered hub
    if (salesReport?.kpis?.grossRevenue && salesReport.kpis.grossRevenue > 0) {
      return Math.round(salesReport.kpis.grossRevenue);
    }

    // 3. Fallback to real-time live orders in queue for this hub
    return Math.round(
      hubOrders
        .filter((o) => o.status !== "CANCELLED" && o.status !== "FAILED_DELIVERY")
        .reduce((sum, o) => sum + (o.totalAmount || 0), 0)
    );
  }, [salesReport, hubOrders, activeHubId, activeHubName]);

  const formattedRevenue =
    hubLiveRevenue > 0 ? `Rs ${hubLiveRevenue.toLocaleString()}` : "Rs 0";

  const activeOrdersCount = hubOrders.filter(
    (o) =>
      o.status !== "DELIVERED" &&
      o.status !== "CANCELLED" &&
      o.status !== "FAILED_DELIVERY" &&
      o.status !== "RETURNED_TO_HUB"
  ).length;

  const preparingCount = hubOrders.filter(
    (o) => o.status === "CUTTING_PREPARING" || o.status === "CONFIRMED"
  ).length;

  const lowStockProducts = products.filter((p) => p.stock > 0 && p.stock < 5);
  const outOfStockProducts = products.filter((p) => p.stock === 0);

  // Dynamic trajectory data strictly for this specific hub
  const trajectoryData = useMemo(() => {
    const dateMap = new Map<string, { revenue: number; orders: number }>();

    // From sales report daily trend (already filtered by hubId on backend)
    if (salesReport?.dailyTrend) {
      for (const item of salesReport.dailyTrend) {
        dateMap.set(item.date, {
          revenue: item.revenue || 0,
          orders: item.orders || 0,
        });
      }
    }

    // Merge with real-time orders in queue for this hub
    for (const order of hubOrders) {
      if (
        order.placedAt &&
        order.status !== "CANCELLED" &&
        order.status !== "FAILED_DELIVERY"
      ) {
        try {
          const dateStr = new Date(order.placedAt).toISOString().split("T")[0];
          const existing = dateMap.get(dateStr) || { revenue: 0, orders: 0 };
          if (!salesReport) {
            existing.revenue += Number(order.totalAmount || 0);
            existing.orders += 1;
            dateMap.set(dateStr, existing);
          }
        } catch {}
      }
    }

    const result: Array<{
      dateStr: string;
      dayName: string;
      formattedDate: string;
      isToday: boolean;
      revenue: number;
      orders: number;
      aov: number;
    }> = [];

    const now = new Date();
    for (let i = timeRange - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const isToday = i === 0;
      const dayName = isToday
        ? "Today"
        : d.toLocaleDateString("en-US", { weekday: "short" });
      const formattedDate = d.toLocaleDateString("en-US", {
        day: "2-digit",
        month: "short",
      });

      const stats = dateMap.get(dateStr) || { revenue: 0, orders: 0 };
      const aov =
        stats.orders > 0 ? Math.round(stats.revenue / stats.orders) : 0;

      result.push({
        dateStr,
        dayName,
        formattedDate,
        isToday,
        revenue: Math.round(stats.revenue),
        orders: stats.orders,
        aov,
      });
    }

    return result;
  }, [salesReport, hubOrders, timeRange]);

  const totalRangeRevenue = trajectoryData.reduce(
    (sum, d) => sum + d.revenue,
    0
  );
  const totalRangeOrders = trajectoryData.reduce(
    (sum, d) => sum + d.orders,
    0
  );
  const maxRangeVal = Math.max(
    ...trajectoryData.map((d) =>
      metricMode === "revenue" ? d.revenue : d.orders
    ),
    1
  );

  const onlinePartnersCount = hubPartners.filter((p) => p.isOnline).length;

  return (
    <>
      {/* Primary Live Revenue & Operational KPIs */}
      <section className="kpis">
        <div className="kpi featured">
          <strong>{formattedRevenue}</strong>
          <span>Live revenue · {activeHubName}</span>
        </div>
        <div className="kpi">
          <strong>{activeOrdersCount}</strong>
          <span>Active orders in queue</span>
        </div>
        <div className="kpi">
          <strong>{preparingCount}</strong>
          <span>Preparing in cutting hub</span>
        </div>
        <div className="kpi">
          <strong>{onlinePartnersCount}</strong>
          <span>Active delivery riders online</span>
        </div>
        <div
          className="kpi"
          style={{ cursor: onNavigateDeliveryFee ? "pointer" : "default" }}
          onClick={onNavigateDeliveryFee}
          title="Click to manage delivery fee & pricing"
        >
          <strong
            style={{
              color:
                activeDeliveryFee === 0 || activeDeliveryFee === null
                  ? "#2E7D5B"
                  : "#1F4D46",
            }}
          >
            {activeDeliveryFee === 0 || activeDeliveryFee === null
              ? "₹0 · FREE"
              : `₹${activeDeliveryFee}`}
          </strong>
          <span>Delivery fee · Manage 🚚</span>
        </div>
      </section>

      {/* Trajectory & Operational Alerts Grid */}
      <div className="grid">
        <section className="panel" style={{ position: "relative" }}>
          {/* Header & Controls */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: "16px",
              flexWrap: "wrap",
              gap: "10px",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <TrendingUp size={18} color="#0F2E29" />
                <h2 style={{ margin: 0 }}>Order & revenue trajectory</h2>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginTop: "4px",
                }}
              >
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "var(--text)",
                  }}
                >
                  {metricMode === "revenue"
                    ? `Total: Rs ${totalRangeRevenue.toLocaleString()}`
                    : `Total: ${totalRangeOrders} orders`}
                </span>
                <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                  ({activeHubName} · Last {timeRange} days)
                </span>
              </div>
            </div>

            {/* Controls: Mode toggle (Revenue / Orders) & Range toggle (7D / 14D) */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  display: "inline-flex",
                  background: "var(--bg)",
                  borderRadius: "8px",
                  padding: "2px",
                  border: "1px solid var(--border)",
                }}
              >
                <button
                  type="button"
                  onClick={() => setMetricMode("revenue")}
                  style={{
                    border: "none",
                    background:
                      metricMode === "revenue" ? "var(--primary)" : "transparent",
                    color: metricMode === "revenue" ? "#fff" : "var(--muted)",
                    padding: "4px 10px",
                    borderRadius: "6px",
                    fontSize: "11px",
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  ₹ Revenue
                </button>
                <button
                  type="button"
                  onClick={() => setMetricMode("orders")}
                  style={{
                    border: "none",
                    background:
                      metricMode === "orders" ? "var(--primary)" : "transparent",
                    color: metricMode === "orders" ? "#fff" : "var(--muted)",
                    padding: "4px 10px",
                    borderRadius: "6px",
                    fontSize: "11px",
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  📦 Orders
                </button>
              </div>

              <div
                style={{
                  display: "inline-flex",
                  background: "var(--bg)",
                  borderRadius: "8px",
                  padding: "2px",
                  border: "1px solid var(--border)",
                }}
              >
                <button
                  type="button"
                  onClick={() => setTimeRange(7)}
                  style={{
                    border: "none",
                    background:
                      timeRange === 7 ? "var(--surface)" : "transparent",
                    color: timeRange === 7 ? "var(--text)" : "var(--muted)",
                    padding: "4px 8px",
                    borderRadius: "6px",
                    fontSize: "11px",
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow:
                      timeRange === 7 ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                  }}
                >
                  7D
                </button>
                <button
                  type="button"
                  onClick={() => setTimeRange(14)}
                  style={{
                    border: "none",
                    background:
                      timeRange === 14 ? "var(--surface)" : "transparent",
                    color: timeRange === 14 ? "var(--text)" : "var(--muted)",
                    padding: "4px 8px",
                    borderRadius: "6px",
                    fontSize: "11px",
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow:
                      timeRange === 14 ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                  }}
                >
                  14D
                </button>
              </div>
            </div>
          </div>

          {/* Dynamic Bar Chart */}
          <div
            style={{
              height: "190px",
              display: "flex",
              alignItems: "flex-end",
              gap: timeRange === 14 ? "8px" : "16px",
              paddingTop: "24px",
              paddingBottom: "24px",
              position: "relative",
              borderBottom: "1px solid var(--border)",
            }}
          >
            {trajectoryData.map((day, idx) => {
              const val =
                metricMode === "revenue" ? day.revenue : day.orders;
              const heightPercent =
                val > 0
                  ? Math.max(12, Math.round((val / maxRangeVal) * 100))
                  : 6;
              const isHovered = hoveredIndex === idx;

              const formatVal = (n: number) => {
                if (metricMode === "revenue") {
                  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}k`;
                  return `₹${n}`;
                }
                return `${n}`;
              };

              return (
                <div
                  key={day.dateStr}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  style={{
                    flex: 1,
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "flex-end",
                    alignItems: "center",
                    position: "relative",
                    cursor: "pointer",
                  }}
                >
                  {/* Floating tooltip on hover */}
                  {isHovered && (
                    <div
                      style={{
                        position: "absolute",
                        bottom: `calc(${heightPercent}% + 10px)`,
                        background: "#17211E",
                        color: "#FFFFFF",
                        padding: "6px 10px",
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                        zIndex: 20,
                        boxShadow: "0 6px 16px rgba(0,0,0,0.25)",
                        pointerEvents: "none",
                      }}
                    >
                      <div>
                        {day.dayName}, {day.formattedDate}
                      </div>
                      <div style={{ color: "#4ADE80", marginTop: "2px" }}>
                        {metricMode === "revenue"
                          ? `₹${day.revenue.toLocaleString()}`
                          : `${day.orders} orders`}
                      </div>
                      <div
                        style={{
                          fontSize: "9.5px",
                          color: "rgba(255,255,255,0.7)",
                        }}
                      >
                        AOV: ₹{day.aov}
                      </div>
                    </div>
                  )}

                  {/* Value label on top of bar */}
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      color: isHovered
                        ? "var(--primary)"
                        : "var(--muted)",
                      marginBottom: "4px",
                    }}
                  >
                    {val > 0 ? formatVal(val) : "-"}
                  </span>

                  {/* The bar */}
                  <div
                    style={{
                      width: "100%",
                      maxWidth: "38px",
                      height: `${heightPercent}%`,
                      background:
                        day.isToday && isHovered
                          ? "linear-gradient(180deg, var(--accent) 0%, #D44B26 100%)"
                          : day.isToday
                          ? "linear-gradient(180deg, var(--accent) 0%, #E5623E 100%)"
                          : isHovered
                          ? "linear-gradient(180deg, #28635a 0%, var(--dark) 100%)"
                          : "linear-gradient(180deg, var(--primary) 0%, var(--dark) 100%)",
                      borderRadius: "6px 6px 2px 2px",
                      transition:
                        "height 0.3s cubic-bezier(0.4, 0, 0.2, 1), background 0.15s ease",
                      opacity: val === 0 ? 0.5 : 1,
                      border: val === 0 ? "1px dashed var(--border)" : "none",
                    }}
                  />

                  {/* X-axis Label below bar */}
                  <div
                    style={{
                      position: "absolute",
                      bottom: "-22px",
                      left: 0,
                      right: 0,
                      textAlign: "center",
                    }}
                  >
                    <span
                      style={{
                        fontSize: timeRange === 14 ? "9px" : "10.5px",
                        fontWeight: day.isToday || isHovered ? 800 : 600,
                        color: day.isToday
                          ? "var(--accent)"
                          : isHovered
                          ? "var(--primary)"
                          : "var(--muted)",
                      }}
                    >
                      {day.dayName}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Operational Alerts for this Hub */}
        <section className="panel">
          <h2>Operational alerts · {activeHubName}</h2>
          <div className="attention">
            {lowStockProducts.length > 0 ? (
              lowStockProducts.slice(0, 2).map((p) => (
                <div key={p.id}>
                  <span>{p.name} low stock</span>
                  <b className="badge warning">
                    {p.stock} {p.unit} left
                  </b>
                </div>
              ))
            ) : (
              <div>
                <span>Catalogue stock levels</span>
                <b className="badge success">All Healthy</b>
              </div>
            )}

            <div>
              <span>Active delivery partners</span>
              <b
                className={
                  hubPartners.length > 0 ? "badge success" : "badge"
                }
              >
                {onlinePartnersCount} online / {hubPartners.length} total
              </b>
            </div>

            <div>
              <span>Freshness audit</span>
              <b className="badge success">100% Passed</b>
            </div>

            <div>
              <span>Average dispatch time</span>
              <b className="badge success">18 mins</b>
            </div>
          </div>
        </section>
      </div>

      {/* Category Breakdown & Catalogue Sample */}
      <div className="grid">
        <section className="panel">
          <h2>Category breakdown</h2>
          <div className="row">
            <span>🐟 Fresh Fish & Seafood</span>
            <strong>
              {
                products.filter((p) =>
                  p.category.toLowerCase().includes("fish")
                ).length
              }{" "}
              varieties
            </strong>
          </div>
          <div className="row">
            <span>🥩 Fresh Halal Meat & Poultry</span>
            <strong>
              {
                products.filter((p) =>
                  p.category.toLowerCase().includes("meat")
                ).length
              }{" "}
              varieties
            </strong>
          </div>
          <div className="row">
            <span>🥬 Farm Vegetables</span>
            <strong>
              {
                products.filter((p) =>
                  p.category.toLowerCase().includes("veg")
                ).length
              }{" "}
              varieties
            </strong>
          </div>
        </section>

        <section className="panel">
          <h2>Live catalogue sample</h2>
          {products.slice(0, 4).map((p) => (
            <div className="row" key={p.id}>
              <span>{p.name}</span>
              <strong>
                Rs {p.price} / {p.unit}
              </strong>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}
