"use client";

import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getStockState, Product } from "../models/product";

type ProductsViewProps = {
  products: Product[];
  deleteProduct: (id: string) => Promise<void> | void;
  updateProduct?: (id: string, input: any) => Promise<void> | void;
  onCreate: () => void;
  onEdit: (product: Product) => void;
};

export function ProductsView({
  products,
  deleteProduct,
  updateProduct,
  onCreate,
  onEdit,
}: ProductsViewProps) {
  const [query, setQuery] = useState("");
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
  const [tagFilter, setTagFilter] = useState<string>("all");
  const tableWrapRef = useRef<HTMLDivElement>(null);

  const freshCatchCount = products.filter(
    (p) => p.tag === "Fresh Catch" || (!p.tag && p.isDailyCatch)
  ).length;
  const freshCutCount = products.filter((p) => p.tag === "Fresh Cut").length;
  const freshCount = products.filter(
    (p) => p.tag === "Fresh" || (!p.tag && !p.isDailyCatch && !p.isFlashFrozen)
  ).length;
  const frozenCount = products.filter(
    (p) => p.tag === "Frozen" || (!p.tag && p.isFlashFrozen)
  ).length;
  const freshProduceCount = products.filter(
    (p) => p.tag === "Fresh Produce" || p.category.toLowerCase().includes("veg")
  ).length;

  const visibleProducts = products.filter((product) => {
    const matchesQuery = `${product.name} ${product.category} ${product.tag || ""}`
      .toLowerCase()
      .includes(query.toLowerCase());
    if (!matchesQuery) return false;

    if (tagFilter === "Fresh Catch") {
      return product.tag === "Fresh Catch" || (!product.tag && product.isDailyCatch);
    }
    if (tagFilter === "Fresh Cut") {
      return product.tag === "Fresh Cut";
    }
    if (tagFilter === "Fresh") {
      return product.tag === "Fresh" || (!product.tag && !product.isDailyCatch && !product.isFlashFrozen);
    }
    if (tagFilter === "Frozen") {
      return product.tag === "Frozen" || (!product.tag && product.isFlashFrozen);
    }
    if (tagFilter === "Fresh Produce") {
      return product.tag === "Fresh Produce" || product.category.toLowerCase().includes("veg");
    }
    return true;
  });

  // Reset to page 1 whenever the search query or tag filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [query, tagFilter]);

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
      // Allow the 400ms row slide-out animation to play smoothly
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
              {query.trim() || tagFilter !== "all"
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
                placeholder="Search products"
              />
            </label>
            <button className="primary" type="button" onClick={onCreate}>
              <Plus size={16} /> Add product
            </button>
          </div>
        </div>

        {/* Quick Sourcing / Merchandising Badges Filter Bar */}
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
            Filter:
          </span>
          <button
            type="button"
            onClick={() => setTagFilter("all")}
            style={{
              padding: "5px 12px",
              borderRadius: "20px",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
              border:
                tagFilter === "all"
                  ? "1px solid var(--primary)"
                  : "1px solid var(--border)",
              background:
                tagFilter === "all" ? "var(--primary)" : "var(--surface)",
              color: tagFilter === "all" ? "#FFFFFF" : "var(--text)",
              transition: "all 0.15s ease",
            }}
          >
            All Products ({products.length})
          </button>
          <button
            type="button"
            onClick={() => setTagFilter("Fresh Catch")}
            style={{
              padding: "5px 12px",
              borderRadius: "20px",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
              border:
                tagFilter === "Fresh Catch"
                  ? "1px solid #2E7D5B"
                  : "1px solid var(--border)",
              background:
                tagFilter === "Fresh Catch" ? "#2E7D5B" : "var(--surface)",
              color: tagFilter === "Fresh Catch" ? "#FFFFFF" : "#1B5E20",
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              transition: "all 0.15s ease",
            }}
          >
            <span>🐟</span> Fresh Catch ({freshCatchCount})
          </button>
          <button
            type="button"
            onClick={() => setTagFilter("Fresh Cut")}
            style={{
              padding: "5px 12px",
              borderRadius: "20px",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
              border:
                tagFilter === "Fresh Cut"
                  ? "1px solid #854D0E"
                  : "1px solid var(--border)",
              background:
                tagFilter === "Fresh Cut" ? "#854D0E" : "var(--surface)",
              color: tagFilter === "Fresh Cut" ? "#FFFFFF" : "#713F12",
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              transition: "all 0.15s ease",
            }}
          >
            <span>🥩</span> Fresh Cut ({freshCutCount})
          </button>
          <button
            type="button"
            onClick={() => setTagFilter("Fresh")}
            style={{
              padding: "5px 12px",
              borderRadius: "20px",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
              border:
                tagFilter === "Fresh"
                  ? "1px solid #166534"
                  : "1px solid var(--border)",
              background:
                tagFilter === "Fresh" ? "#166534" : "var(--surface)",
              color: tagFilter === "Fresh" ? "#FFFFFF" : "#166534",
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              transition: "all 0.15s ease",
            }}
          >
            <span>🌱</span> Fresh ({freshCount})
          </button>
          <button
            type="button"
            onClick={() => setTagFilter("Frozen")}
            style={{
              padding: "5px 12px",
              borderRadius: "20px",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
              border:
                tagFilter === "Frozen"
                  ? "1px solid #0284C7"
                  : "1px solid var(--border)",
              background:
                tagFilter === "Frozen" ? "#0284C7" : "var(--surface)",
              color: tagFilter === "Frozen" ? "#FFFFFF" : "#0369A1",
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              transition: "all 0.15s ease",
            }}
          >
            <span>❄️</span> Frozen ({frozenCount})
          </button>
          <button
            type="button"
            onClick={() => setTagFilter("Fresh Produce")}
            style={{
              padding: "5px 12px",
              borderRadius: "20px",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
              border:
                tagFilter === "Fresh Produce"
                  ? "1px solid #15803D"
                  : "1px solid var(--border)",
              background:
                tagFilter === "Fresh Produce" ? "#15803D" : "var(--surface)",
              color: tagFilter === "Fresh Produce" ? "#FFFFFF" : "#15803D",
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              transition: "all 0.15s ease",
            }}
          >
            <span>🥬</span> Fresh Produce ({freshProduceCount})
          </button>
        </div>
        <div className="table-wrap products-table-wrap" ref={tableWrapRef}>
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Product Tag</th>
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
                    colSpan={7}
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
                      : product.category.toLowerCase().includes("offer")
                      ? "🔥"
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
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                              <strong>{product.name}</strong>
                              {product.isDailyCatch && (
                                <span
                                  style={{
                                    fontSize: "10.5px",
                                    padding: "2px 7px",
                                    borderRadius: "12px",
                                    background: "#E8F5E9",
                                    color: "#1E5840",
                                    border: "1px solid #A5D6A7",
                                    fontWeight: 700,
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "3px",
                                  }}
                                  title="Customer App: Daily Catch badge active"
                                >
                                  <span>🐟</span> Daily Catch
                                </span>
                              )}
                              {product.isFlashFrozen && (
                                <span
                                  style={{
                                    fontSize: "10.5px",
                                    padding: "2px 7px",
                                    borderRadius: "12px",
                                    background: "#E0F2FE",
                                    color: "#0369A1",
                                    border: "1px solid #BAE6FD",
                                    fontWeight: 700,
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "3px",
                                  }}
                                  title="Customer App: Flash-Frozen Meats badge active"
                                >
                                  <span>❄️</span> Flash-Frozen
                                </span>
                              )}
                            </div>
                            <small>per {product.unit}</small>
                          </div>
                        </div>
                      </td>
                      <td style={{ verticalAlign: "middle" }}>{product.category}</td>
                      <td onClick={(e) => e.stopPropagation()} style={{ verticalAlign: "middle" }}>
                        <select
                          value={
                            product.tag ||
                            (product.isDailyCatch
                              ? "Fresh Catch"
                              : product.isFlashFrozen
                              ? "Frozen"
                              : "Fresh")
                          }
                          onChange={async (e) => {
                            e.stopPropagation();
                            const newTag = e.target.value;
                            if (updateProduct) {
                              await updateProduct(product.id, {
                                ...product,
                                tag: newTag,
                                isDailyCatch: newTag === "Fresh Catch",
                                isFlashFrozen: newTag === "Frozen",
                              });
                            }
                          }}
                          style={{
                            padding: "5px 9px",
                            borderRadius: "7px",
                            fontSize: "12px",
                            fontWeight: 700,
                            cursor: "pointer",
                            border:
                              (product.tag === "Fresh Catch" || product.isDailyCatch)
                                ? "1.5px solid #2E7D5B"
                                : (product.tag === "Frozen" || product.isFlashFrozen)
                                ? "1.5px solid #0284C7"
                                : product.tag === "Fresh Cut"
                                ? "1.5px solid #854D0E"
                                : product.tag === "Fresh Produce"
                                ? "1.5px solid #166534"
                                : "1.5px solid var(--border)",
                            background:
                              (product.tag === "Fresh Catch" || product.isDailyCatch)
                                ? "#E8F5E9"
                                : (product.tag === "Frozen" || product.isFlashFrozen)
                                ? "#E0F2FE"
                                : product.tag === "Fresh Cut"
                                ? "#FEF9C3"
                                : product.tag === "Fresh Produce"
                                ? "#DCFCE7"
                                : "var(--surface)",
                            color:
                              (product.tag === "Fresh Catch" || product.isDailyCatch)
                                ? "#1E5840"
                                : (product.tag === "Frozen" || product.isFlashFrozen)
                                ? "#0369A1"
                                : product.tag === "Fresh Cut"
                                ? "#713F12"
                                : product.tag === "Fresh Produce"
                                ? "#14532D"
                                : "var(--text)",
                          }}
                        >
                          <option value="Fresh Catch">🐟 Fresh Catch</option>
                          <option value="Fresh">🌱 Fresh</option>
                          <option value="Fresh Cut">🥩 Fresh Cut</option>
                          <option value="Frozen">❄️ Frozen</option>
                          <option value="Fresh Produce">🥬 Fresh Produce</option>
                        </select>
                      </td>
                      <td style={{ verticalAlign: "middle" }}>Rs {product.price.toLocaleString()}</td>
                      <td style={{ verticalAlign: "middle" }}>
                        <strong>{product.stock}</strong> {product.unit}
                      </td>
                      <td style={{ verticalAlign: "middle" }}>
                        <span
                          className={`badge ${
                            stockState === "Healthy"
                              ? "success"
                              : stockState === "Low stock"
                              ? "warning"
                              : "error"
                          }`}
                        >
                          {stockState}
                        </span>
                      </td>
                      <td
                        style={{
                          verticalAlign: "middle",
                          textAlign: "right",
                          paddingRight: "16px",
                          whiteSpace: "nowrap",
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "flex-end",
                            gap: "8px",
                            verticalAlign: "middle",
                          }}
                        >
                          <button
                            type="button"
                            className="icon-button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit(product);
                            }}
                            aria-label={`Edit ${product.name}`}
                            title="Edit product"
                            disabled={isRowDeleting}
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            className="icon-button danger"
                            onClick={(e) => {
                              e.stopPropagation();
                              setProductToDelete(product);
                            }}
                            aria-label={`Delete ${product.name}`}
                            title="Delete product"
                            disabled={isRowDeleting}
                            style={{
                              transition: "all 0.2s ease",
                            }}
                          >
                            <Trash2 size={15} />
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
        <div className="pagination-bar">
          <div className="pagination-info">
            {totalItems > 0 ? (
              <>
                Showing <strong>{startIndex + 1}</strong>–<strong>{endIndex}</strong> of{" "}
                <strong>{totalItems}</strong> products
                <span style={{ color: "var(--soft)", marginLeft: 8 }}>
                  (Page {currentPage} of {totalPages} · 25 per page)
                </span>
              </>
            ) : (
              "0 products"
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
