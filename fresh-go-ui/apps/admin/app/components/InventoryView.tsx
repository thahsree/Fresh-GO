"use client";

import { useEffect, useRef, useState } from "react";
import {
  Search,
  Snowflake,
  Plus,
  Minus,
  Layers,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { getStockState, Product } from "../models/product";

type InventoryViewProps = {
  products: Product[];
  onUpdateStock?: (id: string, newStock: number) => Promise<void> | void;
};

export function InventoryView({ products, onUpdateStock }: InventoryViewProps) {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Compute KPIs
  const totalSKUs = products.length;
  const totalVolume = products.reduce((acc, p) => acc + (p.stock || 0), 0);
  const healthyCount = products.filter((p) => getStockState(p.stock) === "Healthy").length;
  const lowOrOutCount = products.filter((p) => getStockState(p.stock) !== "Healthy").length;

  const categories = ["All", ...Array.from(new Set(products.map((p) => p.category).filter(Boolean)))];

  const filtered = products.filter((product) => {
    const matchesQuery = `${product.name} ${product.category} ${product.origin || ""}`
      .toLowerCase()
      .includes(query.toLowerCase());

    if (!matchesQuery) return false;

    if (selectedCategory === "All") return true;
    if (selectedCategory === "Low Stock") return getStockState(product.stock) !== "Healthy";
    return product.category.toLowerCase() === selectedCategory.toLowerCase();
  });

  const PAGE_SIZE = 25;
  const [currentPage, setCurrentPage] = useState(1);
  const tableWrapRef = useRef<HTMLDivElement>(null);

  // Reset to page 1 on search or category filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [query, selectedCategory]);

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, totalItems);
  const paginatedInventory = filtered.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    const clamped = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(clamped);
    tableWrapRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleAdjust = async (product: Product, delta: number) => {
    const nextStock = Math.max(0, Math.round(((product.stock || 0) + delta) * 10) / 10);
    if (nextStock === product.stock) return;

    if (onUpdateStock) {
      setUpdatingId(product.id);
      try {
        await onUpdateStock(product.id, nextStock);
      } finally {
        setUpdatingId(null);
      }
    }
  };

  return (
    <div style={{ display: "grid", gap: "20px" }}>
      {/* Inventory KPI Summary Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "14px",
        }}
      >
        <div className="kpi" style={{ padding: "16px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
            <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 700 }}>Total Catalogue SKUs</span>
            <Layers size={18} style={{ color: "var(--primary)" }} />
          </div>
          <strong style={{ fontSize: "24px" }}>{totalSKUs}</strong>
          <span style={{ fontSize: "11px", color: "var(--muted)" }}>Active product profiles</span>
        </div>

        <div className="kpi" style={{ padding: "16px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
            <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 700 }}>Total Live Stock Volume</span>
            <Snowflake size={18} style={{ color: "#2E7D5B" }} />
          </div>
          <strong style={{ fontSize: "24px", color: "#1F4D46" }}>
            {totalVolume.toFixed(1)} <span style={{ fontSize: "15px", fontWeight: 600 }}>kg</span>
          </strong>
          <span style={{ fontSize: "11px", color: "var(--muted)" }}>Verified cold-chain batches</span>
        </div>

        <div className="kpi" style={{ padding: "16px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
            <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 700 }}>Healthy Stock Level</span>
            <CheckCircle2 size={18} style={{ color: "#2E7D5B" }} />
          </div>
          <strong style={{ fontSize: "24px", color: "#2E7D5B" }}>{healthyCount}</strong>
          <span style={{ fontSize: "11px", color: "var(--muted)" }}>{totalSKUs > 0 ? `${Math.round((healthyCount / totalSKUs) * 100)}% of catalogue` : "All healthy"}</span>
        </div>

        <div className="kpi" style={{ padding: "16px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
            <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 700 }}>Stock Shortage Alerts</span>
            <AlertCircle size={18} style={{ color: lowOrOutCount > 0 ? "#BE4436" : "var(--muted)" }} />
          </div>
          <strong style={{ fontSize: "24px", color: lowOrOutCount > 0 ? "#BE4436" : "var(--muted)" }}>
            {lowOrOutCount}
          </strong>
          <span style={{ fontSize: "11px", color: "var(--muted)" }}>
            {lowOrOutCount > 0 ? "Requires hub intake replenishment" : "No urgent replenishment needed"}
          </span>
        </div>
      </div>

      {/* Main Inventory Panel with Aligned Table */}
      <section className="panel products-panel" style={{ padding: "20px" }}>
        <div className="toolbar" style={{ marginBottom: "16px" }}>
          <div>
            <h2 style={{ margin: "0 0 4px 0" }}>Freshness & Batch Stock Management</h2>
            <span className="muted" style={{ fontSize: "12px" }}>
              {query.trim() || selectedCategory !== "All"
                ? `${filtered.length} of ${products.length} inventory items match filter`
                : "Live intake weight, shelf-life monitoring, and hub capacity."}
            </span>
          </div>

          <div className="toolbar-actions" style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <label className="search-wrap" style={{ minWidth: "240px" }}>
              <Search size={16} aria-hidden="true" style={{ color: "var(--muted)" }} />
              <input
                className="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter by product or origin..."
                style={{ width: "100%" }}
              />
            </label>
          </div>
        </div>

        {/* Filter Pills */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
            alignItems: "center",
            marginBottom: "16px",
            paddingBottom: "14px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", marginRight: 4 }}>
            Filter:
          </span>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              style={{
                border: "none",
                background: selectedCategory === cat ? "var(--primary)" : "var(--bg)",
                color: selectedCategory === cat ? "#FFFFFF" : "var(--text)",
                padding: "6px 12px",
                borderRadius: "999px",
                fontSize: "11.5px",
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {cat}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setSelectedCategory("Low Stock")}
            style={{
              border: "none",
              background: selectedCategory === "Low Stock" ? "#BE4436" : "#FBE7E3",
              color: selectedCategory === "Low Stock" ? "#FFFFFF" : "#BE4436",
              padding: "6px 12px",
              borderRadius: "999px",
              fontSize: "11.5px",
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            ⚠️ Low Stock ({lowOrOutCount})
          </button>
        </div>

        {/* Structured, Well-Aligned Table */}
        <div className="table-wrap products-table-wrap" ref={tableWrapRef}>
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, tableLayout: "auto" }}>
            <thead>
              <tr style={{ background: "rgba(0,0,0,0.02)" }}>
                <th style={{ minWidth: "220px", textAlign: "left", padding: "12px 14px" }}>Product & Origin</th>
                <th style={{ minWidth: "110px", textAlign: "left", padding: "12px 14px" }}>Category</th>
                <th style={{ minWidth: "120px", textAlign: "left", padding: "12px 14px" }}>Available Stock</th>
                <th style={{ minWidth: "180px", textAlign: "left", padding: "12px 14px" }}>Capacity Gauge</th>
                <th style={{ minWidth: "140px", textAlign: "left", padding: "12px 14px" }}>Cold Chain</th>
                <th style={{ minWidth: "110px", textAlign: "left", padding: "12px 14px" }}>Status</th>
                {onUpdateStock && (
                  <th style={{ minWidth: "120px", textAlign: "right", padding: "12px 14px" }}>Quick Adjust</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={onUpdateStock ? 7 : 6}
                    style={{ textAlign: "center", padding: "40px 16px", color: "var(--muted)" }}
                  >
                    No products match the filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedInventory.map((product) => {
                  const state = getStockState(product.stock);
                  const maxTarget = 50; // Reference 50kg standard hub capacity per SKU
                  const percent = Math.min(Math.round(((product.stock || 0) / maxTarget) * 100), 100);
                  const isUpdating = updatingId === product.id;

                  const badgeClass =
                    state === "Healthy"
                      ? "badge success"
                      : state === "Low stock"
                      ? "badge warning"
                      : "badge error";

                  const progressColor =
                    state === "Healthy"
                      ? "#2E7D5B"
                      : state === "Low stock"
                      ? "#B9791F"
                      : "#BE4436";

                  return (
                    <tr
                      key={product.id}
                      style={{
                        opacity: isUpdating ? 0.6 : 1,
                        transition: "all 0.15s ease",
                      }}
                    >
                      {/* Product Name & Origin */}
                      <td style={{ padding: "14px", verticalAlign: "middle" }}>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                            <strong style={{ fontSize: "13px", color: "var(--text)" }}>{product.name}</strong>
                            {product.isDailyCatch && (
                              <span
                                style={{
                                  fontSize: "10px",
                                  padding: "2px 6px",
                                  borderRadius: "10px",
                                  background: "#E8F5E9",
                                  color: "#1E5840",
                                  fontWeight: 700,
                                }}
                              >
                                🐟 Daily Catch
                              </span>
                            )}
                            {product.isFlashFrozen && (
                              <span
                                style={{
                                  fontSize: "10px",
                                  padding: "2px 6px",
                                  borderRadius: "10px",
                                  background: "#E0F2FE",
                                  color: "#0369A1",
                                  fontWeight: 700,
                                }}
                              >
                                ❄️ Flash-Frozen
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>
                            {product.origin ? `📍 ${product.origin}` : "📍 Central Hub CLT-01"} · per {product.unit}
                          </span>
                        </div>
                      </td>

                      {/* Category */}
                      <td style={{ padding: "14px", verticalAlign: "middle" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "4px 9px",
                            borderRadius: "6px",
                            fontSize: "11px",
                            fontWeight: 700,
                            background: "var(--bg)",
                            color: "var(--primary)",
                          }}
                        >
                          {product.category}
                        </span>
                      </td>

                      {/* Available Stock */}
                      <td style={{ padding: "14px", verticalAlign: "middle" }}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
                          <strong style={{ fontSize: "15px", color: state === "Out of stock" ? "#BE4436" : "var(--text)" }}>
                            {product.stock}
                          </strong>
                          <span style={{ fontSize: "12px", color: "var(--muted)" }}>{product.unit}</span>
                        </div>
                      </td>

                      {/* Capacity Gauge with Progress Bar & Percentage */}
                      <td style={{ padding: "14px", verticalAlign: "middle" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxWidth: "160px" }}>
                          <div
                            style={{
                              width: "100%",
                              height: "7px",
                              background: "var(--alt)",
                              borderRadius: "999px",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                width: `${percent}%`,
                                height: "100%",
                                background: progressColor,
                                borderRadius: "999px",
                                transition: "width 0.3s ease",
                              }}
                            />
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10.5px", color: "var(--muted)" }}>
                            <span>{product.stock} / {maxTarget} {product.unit}</span>
                            <span style={{ fontWeight: 700 }}>{percent}%</span>
                          </div>
                        </div>
                      </td>

                      {/* Cold Chain Sensor Badge */}
                      <td style={{ padding: "14px", verticalAlign: "middle" }}>
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            fontSize: "11px",
                            fontWeight: 700,
                            color: "#1F4D46",
                            background: "#E4ECE9",
                            padding: "4px 8px",
                            borderRadius: "6px",
                          }}
                        >
                          <Snowflake size={13} style={{ color: "#2E7D5B" }} />
                          <span>2.0°C · Fresh</span>
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td style={{ padding: "14px", verticalAlign: "middle" }}>
                        <span className={badgeClass}>{state}</span>
                      </td>

                      {/* Quick Adjust Buttons */}
                      {onUpdateStock && (
                        <td style={{ padding: "14px", verticalAlign: "middle", textAlign: "right" }}>
                          <div
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => handleAdjust(product, -5)}
                              disabled={product.stock <= 0 || isUpdating}
                              title="Decrease stock by 5 kg"
                              style={{
                                width: "28px",
                                height: "28px",
                                borderRadius: "6px",
                                border: "1px solid var(--border)",
                                background: "var(--surface)",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "var(--muted)",
                                cursor: product.stock <= 0 || isUpdating ? "not-allowed" : "pointer",
                                opacity: product.stock <= 0 ? 0.4 : 1,
                              }}
                            >
                              <Minus size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAdjust(product, 5)}
                              disabled={isUpdating}
                              title="Increase stock by 5 kg"
                              style={{
                                width: "28px",
                                height: "28px",
                                borderRadius: "6px",
                                border: "1px solid var(--border)",
                                background: "var(--surface)",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "var(--primary)",
                                cursor: isUpdating ? "not-allowed" : "pointer",
                              }}
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        </td>
                      )}
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
                <strong>{totalItems}</strong> items
                <span style={{ color: "var(--soft)", marginLeft: 8 }}>
                  (Page {currentPage} of {totalPages} · 25 per page)
                </span>
              </>
            ) : (
              "0 items found"
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
    </div>
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
