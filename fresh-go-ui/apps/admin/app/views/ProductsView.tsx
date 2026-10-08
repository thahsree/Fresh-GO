"use client";

import {
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { getStockState, Product } from "../models/product";
import { Category } from "../lib/api";

type ProductsViewProps = {
  products: Product[];
  categories?: Category[];
  deleteProduct: (id: string) => Promise<void> | void;
  updateProduct?: (id: string, input: any) => Promise<void> | void;
  onCreate: () => void;
  onEdit: (product: Product) => void;
};

export function ProductsView({
  products,
  categories = [],
  deleteProduct,
  updateProduct,
  onCreate,
  onEdit,
}: ProductsViewProps) {
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // System back button closes delete confirmation modal
  useEffect(() => {
    if (!productToDelete || typeof window === "undefined") return;

    window.history.pushState({ freshgo_modal: "delete" }, "");

    const handlePop = () => {
      setProductToDelete(null);
    };

    window.addEventListener("popstate", handlePop);
    return () => {
      window.removeEventListener("popstate", handlePop);
    };
  }, [productToDelete]);

  const closeDeleteModal = () => {
    if (isDeleting) return;
    setProductToDelete(null);
    if (typeof window !== "undefined" && window.history.state?.freshgo_modal === "delete") {
      window.history.back();
    }
  };

  const PAGE_SIZE = 25;
  const [currentPage, setCurrentPage] = useState(1);
  const tableWrapRef = useRef<HTMLDivElement>(null);

  // Canonical default categories ensure Meat, Fish, Vegetables, Frozen, Offers are always present
  const DEFAULT_CATEGORIES = ["Fish", "Meat", "Vegetables", "Frozen", "Offers"];

  const uniqueCategories = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];

    const candidateSources = [
      ...DEFAULT_CATEGORIES,
      ...(categories || []).map((c) => c.name).filter(Boolean),
      ...products.map((p) => p.category).filter(Boolean),
    ];

    for (const cat of candidateSources) {
      const trimmed = cat.trim();
      const lower = trimmed.toLowerCase();
      if (!lower) continue;
      if (!seen.has(lower)) {
        seen.add(lower);
        const formatted = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
        list.push(formatted);
      }
    }
    return list;
  }, [categories, products]);

  const visibleProducts = products.filter((product) => {
    const matchesQuery = `${product.name} ${product.category} ${product.origin || ""}`
      .toLowerCase()
      .includes(query.toLowerCase());
    if (!matchesQuery) return false;

    if (
      categoryFilter !== "all" &&
      product.category?.toLowerCase().trim() !== categoryFilter.toLowerCase().trim()
    ) {
      return false;
    }

    return true;
  });

  // Reset to page 1 whenever the search query or category filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [query, categoryFilter]);

  const totalItems = visibleProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, totalItems);
  const paginatedProducts = visibleProducts.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    const clamped = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(clamped);
    tableWrapRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    const target = productToDelete;
    setProductToDelete(null);
    if (typeof window !== "undefined" && window.history.state?.freshgo_modal === "delete") {
      window.history.back();
    }
    setDeletingId(target.id);
    setIsDeleting(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 380));
      await deleteProduct(target.id);
    } finally {
      setDeletingId(null);
      setIsDeleting(false);
    }
  };

  return (
    <div className="products-layout">
      {/* Delete Confirmation Modal */}
      {productToDelete && (
        <div
          className="delete-modal-backdrop"
          onClick={closeDeleteModal}
        >
          <div
            className="delete-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "10px",
                  background: "#FBE7E3",
                  color: "#BE4436",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Trash2 size={22} className="trash-shake" />
              </div>
              <button
                type="button"
                onClick={closeDeleteModal}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--muted)",
                  cursor: "pointer",
                  padding: 4,
                }}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <h3
              style={{
                fontFamily: "Fraunces, serif",
                fontSize: "19px",
                fontWeight: 600,
                color: "var(--text)",
                margin: "0 0 8px 0",
              }}
            >
              Delete product?
            </h3>
            <p
              style={{
                fontSize: "13px",
                color: "var(--muted)",
                lineHeight: "1.5",
                margin: "0 0 18px 0",
              }}
            >
              Are you sure you want to remove{" "}
              <strong style={{ color: "var(--text)" }}>
                &ldquo;{productToDelete.name}&rdquo;
              </strong>{" "}
              from the catalogue? This will archive any associated inventory
              batches and remove it from store shelves.
            </p>

            <div
              style={{
                background: "var(--bg)",
                borderRadius: "8px",
                padding: "10px 14px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: "12px",
                marginBottom: 20,
              }}
            >
              <div>
                <span style={{ color: "var(--muted)" }}>Category: </span>
                <strong>{productToDelete.category}</strong>
              </div>
              <div>
                <span style={{ color: "var(--muted)" }}>Current Stock: </span>
                <strong style={{ color: "#1F4D46" }}>
                  {productToDelete.stock} {productToDelete.unit}
                </strong>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
              }}
            >
              <button
                type="button"
                onClick={closeDeleteModal}
                style={{
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  borderRadius: "8px",
                  padding: "9px 16px",
                  fontWeight: 700,
                  fontSize: "12px",
                  color: "var(--text)",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                style={{
                  border: "none",
                  background: "#BE4436",
                  color: "#FFFFFF",
                  borderRadius: "8px",
                  padding: "9px 18px",
                  fontWeight: 800,
                  fontSize: "12px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "0 4px 12px rgba(190, 68, 54, 0.3)",
                }}
              >
                <Trash2 size={14} /> Yes, delete product
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="panel products-panel">
        <div className="toolbar">
          <div>
            <h2>Products</h2>
            <span className="muted">
              {query.trim() || categoryFilter !== "all"
                ? `${visibleProducts.length} of ${products.length} products found`
                : `${products.length} products in your catalogue`}
            </span>
          </div>
          <div className="toolbar-actions">
            <label className="search-wrap">
              <Search size={16} aria-hidden="true" />
              <input
                className="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search products..."
              />
            </label>
            <button className="primary" type="button" onClick={onCreate}>
              <Plus size={16} /> Add product
            </button>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "0 24px 14px 24px",
            borderBottom: "1px solid var(--border)",
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontSize: "12px",
              fontWeight: 700,
              color: "var(--muted)",
              marginRight: 4,
            }}
          >
            Category:
          </span>
          <button
            type="button"
            onClick={() => setCategoryFilter("all")}
            style={{
              padding: "5px 12px",
              borderRadius: "20px",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
              border:
                categoryFilter === "all"
                  ? "1px solid var(--primary)"
                  : "1px solid var(--border)",
              background:
                categoryFilter === "all" ? "var(--primary)" : "var(--surface)",
              color: categoryFilter === "all" ? "#FFFFFF" : "var(--text)",
              transition: "all 0.15s ease",
            }}
          >
            All ({products.length})
          </button>
          {uniqueCategories.map((cat) => {
            const count = products.filter(
              (p) => p.category?.toLowerCase().trim() === cat.toLowerCase().trim()
            ).length;
            const isSelected = categoryFilter.toLowerCase().trim() === cat.toLowerCase().trim();
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(isSelected ? "all" : cat)}
                style={{
                  padding: "5px 12px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  border: isSelected
                    ? "1px solid var(--primary)"
                    : "1px solid var(--border)",
                  background: isSelected ? "var(--primary)" : "var(--surface)",
                  color: isSelected ? "#FFFFFF" : "var(--text)",
                  transition: "all 0.15s ease",
                }}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>

        <div className="table-wrap products-table-wrap" ref={tableWrapRef}>
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
                <th style={{ textAlign: "right", paddingRight: "16px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleProducts.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      textAlign: "center",
                      padding: "36px 16px",
                      color: "var(--muted)",
                    }}
                  >
                    No products found.
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((product) => {
                  const stockState = getStockState(product.stock);
                  const isRowDeleting = deletingId === product.id;
                  const fallbackIcon =
                    product.category.toLowerCase().includes("fish")
                      ? "🐟"
                      : product.category.toLowerCase().includes("meat")
                      ? "🥩"
                      : product.category.toLowerCase().includes("veg")
                      ? "🥬"
                      : product.category.toLowerCase().includes("frozen")
                      ? "❄️"
                      : "📦";

                  return (
                    <tr
                      key={product.id}
                      className={`clickable-row ${isRowDeleting ? "row-deleting" : ""}`}
                      onClick={() => {
                        if (!isRowDeleting) {
                          onEdit(product);
                        }
                      }}
                      title={`Click to edit ${product.name}`}
                      style={{
                        cursor: isRowDeleting ? "default" : "pointer",
                      }}
                    >
                      <td>
                        <div className="product-cell">
                          <div className="product-thumb">
                            {product.image ? (
                              <img
                                src={product.image}
                                alt={product.name}
                                loading="lazy"
                                onError={(e) => {
                                  (e.currentTarget as HTMLElement).style.display = "none";
                                  const parent = (e.currentTarget as HTMLElement).parentElement;
                                  if (parent) {
                                    parent.innerHTML = `<span style="font-size: 20px;">${fallbackIcon}</span>`;
                                  }
                                }}
                              />
                            ) : (
                              <span style={{ fontSize: "20px" }}>{fallbackIcon}</span>
                            )}
                          </div>
                          <div>
                            <strong>{product.name}</strong>
                            <div style={{ display: "flex", gap: "6px", alignItems: "center", marginTop: "2px" }}>
                              <small>per {product.unit}</small>
                              {product.cuts && product.cuts.length > 0 ? (
                                <span
                                  style={{
                                    fontSize: "10.5px",
                                    background: "rgba(3, 105, 161, 0.1)",
                                    color: "var(--primary, #0369a1)",
                                    padding: "1px 6px",
                                    borderRadius: "4px",
                                    fontWeight: 600,
                                  }}
                                  title={`Available cuts: ${product.cuts.map((c) => c.name).join(", ")}`}
                                >
                                  🔪 {product.cuts.length} cuts
                                </span>
                              ) : (
                                <span
                                  style={{
                                    fontSize: "10.5px",
                                    background: "rgba(100, 116, 139, 0.1)",
                                    color: "var(--muted, #64748b)",
                                    padding: "1px 6px",
                                    borderRadius: "4px",
                                  }}
                                  title="No cut preferences required for this product"
                                >
                                  No cuts
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ verticalAlign: "middle" }}>{product.category}</td>
                      <td style={{ verticalAlign: "middle", fontWeight: 700 }}>
                        ₹{product.price}
                      </td>
                      <td style={{ verticalAlign: "middle" }}>
                        <span
                          className={`badge ${
                            stockState === "Healthy"
                              ? "success"
                              : stockState === "Low stock"
                              ? "warning"
                              : "danger"
                          }`}
                        >
                          {product.stock} {product.unit}
                        </span>
                      </td>
                      <td style={{ verticalAlign: "middle" }}>
                        <span
                          className={`badge ${
                            product.active ? "success" : "muted"
                          }`}
                        >
                          {product.active ? "Active" : "Hidden"}
                        </span>
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          paddingRight: "16px",
                          verticalAlign: "middle",
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <button
                            type="button"
                            className="icon-action-btn edit-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit(product);
                            }}
                            title={`Edit ${product.name}`}
                            aria-label={`Edit ${product.name}`}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            className="icon-action-btn delete-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setProductToDelete(product);
                            }}
                            title={`Delete ${product.name}`}
                            aria-label={`Delete ${product.name}`}
                          >
                            <Trash2 size={14} />
                          </button>
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
        {totalPages > 1 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 24px",
              borderTop: "1px solid var(--border)",
              flexWrap: "wrap",
              gap: "10px",
              fontSize: "13px",
              color: "var(--muted)",
            }}
          >
            <div>
              Showing <strong>{startIndex + 1}</strong> &ndash;{" "}
              <strong>{endIndex}</strong> of <strong>{totalItems}</strong> products
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <button
                type="button"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage <= 1}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "6px 10px",
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  color: "var(--text)",
                  cursor: currentPage <= 1 ? "not-allowed" : "pointer",
                  opacity: currentPage <= 1 ? 0.45 : 1,
                  fontSize: "12px",
                  fontWeight: 600,
                }}
              >
                <ChevronLeft size={14} /> Previous
              </button>
              <div
                style={{
                  padding: "0 8px",
                  fontWeight: 700,
                  color: "var(--text)",
                  fontSize: "12px",
                }}
              >
                Page {currentPage} of {totalPages}
              </div>
              <button
                type="button"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "6px 10px",
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  color: "var(--text)",
                  cursor: currentPage >= totalPages ? "not-allowed" : "pointer",
                  opacity: currentPage >= totalPages ? 0.45 : 1,
                  fontSize: "12px",
                  fontWeight: 600,
                }}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
