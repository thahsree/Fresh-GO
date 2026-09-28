"use client";

import { useState, useEffect } from "react";
import { api, SalesReportResponse, Hub } from "../../lib/api";
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  CheckCircle,
  XCircle,
  Truck,
  Building,
  Download,
  Calendar,
  Filter,
  RefreshCw,
  CreditCard,
  Award,
} from "lucide-react";

export function SalesReportView({
  onToast,
}: {
  onToast: (msg: string, type?: "success" | "error" | "info" | "delete") => void;
}) {
  const [report, setReport] = useState<SalesReportResponse | null>(null);
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [loading, setLoading] = useState(true);
  const [datePreset, setDatePreset] = useState<"today" | "7d" | "30d" | "all" | "custom">("30d");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [selectedHubId, setSelectedHubId] = useState<string>("");

  const calculateDates = (preset: "today" | "7d" | "30d" | "all") => {
    const today = new Date();
    const endStr = today.toISOString().split("T")[0];

    if (preset === "today") {
      return { start: endStr, end: endStr };
    }
    if (preset === "7d") {
      const past = new Date(today);
      past.setDate(today.getDate() - 7);
      return { start: past.toISOString().split("T")[0], end: endStr };
    }
    if (preset === "30d") {
      const past = new Date(today);
      past.setDate(today.getDate() - 30);
      return { start: past.toISOString().split("T")[0], end: endStr };
    }
    return { start: "", end: "" };
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      let start = startDate;
      let end = endDate;

      if (datePreset !== "custom") {
        const calculated = calculateDates(datePreset as any);
        start = calculated.start;
        end = calculated.end;
      }

      const [reportData, hubsData] = await Promise.all([
        api.analytics.getSalesReport({
          startDate: start || undefined,
          endDate: end || undefined,
          hubId: selectedHubId || undefined,
        }),
        api.hubs.getAll(),
      ]);

      setReport(reportData);
      setHubs(hubsData || []);
    } catch (err: any) {
      onToast(err?.message || "Failed to load sales report data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [datePreset, selectedHubId]);

  const handleExportCSV = () => {
    if (!report) return;

    let csv = "FreshGo Super Admin - Consolidated Sales & Hub Report\n";
    csv += `Export Date,${new Date().toISOString()}\n`;
    csv += `Hub Scope,${selectedHubId ? hubs.find((h) => h.id === selectedHubId)?.name || selectedHubId : "All Hubs"}\n\n`;

    // Section 1: KPI Summary
    csv += "--- EXECUTIVE KPI SUMMARY ---\n";
    csv += "Metric,Value\n";
    csv += `Gross Sales (INR),Rs ${report.kpis.grossRevenue}\n`;
    csv += `Delivered Sales (INR),Rs ${report.kpis.deliveredRevenue}\n`;
    csv += `Total Orders Placed,${report.kpis.totalOrders}\n`;
    csv += `Delivered Orders,${report.kpis.deliveredOrdersCount}\n`;
    csv += `In-Progress Orders,${report.kpis.inProgressOrdersCount}\n`;
    csv += `Cancelled Orders,${report.kpis.cancelledOrdersCount}\n`;
    csv += `Average Order Value (AOV),Rs ${report.kpis.aov}\n`;
    csv += `Active Fulfillment Hubs,${report.kpis.activeHubsCount}\n\n`;

    // Section 2: Hub Breakdown
    csv += "--- FULFILLMENT HUB COMPARISON ---\n";
    csv += "Hub Code,Hub Name,City,Total Orders,Delivered Orders,Cancelled Orders,Gross Revenue (INR),AOV (INR)\n";
    report.hubBreakdown.forEach((h) => {
      csv += `"${h.hubCode}","${h.hubName}","${h.city}",${h.totalOrders},${h.deliveredOrders},${h.cancelledOrders},${h.grossRevenue},${h.aov}\n`;
    });
    csv += "\n";

    // Section 3: Daily Sales Trend
    csv += "--- DAILY SALES TREND ---\n";
    csv += "Date,Revenue (INR),Orders Count\n";
    report.dailyTrend.forEach((d) => {
      csv += `${d.date},${d.revenue},${d.orders}\n`;
    });
    csv += "\n";

    // Section 4: Top Selling Products
    csv += "--- TOP PRODUCTS BY REVENUE ---\n";
    csv += "Product Name,Category,Units Sold,Revenue (INR)\n";
    report.topProducts.forEach((p) => {
      csv += `"${p.productName}","${p.category}",${p.quantitySold},${p.revenue}\n`;
    });

    // Create Download Link
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `FreshGo_Sales_Report_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onToast("Sales report CSV exported successfully!", "success");
  };

  const kpis = report?.kpis;
  const maxTrendRevenue =
    report && report.dailyTrend.length > 0
      ? Math.max(...report.dailyTrend.map((d) => d.revenue), 1)
      : 1;

  return (
    <div style={{ display: "grid", gap: "22px" }}>
      {/* Top Filter and Controls Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "14px",
          background: "#FFFFFF",
          padding: "18px 24px",
          borderRadius: "14px",
          border: "1px solid #E3DDCF",
        }}
      >
        <div>
          <h2
            style={{
              fontFamily: "'Fraunces', serif",
              fontSize: "22px",
              color: "#0F2E29",
              margin: 0,
            }}
          >
            Executive Sales & Performance Analytics
          </h2>
          <p style={{ fontSize: "13px", color: "#5C6B66", marginTop: "4px" }}>
            Real-time revenue metrics, hub performance comparisons, and exportable financial audits.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          {/* Preset Buttons */}
          <div
            style={{
              display: "inline-flex",
              background: "#F6F2EA",
              borderRadius: "8px",
              padding: "3px",
              border: "1px solid #E3DDCF",
            }}
          >
            {(["today", "7d", "30d", "all"] as const).map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setDatePreset(preset)}
                style={{
                  border: "none",
                  background: datePreset === preset ? "#1F4D46" : "transparent",
                  color: datePreset === preset ? "#FFFFFF" : "#5C6B66",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {preset === "today"
                  ? "Today"
                  : preset === "7d"
                  ? "7 Days"
                  : preset === "30d"
                  ? "30 Days"
                  : "All Time"}
              </button>
            ))}
          </div>

          {/* Hub Filter Selector */}
          <div style={{ position: "relative" }}>
            <select
              value={selectedHubId}
              onChange={(e) => setSelectedHubId(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid #E3DDCF",
                background: "#FFFFFF",
                fontSize: "13px",
                fontWeight: 600,
                color: "#1F4D46",
                outline: "none",
              }}
            >
              <option value="">All Fulfillment Hubs</option>
              {hubs.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} ({h.code})
                </option>
              ))}
            </select>
          </div>

          {/* Refresh */}
          <button
            onClick={fetchReport}
            title="Refresh Report"
            style={{
              padding: "9px 12px",
              borderRadius: "8px",
              border: "1px solid #E3DDCF",
              background: "#FFFFFF",
              color: "#1F4D46",
              cursor: "pointer",
              display: "grid",
              placeItems: "center",
            }}
          >
            <RefreshCw size={16} />
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            disabled={!report}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 18px",
              borderRadius: "999px",
              background: "#2E7D5B",
              color: "#FFFFFF",
              fontSize: "13px",
              fontWeight: 800,
              border: "none",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(46, 125, 91, 0.25)",
            }}
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
        }}
      >
        {/* Gross Sales */}
        <div
          style={{
            background: "#FFFFFF",
            padding: "20px",
            borderRadius: "14px",
            border: "1px solid #E3DDCF",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "4px",
              background: "#1F4D46",
            }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span style={{ fontSize: "12px", color: "#5C6B66", fontWeight: 700 }}>GROSS SALES</span>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "#E4ECE9",
                color: "#1F4D46",
                display: "grid",
                placeItems: "center",
              }}
            >
              <DollarSign size={18} />
            </div>
          </div>
          <strong style={{ display: "block", fontSize: "28px", color: "#0F2E29", margin: "10px 0 4px" }}>
            ₹{kpis?.grossRevenue.toLocaleString("en-IN") || "0"}
          </strong>
          <span style={{ fontSize: "12px", color: "#2E7D5B", fontWeight: 600 }}>
            ₹{kpis?.deliveredRevenue.toLocaleString("en-IN") || "0"} delivered successfully
          </span>
        </div>

        {/* Total Orders */}
        <div
          style={{
            background: "#FFFFFF",
            padding: "20px",
            borderRadius: "14px",
            border: "1px solid #E3DDCF",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "4px",
              background: "#2E7D5B",
            }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span style={{ fontSize: "12px", color: "#5C6B66", fontWeight: 700 }}>TOTAL ORDERS</span>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "#E3F1E9",
                color: "#2E7D5B",
                display: "grid",
                placeItems: "center",
              }}
            >
              <ShoppingBag size={18} />
            </div>
          </div>
          <strong style={{ display: "block", fontSize: "28px", color: "#0F2E29", margin: "10px 0 4px" }}>
            {kpis?.totalOrders || 0}
          </strong>
          <span style={{ fontSize: "12px", color: "#5C6B66" }}>
            {kpis?.deliveredOrdersCount || 0} delivered · {kpis?.inProgressOrdersCount || 0} active
          </span>
        </div>

        {/* Average Order Value */}
        <div
          style={{
            background: "#FFFFFF",
            padding: "20px",
            borderRadius: "14px",
            border: "1px solid #E3DDCF",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "4px",
              background: "#E5623E",
            }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span style={{ fontSize: "12px", color: "#5C6B66", fontWeight: 700 }}>AVG ORDER VALUE (AOV)</span>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "rgba(229, 98, 62, 0.12)",
                color: "#E5623E",
                display: "grid",
                placeItems: "center",
              }}
            >
              <TrendingUp size={18} />
            </div>
          </div>
          <strong style={{ display: "block", fontSize: "28px", color: "#0F2E29", margin: "10px 0 4px" }}>
            ₹{kpis?.aov || 0}
          </strong>
          <span style={{ fontSize: "12px", color: "#5C6B66" }}>Per successful customer checkout</span>
        </div>

        {/* Active Hubs */}
        <div
          style={{
            background: "#FFFFFF",
            padding: "20px",
            borderRadius: "14px",
            border: "1px solid #E3DDCF",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "4px",
              background: "#1F4D46",
            }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span style={{ fontSize: "12px", color: "#5C6B66", fontWeight: 700 }}>ACTIVE HUBS</span>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "#E4ECE9",
                color: "#1F4D46",
                display: "grid",
                placeItems: "center",
              }}
            >
              <Building size={18} />
            </div>
          </div>
          <strong style={{ display: "block", fontSize: "28px", color: "#0F2E29", margin: "10px 0 4px" }}>
            {kpis?.activeHubsCount || hubs.length}
          </strong>
          <span style={{ fontSize: "12px", color: "#2E7D5B", fontWeight: 600 }}>
            100% operational coverage
          </span>
        </div>
      </div>

      {/* Middle Grid: Daily Sales Trend & Payment Breakdown */}
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: "20px" }}>
        {/* Daily Sales Bar Chart */}
        <div
          style={{
            background: "#FFFFFF",
            borderRadius: "14px",
            border: "1px solid #E3DDCF",
            padding: "22px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: "18px", color: "#0F2E29", margin: 0 }}>
              Daily Revenue Trend
            </h3>
            <span style={{ fontSize: "12px", color: "#5C6B66" }}>Last 14 Recorded Days</span>
          </div>

          {report?.dailyTrend && report.dailyTrend.length > 0 ? (
            <div
              style={{
                height: "200px",
                display: "flex",
                alignItems: "flex-end",
                gap: "14px",
                paddingTop: "20px",
                borderBottom: "1px solid #E3DDCF",
              }}
            >
              {report.dailyTrend.map((d, idx) => {
                const heightPercent = Math.max(12, Math.round((d.revenue / maxTrendRevenue) * 100));
                const isLast = idx === report.dailyTrend.length - 1;

                return (
                  <div
                    key={d.date}
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      height: "100%",
                      justifyContent: "flex-end",
                    }}
                  >
                    <span style={{ fontSize: "10px", fontWeight: 700, color: "#1F4D46", marginBottom: "4px" }}>
                      ₹{d.revenue}
                    </span>
                    <div
                      style={{
                        width: "100%",
                        height: `${heightPercent}%`,
                        background: isLast
                          ? "linear-gradient(180deg, #E5623E 0%, #C44522 100%)"
                          : "linear-gradient(180deg, #1F4D46 0%, #0F2E29 100%)",
                        borderRadius: "6px 6px 2px 2px",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
                      }}
                      title={`${d.date}: Rs ${d.revenue} (${d.orders} orders)`}
                    />
                    <small
                      style={{
                        marginTop: "8px",
                        fontSize: "10px",
                        color: "#8B968F",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {d.date.slice(5)}
                    </small>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ padding: "40px", textAlign: "center", color: "#8B968F" }}>
              No order activity recorded for selected range.
            </div>
          )}
        </div>

        {/* Payment Methods Breakdown */}
        <div
          style={{
            background: "#FFFFFF",
            borderRadius: "14px",
            border: "1px solid #E3DDCF",
            padding: "22px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: "18px", color: "#0F2E29", margin: 0 }}>
              Payment Methods
            </h3>
            <CreditCard size={18} color="#1F4D46" />
          </div>

          <div style={{ display: "grid", gap: "14px" }}>
            {Object.entries(report?.paymentMethods || {}).map(([method, data]) => {
              const label =
                method === "COD"
                  ? "Cash on Delivery"
                  : method === "RAZORPAY"
                  ? "Online (UPI / Cards / Razorpay)"
                  : "FreshGo Wallet";

              return (
                <div
                  key={method}
                  style={{
                    padding: "12px 14px",
                    borderRadius: "10px",
                    background: "#F6F2EA",
                    border: "1px solid #E3DDCF",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <strong style={{ display: "block", fontSize: "13px", color: "#0F2E29" }}>
                      {label}
                    </strong>
                    <span style={{ fontSize: "11px", color: "#5C6B66" }}>
                      {data.count} transactions completed
                    </span>
                  </div>
                  <strong style={{ fontSize: "14px", color: "#1F4D46" }}>
                    ₹{data.total.toLocaleString("en-IN")}
                  </strong>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Hub Performance Comparison Table */}
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: "14px",
          border: "1px solid #E3DDCF",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "18px 24px", borderBottom: "1px solid #E3DDCF" }}>
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: "18px", color: "#0F2E29", margin: 0 }}>
            Sales by Fulfillment Hub
          </h3>
          <p style={{ fontSize: "12px", color: "#5C6B66", margin: "2px 0 0" }}>
            Compare volume, completion ratios, and gross order values across all active centers.
          </p>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "#F6F2EA", borderBottom: "1px solid #E3DDCF" }}>
                <th style={{ padding: "12px 18px", textAlign: "left", color: "#1F4D46", fontWeight: 700 }}>
                  Hub
                </th>
                <th style={{ padding: "12px 16px", textAlign: "left", color: "#1F4D46", fontWeight: 700 }}>
                  City
                </th>
                <th style={{ padding: "12px 16px", textAlign: "center", color: "#1F4D46", fontWeight: 700 }}>
                  Orders
                </th>
                <th style={{ padding: "12px 16px", textAlign: "center", color: "#1F4D46", fontWeight: 700 }}>
                  Delivered
                </th>
                <th style={{ padding: "12px 16px", textAlign: "center", color: "#1F4D46", fontWeight: 700 }}>
                  Cancelled
                </th>
                <th style={{ padding: "12px 18px", textAlign: "right", color: "#1F4D46", fontWeight: 700 }}>
                  Gross Revenue
                </th>
                <th style={{ padding: "12px 18px", textAlign: "right", color: "#1F4D46", fontWeight: 700 }}>
                  AOV
                </th>
              </tr>
            </thead>
            <tbody>
              {report?.hubBreakdown && report.hubBreakdown.length > 0 ? (
                report.hubBreakdown.map((h) => (
                  <tr key={h.hubId} style={{ borderBottom: "1px solid #EFEAE0" }}>
                    <td style={{ padding: "14px 18px" }}>
                      <strong style={{ color: "#0F2E29" }}>{h.hubName}</strong>
                      <span
                        style={{
                          display: "inline-block",
                          fontSize: "11px",
                          fontWeight: 700,
                          color: "#5C6B66",
                          background: "#F6F2EA",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          marginLeft: "8px",
                        }}
                      >
                        {h.hubCode}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px", color: "#5C6B66" }}>{h.city}</td>
                    <td style={{ padding: "14px 16px", textAlign: "center", fontWeight: 700 }}>
                      {h.totalOrders}
                    </td>
                    <td style={{ padding: "14px 16px", textAlign: "center", color: "#2E7D5B", fontWeight: 700 }}>
                      {h.deliveredOrders}
                    </td>
                    <td style={{ padding: "14px 16px", textAlign: "center", color: "#BE4436", fontWeight: 700 }}>
                      {h.cancelledOrders}
                    </td>
                    <td style={{ padding: "14px 18px", textAlign: "right", fontWeight: 800, color: "#1F4D46" }}>
                      ₹{h.grossRevenue.toLocaleString("en-IN")}
                    </td>
                    <td style={{ padding: "14px 18px", textAlign: "right", fontWeight: 700, color: "#0F2E29" }}>
                      ₹{h.aov}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} style={{ padding: "30px", textAlign: "center", color: "#8B968F" }}>
                    No hub sales recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Products Table */}
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: "14px",
          border: "1px solid #E3DDCF",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "18px 24px", borderBottom: "1px solid #E3DDCF" }}>
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: "18px", color: "#0F2E29", margin: 0 }}>
            Top Products by Revenue
          </h3>
          <p style={{ fontSize: "12px", color: "#5C6B66", margin: "2px 0 0" }}>
            Top items ordered across all express delivery hubs.
          </p>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "#F6F2EA", borderBottom: "1px solid #E3DDCF" }}>
                <th style={{ padding: "12px 18px", textAlign: "center", width: "60px", color: "#1F4D46", fontWeight: 700 }}>
                  Rank
                </th>
                <th style={{ padding: "12px 16px", textAlign: "left", color: "#1F4D46", fontWeight: 700 }}>
                  Product Name
                </th>
                <th style={{ padding: "12px 16px", textAlign: "left", color: "#1F4D46", fontWeight: 700 }}>
                  Category
                </th>
                <th style={{ padding: "12px 16px", textAlign: "center", color: "#1F4D46", fontWeight: 700 }}>
                  Quantity Sold
                </th>
                <th style={{ padding: "12px 18px", textAlign: "right", color: "#1F4D46", fontWeight: 700 }}>
                  Total Revenue
                </th>
              </tr>
            </thead>
            <tbody>
              {report?.topProducts && report.topProducts.length > 0 ? (
                report.topProducts.map((p, idx) => (
                  <tr key={p.productName} style={{ borderBottom: "1px solid #EFEAE0" }}>
                    <td style={{ padding: "12px 18px", textAlign: "center" }}>
                      <span
                        style={{
                          display: "inline-block",
                          width: "24px",
                          height: "24px",
                          borderRadius: "50%",
                          background: idx === 0 ? "#F2C94C" : idx === 1 ? "#C5D8D3" : idx === 2 ? "#E5623E" : "#F6F2EA",
                          color: idx < 3 ? "#0F2E29" : "#5C6B66",
                          fontWeight: 800,
                          fontSize: "12px",
                          lineHeight: "24px",
                        }}
                      >
                        #{idx + 1}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <strong style={{ color: "#0F2E29" }}>{p.productName}</strong>
                    </td>
                    <td style={{ padding: "12px 16px", color: "#5C6B66" }}>{p.category}</td>
                    <td style={{ padding: "12px 16px", textAlign: "center", fontWeight: 700, color: "#1F4D46" }}>
                      {p.quantitySold} units
                    </td>
                    <td style={{ padding: "12px 18px", textAlign: "right", fontWeight: 800, color: "#2E7D5B" }}>
                      ₹{p.revenue.toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{ padding: "30px", textAlign: "center", color: "#8B968F" }}>
                    No product orders recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
