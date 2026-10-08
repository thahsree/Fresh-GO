"use client";

import { useEffect, useMemo, useState } from "react";
import { QueueOrder, ActivePartner, api, SalesReportResponse } from "../lib/api";
import { Product } from "../models/product";

type DashboardViewProps = {
  orders?: QueueOrder[];
  products?: Product[];
  partners?: ActivePartner[];
};

export function DashboardView({
  orders = [],
  products = [],
  partners = [],
}: DashboardViewProps) {
  const [salesReport, setSalesReport] = useState<SalesReportResponse | null>(null);
  const [metricMode, setMetricMode] = useState<"revenue" | "orders">("revenue");
  const [timeRange, setTimeRange] = useState<7 | 14>(7);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    api.analytics
      .getSalesReport()
      .then((res) => {
        if (isMounted && res) {
          setSalesReport(res);
        }
      })
      .catch((err) => {
        console.warn("Could not fetch analytics sales report:", err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const preparingCount = orders.filter(
    (o) => o.status === "CUTTING_PREPARING" || o.status === "CONFIRMED"
  ).length;

  const lowStockProducts = products.filter((p) => p.stock > 0 && p.stock < 5);
  const outOfStockProducts = products.filter((p) => p.stock === 0);

  const queueRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const totalRevenue = salesReport?.kpis?.grossRevenue ?? queueRevenue;
  const formattedRevenue =
    totalRevenue > 0 ? `Rs ${Math.round(totalRevenue).toLocaleString()}` : "Rs 0";

  const totalOrdersCount = orders.length;

  // Build dynamic trajectory data for the selected range (7 or 14 days)
  const trajectoryData = useMemo(() => {
    const dateMap = new Map<string, { revenue: number; orders: number }>();

    // From sales report daily trend
    if (salesReport?.dailyTrend) {
      for (const item of salesReport.dailyTrend) {
        dateMap.set(item.date, {
          revenue: item.revenue || 0,
          orders: item.orders || 0,
        });
      }
    }

    // Merge with any real-time orders in queue
    for (const order of orders) {
      if (order.placedAt && order.status !== "CANCELLED" && order.status !== "FAILED_DELIVERY") {
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
      const dayName = isToday ? "Today" : d.toLocaleDateString("en-US", { weekday: "short" });
      const formattedDate = d.toLocaleDateString("en-US", { day: "2-digit", month: "short" });

      const stats = dateMap.get(dateStr) || { revenue: 0, orders: 0 };
      const aov = stats.orders > 0 ? Math.round(stats.revenue / stats.orders) : 0;

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
  }, [salesReport, orders, timeRange]);

  const totalRangeRevenue = trajectoryData.reduce((sum, d) => sum + d.revenue, 0);
  const totalRangeOrders = trajectoryData.reduce((sum, d) => sum + d.orders, 0);
  const maxRangeVal = Math.max(
    ...trajectoryData.map((d) => (metricMode === "revenue" ? d.revenue : d.orders)),
    1
  );

  return (
    <>
      <section className="kpis">
        <div className="kpi featured">
          <strong>{formattedRevenue}</strong>
          <span>Live revenue · Kozhikode Hub</span>
        </div>
        <div className="kpi">
          <strong>{totalOrdersCount}</strong>
          <span>Orders in queue</span>
        </div>
        <div className="kpi">
          <strong>{preparingCount}</strong>
          <span>Preparing in cutting hub</span>
        </div>
        <div className="kpi">
          <strong>{lowStockProducts.length + outOfStockProducts.length}</strong>
          <span>Low stock catalogue items</span>
        </div>
      </section>

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
              <h2>Order & revenue trajectory</h2>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px" }}>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text)" }}>
                  {metricMode === "revenue"
                    ? `Total: Rs ${totalRangeRevenue.toLocaleString()}`
                    : `Total: ${totalRangeOrders} orders`}
                </span>
                <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                  (Last {timeRange} days)
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
                    background: metricMode === "revenue" ? "var(--primary)" : "transparent",
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
                    background: metricMode === "orders" ? "var(--primary)" : "transparent",
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
                    background: timeRange === 7 ? "var(--surface)" : "transparent",
                    color: timeRange === 7 ? "var(--text)" : "var(--muted)",
                    padding: "4px 8px",
                    borderRadius: "6px",
                    fontSize: "11px",
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: timeRange === 7 ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                  }}
                >
                  7D
                </button>
                <button
                  type="button"
                  onClick={() => setTimeRange(14)}
                  style={{
                    border: "none",
                    background: timeRange === 14 ? "var(--surface)" : "transparent",
                    color: timeRange === 14 ? "var(--text)" : "var(--muted)",
                    padding: "4px 8px",
                    borderRadius: "6px",
                    fontSize: "11px",
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: timeRange === 14 ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
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
              const val = metricMode === "revenue" ? day.revenue : day.orders;
              const heightPercent = val > 0 ? Math.max(12, Math.round((val / maxRangeVal) * 100)) : 6;
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
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    height: "100%",
                    justifyContent: "flex-end",
                    position: "relative",
                    cursor: "pointer",
                  }}
                >
                  {/* Tooltip on Hover */}
                  {isHovered && (
                    <div
                      style={{
                        position: "absolute",
                        bottom: `calc(${heightPercent}% + 14px)`,
                        zIndex: 20,
                        background: "var(--dark)",
                        color: "#fff",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        fontSize: "11px",
                        whiteSpace: "nowrap",
                        boxShadow: "0 4px 14px rgba(0,0,0,0.2)",
                        pointerEvents: "none",
                        textAlign: "center",
                        minWidth: "120px",
                        transform: "translateX(-50%)",
                        left: "50%",
                      }}
                    >
                      <div style={{ fontWeight: 800, marginBottom: "3px", color: "var(--tint)" }}>
                        {day.dayName}, {day.formattedDate}
                      </div>
                      <div style={{ fontSize: "13px", fontWeight: 700, color: "#fff" }}>
                        Rs {day.revenue.toLocaleString()}
                      </div>
                      <div style={{ fontSize: "10.5px", color: "#a5b4af", marginTop: "2px" }}>
                        {day.orders} {day.orders === 1 ? "order" : "orders"}
                        {day.orders > 0 && ` · AOV Rs ${day.aov}`}
                      </div>
                    </div>
                  )}

                  {/* Value tag above bar */}
                  {val > 0 && (
                    <span
                      style={{
                        fontSize: timeRange === 14 ? "8.5px" : "10px",
                        fontWeight: 700,
                        color: isHovered ? "var(--primary)" : "var(--muted)",
                        marginBottom: "4px",
                        transition: "color 0.15s ease",
                      }}
                    >
                      {formatVal(val)}
                    </span>
                  )}

                  {/* Bar */}
                  <div
                    style={{
                      width: "100%",
                      height: `${heightPercent}%`,
                      background:
                        val === 0
                          ? "var(--alt)"
                          : day.isToday
                          ? "linear-gradient(180deg, var(--accent) 0%, #b6462c 100%)"
                          : isHovered
                          ? "linear-gradient(180deg, #28635a 0%, var(--dark) 100%)"
                          : "linear-gradient(180deg, var(--primary) 0%, var(--dark) 100%)",
                      borderRadius: "6px 6px 2px 2px",
                      transition: "height 0.3s cubic-bezier(0.4, 0, 0.2, 1), background 0.15s ease",
                      opacity: val === 0 ? 0.6 : 1,
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

        <section className="panel">
          <h2>Operational alerts</h2>
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
              <b className={partners.length > 0 ? "badge success" : "badge"}>
                {partners.length} online
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

      <div className="grid">
        <section className="panel">
          <h2>Category breakdown</h2>
          <div className="row">
            <span>🐟 Fresh Fish & Seafood</span>
            <strong>
              {products.filter((p) => p.category.toLowerCase().includes("fish")).length} varieties
            </strong>
          </div>
          <div className="row">
            <span>🥩 Fresh Halal Meat & Poultry</span>
            <strong>
              {products.filter((p) => p.category.toLowerCase().includes("meat")).length} varieties
            </strong>
          </div>
          <div className="row">
            <span>🥬 Farm Vegetables</span>
            <strong>
              {products.filter((p) => p.category.toLowerCase().includes("veg")).length} varieties
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
