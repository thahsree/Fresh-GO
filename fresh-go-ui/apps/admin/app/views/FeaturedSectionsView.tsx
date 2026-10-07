"use client";

import {
  Check,
  CheckCircle2,
  ChevronDown,
  Edit2,
  Eye,
  EyeOff,
  Layers,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { FeaturedSectionItem } from "../lib/api";
import { Product } from "../models/product";

type FeaturedSectionsViewProps = {
  sections: FeaturedSectionItem[];
  allProducts: Product[];
  isLoading: boolean;
  onRefresh: () => Promise<void> | void;
  onCreateSection: (data: {
    title: string;
    subtitle?: string;
    icon?: string;
    sortOrder?: number;
    isActive?: boolean;
    productIds?: string[];
  }) => Promise<void>;
  onUpdateSection: (
    id: string,
    data: {
      title?: string;
      subtitle?: string;
      icon?: string;
      sortOrder?: number;
      isActive?: boolean;
      productIds?: string[];
    }
  ) => Promise<void>;
  onDeleteSection: (id: string) => Promise<void>;
  onToggleProduct: (sectionId: string, productId: string) => Promise<void>;
  showToast: (message: string, type?: "success" | "error" | "info" | "delete", title?: string) => void;
};

const SUGGESTED_ICONS = ["⭐", "🔥", "👑", "✨", "🐟", "🥩", "🥬", "⚡", "🎯", "🦐", "🍗", "🧊"];

export function FeaturedSectionsView({
  sections,
  allProducts,
  isLoading,
  onRefresh,
  onCreateSection,
  onUpdateSection,
  onDeleteSection,
  onToggleProduct,
  showToast,
}: FeaturedSectionsViewProps) {
  // Modal states
  const [editingSection, setEditingSection] = useState<FeaturedSectionItem | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [managingSection, setManagingSection] = useState<FeaturedSectionItem | null>(null);
  const [sectionToDelete, setSectionToDelete] = useState<FeaturedSectionItem | null>(null);

  // Form states for Create/Edit section
  const [formTitle, setFormTitle] = useState("");
  const [formSubtitle, setFormSubtitle] = useState("");
  const [formIcon, setFormIcon] = useState("⭐");
  const [formIsActive, setFormIsActive] = useState(true);
  const [formSortOrder, setFormSortOrder] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  // Search in product picker
  const [pickerQuery, setPickerQuery] = useState("");
  const [pickerCategory, setPickerCategory] = useState("all");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [isSavingProducts, setIsSavingProducts] = useState(false);

  // Open Create Modal
  const openCreateModal = () => {
    setFormTitle("");
    setFormSubtitle("");
    setFormIcon("✨");
    setFormIsActive(true);
    setFormSortOrder(sections.length);
    setIsCreating(true);
    setEditingSection(null);
  };

  // Open Edit Modal
  const openEditModal = (sec: FeaturedSectionItem) => {
    setFormTitle(sec.title);
    setFormSubtitle(sec.subtitle || "");
    setFormIcon(sec.icon || "⭐");
    setFormIsActive(sec.isActive);
    setFormSortOrder(sec.sortOrder);
    setEditingSection(sec);
    setIsCreating(false);
  };

  // Open Product Picker Modal
  const openProductPicker = (sec: FeaturedSectionItem) => {
    setManagingSection(sec);
    setSelectedProductIds(sec.productIds || []);
    setPickerQuery("");
    setPickerCategory("all");
  };

  // Save Section Details
  const handleSaveSection = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = formTitle.trim();
    if (!title) {
      showToast("Please enter a section title", "error");
      return;
    }

    setIsSaving(true);
    try {
      if (editingSection) {
        await onUpdateSection(editingSection.id, {
          title,
          subtitle: formSubtitle.trim() || undefined,
          icon: formIcon,
          isActive: formIsActive,
          sortOrder: Number(formSortOrder),
        });
        showToast(`Section "${title}" updated successfully!`, "success");
      } else {
        await onCreateSection({
          title,
          subtitle: formSubtitle.trim() || undefined,
          icon: formIcon,
          isActive: formIsActive,
          sortOrder: Number(formSortOrder),
          productIds: [],
        });
        showToast(`New section "${title}" created successfully!`, "success");
      }
      setIsCreating(false);
      setEditingSection(null);
    } catch (err: any) {
      showToast(err?.message || "Failed to save section", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Save Product Selection
  const handleSaveProductSelection = async () => {
    if (!managingSection) return;
    setIsSavingProducts(true);
    try {
      await onUpdateSection(managingSection.id, {
        productIds: selectedProductIds,
      });
      showToast(
        `Updated products for "${managingSection.title}" (${selectedProductIds.length} items)`,
        "success"
      );
      setManagingSection(null);
    } catch (err: any) {
      showToast(err?.message || "Failed to update section products", "error");
    } finally {
      setIsSavingProducts(false);
    }
  };

  // Toggle single product in picker
  const togglePickerProduct = (pid: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(pid) ? prev.filter((id) => id !== pid) : [...prev, pid]
    );
  };

  // Filtered products for picker
  const pickerCategories = useMemo(() => {
    const DEFAULT_CATEGORIES = ["Fish", "Meat", "Vegetables", "Frozen", "Offers"];
    const seen = new Set<string>();
    const list: string[] = [];
    for (const cat of [...DEFAULT_CATEGORIES, ...allProducts.map((p) => p.category).filter(Boolean)]) {
      const trimmed = cat.trim();
      const lower = trimmed.toLowerCase();
      if (!lower) continue;
      if (!seen.has(lower)) {
        seen.add(lower);
        list.push(trimmed.charAt(0).toUpperCase() + trimmed.slice(1));
      }
    }
    return list;
  }, [allProducts]);

  const filteredPickerProducts = useMemo(() => {
    return allProducts.filter((product) => {
      const matchQuery = `${product.name} ${product.category}`
        .toLowerCase()
        .includes(pickerQuery.toLowerCase());
      if (!matchQuery) return false;
      if (pickerCategory !== "all" && product.category.toLowerCase() !== pickerCategory.toLowerCase()) {
        return false;
      }
      return true;
    });
  }, [allProducts, pickerQuery, pickerCategory]);

  return (
    <div style={{ display: "grid", gap: "24px" }}>
      {/* Top Banner / Toolbar */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "14px",
          padding: "24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "24px" }}>★</span>
            <h2 style={{ margin: 0, fontFamily: "Fraunces, serif", fontSize: "24px", fontWeight: 600 }}>
              Featured Sections &amp; Best Sellers
            </h2>
          </div>
          <p style={{ margin: "6px 0 0 0", color: "var(--muted)", fontSize: "13px" }}>
            Give access to Best Sellers, Today&apos;s Offers, or create custom titled product rails
            visible on customer mobile app home screens.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "10px 14px",
              borderRadius: "8px",
              border: "1px solid var(--border)",
              background: "var(--bg)",
              color: "var(--text)",
              fontWeight: 700,
              fontSize: "13px",
            }}
          >
            <RefreshCw size={15} className={isLoading ? "spin" : ""} /> Refresh
          </button>

          <button
            type="button"
            className="primary"
            onClick={openCreateModal}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "10px 18px",
              borderRadius: "8px",
              fontWeight: 800,
              fontSize: "13px",
            }}
          >
            <Plus size={16} /> + New Section
          </button>
        </div>
      </div>

      {/* Sections List */}
      {sections.length === 0 && !isLoading ? (
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "14px",
            padding: "48px 24px",
            textAlign: "center",
          }}
        >
          <Sparkles size={40} style={{ color: "var(--primary)", opacity: 0.6, marginBottom: 12 }} />
          <h3 style={{ margin: "0 0 8px 0" }}>No featured sections found</h3>
          <p style={{ color: "var(--muted)", fontSize: "13px", maxWidth: "420px", margin: "0 auto 20px" }}>
            Create your first featuring section to display custom collections, daily deals, or best sellers.
          </p>
          <button className="primary" onClick={openCreateModal}>
            + Create First Section
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "20px" }}>
          {sections.map((section) => {
            const isCoreSection =
              section.slug === "best-sellers" || section.slug === "todays-offers";
            const sectionProductIds = section.productIds || [];
            const featuredItems = allProducts.filter((p) =>
              sectionProductIds.includes(p.id)
            );

            return (
              <div
                key={section.id}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "14px",
                  overflow: "hidden",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
                  transition: "all 0.2s ease",
                }}
              >
                {/* Section Header */}
                <div
                  style={{
                    padding: "18px 22px",
                    borderBottom: "1px solid var(--border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "14px",
                    background: section.isActive ? "transparent" : "rgba(0,0,0,0.02)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    <div
                      style={{
                        width: "44px",
                        height: "44px",
                        borderRadius: "10px",
                        background:
                          section.slug === "best-sellers"
                            ? "#FEF3C7"
                            : section.slug === "todays-offers"
                            ? "#FEE2E2"
                            : "var(--tint)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "22px",
                      }}
                    >
                      {section.icon || "✨"}
                    </div>

                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <h3
                          style={{
                            margin: 0,
                            fontFamily: "Fraunces, serif",
                            fontSize: "18px",
                            fontWeight: 600,
                            color: "var(--text)",
                          }}
                        >
                          {section.title}
                        </h3>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 800,
                            padding: "2px 8px",
                            borderRadius: "12px",
                            background: section.isActive ? "#E3F1E9" : "#F1EBE0",
                            color: section.isActive ? "var(--success)" : "var(--muted)",
                          }}
                        >
                          {section.isActive ? "Active on App" : "Hidden"}
                        </span>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 700,
                            color: "var(--muted)",
                            background: "var(--bg)",
                            padding: "2px 8px",
                            borderRadius: "12px",
                          }}
                        >
                          {featuredItems.length} Products
                        </span>
                      </div>
                      {section.subtitle && (
                        <p style={{ margin: "4px 0 0 0", color: "var(--muted)", fontSize: "12px" }}>
                          {section.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Header Actions */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <button
                      type="button"
                      onClick={() => openProductPicker(section)}
                      style={{
                        padding: "8px 14px",
                        borderRadius: "7px",
                        border: "1px solid var(--primary)",
                        background: "var(--primary)",
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: "12px",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <Plus size={14} /> Add / Manage Products
                    </button>

                    <button
                      type="button"
                      onClick={() => openEditModal(section)}
                      style={{
                        padding: "8px 12px",
                        borderRadius: "7px",
                        border: "1px solid var(--border)",
                        background: "var(--surface)",
                        color: "var(--text)",
                        fontWeight: 700,
                        fontSize: "12px",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                      }}
                      title="Edit title, subtitle, icon, or visibility"
                    >
                      <Edit2 size={13} /> Edit
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        const nextActive = !section.isActive;
                        await onUpdateSection(section.id, { isActive: nextActive });
                        showToast(
                          `"${section.title}" is now ${nextActive ? "visible" : "hidden"} in mobile app.`,
                          "info"
                        );
                      }}
                      style={{
                        padding: "8px 10px",
                        borderRadius: "7px",
                        border: "1px solid var(--border)",
                        background: "var(--surface)",
                        color: section.isActive ? "var(--muted)" : "var(--success)",
                        fontWeight: 700,
                        fontSize: "12px",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                      title={section.isActive ? "Hide section from customer app" : "Make section visible"}
                    >
                      {section.isActive ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>

                    {!isCoreSection && (
                      <button
                        type="button"
                        onClick={() => setSectionToDelete(section)}
                        style={{
                          padding: "8px 10px",
                          borderRadius: "7px",
                          border: "1px solid #FBE7E3",
                          background: "#FBE7E3",
                          color: "var(--error)",
                          fontWeight: 700,
                          fontSize: "12px",
                          display: "inline-flex",
                          alignItems: "center",
                        }}
                        title="Delete custom section"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Featured Products Grid Preview */}
                <div style={{ padding: "18px 22px" }}>
                  {featuredItems.length === 0 ? (
                    <div
                      style={{
                        padding: "24px 16px",
                        textAlign: "center",
                        background: "var(--bg)",
                        borderRadius: "10px",
                        border: "1px dashed var(--border)",
                      }}
                    >
                      <p style={{ margin: "0 0 10px 0", color: "var(--muted)", fontSize: "13px" }}>
                        No products are featured in this section yet.
                      </p>
                      <button
                        type="button"
                        onClick={() => openProductPicker(section)}
                        style={{
                          padding: "6px 14px",
                          borderRadius: "6px",
                          border: "1px solid var(--border)",
                          background: "var(--surface)",
                          fontWeight: 700,
                          fontSize: "12px",
                          color: "var(--primary)",
                        }}
                      >
                        + Select Products to Feature
                      </button>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))",
                        gap: "12px",
                      }}
                    >
                      {featuredItems.map((product) => (
                        <div
                          key={product.id}
                          style={{
                            background: "var(--bg)",
                            border: "1px solid var(--border)",
                            borderRadius: "9px",
                            padding: "10px 12px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "10px",
                            position: "relative",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                            <div
                              style={{
                                width: "36px",
                                height: "36px",
                                borderRadius: "7px",
                                overflow: "hidden",
                                background: "#fff",
                                flexShrink: 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              {product.image ? (
                                <img
                                  src={product.image}
                                  alt={product.name}
                                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                />
                              ) : (
                                <span style={{ fontSize: "16px" }}>📦</span>
                              )}
                            </div>

                            <div style={{ minWidth: 0 }}>
                              <div
                                style={{
                                  fontSize: "12px",
                                  fontWeight: 700,
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  color: "var(--text)",
                                }}
                                title={product.name}
                              >
                                {product.name}
                              </div>
                              <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: 2 }}>
                                ₹{product.price} / {product.unit}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => onToggleProduct(section.id, product.id)}
                            style={{
                              background: "transparent",
                              border: "none",
                              color: "var(--muted)",
                              cursor: "pointer",
                              padding: "4px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              borderRadius: "4px",
                            }}
                            title={`Remove "${product.name}" from ${section.title}`}
                          >
                            <X size={15} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: Create / Edit Section Form */}
      {(isCreating || editingSection) && (
        <div
          className="delete-modal-backdrop"
          onClick={() => {
            if (!isSaving) {
              setIsCreating(false);
              setEditingSection(null);
            }
          }}
        >
          <div
            className="delete-modal-card"
            style={{ maxWidth: "520px" }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontFamily: "Fraunces, serif",
                  fontSize: "19px",
                  fontWeight: 600,
                }}
              >
                {editingSection ? `Edit "${editingSection.title}"` : "Create Featured Section"}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setEditingSection(null);
                }}
                style={{ background: "transparent", border: "none", color: "var(--muted)" }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveSection} style={{ display: "grid", gap: "14px" }}>
              <label style={{ display: "grid", gap: "6px", fontSize: "12px", fontWeight: 700 }}>
                Section Title *
                <input
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Weekend Catch / Chef's Favorites / Summer Specials"
                  style={{
                    padding: "9px 12px",
                    borderRadius: "7px",
                    border: "1px solid var(--border)",
                    fontSize: "13px",
                  }}
                />
              </label>

              <label style={{ display: "grid", gap: "6px", fontSize: "12px", fontWeight: 700 }}>
                Subtitle / Tagline (Optional)
                <input
                  value={formSubtitle}
                  onChange={(e) => setFormSubtitle(e.target.value)}
                  placeholder="e.g. Hand-picked freshest cuts just arrived this morning"
                  style={{
                    padding: "9px 12px",
                    borderRadius: "7px",
                    border: "1px solid var(--border)",
                    fontSize: "13px",
                  }}
                />
              </label>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: 8 }}>
                  Section Icon / Emoji
                </label>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: 8 }}>
                  {SUGGESTED_ICONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setFormIcon(emoji)}
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "6px",
                        fontSize: "18px",
                        border:
                          formIcon === emoji
                            ? "2px solid var(--primary)"
                            : "1px solid var(--border)",
                        background: formIcon === emoji ? "var(--tint)" : "var(--bg)",
                        cursor: "pointer",
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                <input
                  value={formIcon}
                  onChange={(e) => setFormIcon(e.target.value)}
                  placeholder="Or enter any custom emoji"
                  style={{
                    width: "100%",
                    padding: "7px 12px",
                    borderRadius: "7px",
                    border: "1px solid var(--border)",
                    fontSize: "13px",
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: "14px", alignItems: "center", marginTop: 4 }}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: 600,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    style={{ accentColor: "var(--primary)", width: "16px", height: "16px" }}
                  />
                  Active &amp; Visible in Mobile App
                </label>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                  marginTop: 12,
                  paddingTop: 12,
                  borderTop: "1px solid var(--border)",
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setEditingSection(null);
                  }}
                  style={{
                    padding: "9px 16px",
                    borderRadius: "7px",
                    border: "1px solid var(--border)",
                    background: "var(--surface)",
                    fontSize: "12px",
                    fontWeight: 700,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="primary"
                  style={{ padding: "9px 20px", fontSize: "12px" }}
                >
                  {isSaving ? "Saving..." : editingSection ? "Update Section" : "Create Section"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Product Picker Modal */}
      {managingSection && (
        <div
          className="delete-modal-backdrop"
          onClick={() => {
            if (!isSavingProducts) setManagingSection(null);
          }}
        >
          <div
            className="delete-modal-card"
            style={{ maxWidth: "680px", maxHeight: "88vh", display: "flex", flexDirection: "column" }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 16,
              }}
            >
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontFamily: "Fraunces, serif",
                    fontSize: "19px",
                    fontWeight: 600,
                  }}
                >
                  Select Products for &ldquo;{managingSection.title}&rdquo;
                </h3>
                <p style={{ margin: "4px 0 0 0", color: "var(--muted)", fontSize: "12px" }}>
                  Selected items will appear under this section rail in the customer app.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setManagingSection(null)}
                style={{ background: "transparent", border: "none", color: "var(--muted)" }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Filters */}
            <div style={{ display: "grid", gap: "10px", marginBottom: 14 }}>
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <div className="search-wrap" style={{ flex: 1 }}>
                  <Search size={16} aria-hidden="true" />
                  <input
                    className="search"
                    value={pickerQuery}
                    onChange={(e) => setPickerQuery(e.target.value)}
                    placeholder="Search catalogue by name or category..."
                  />
                </div>
              </div>

              {/* Category Pills */}
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => setPickerCategory("all")}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "14px",
                    fontSize: "11px",
                    fontWeight: 700,
                    border:
                      pickerCategory === "all"
                        ? "1px solid var(--primary)"
                        : "1px solid var(--border)",
                    background: pickerCategory === "all" ? "var(--primary)" : "var(--surface)",
                    color: pickerCategory === "all" ? "#fff" : "var(--text)",
                    cursor: "pointer",
                  }}
                >
                  All ({allProducts.length})
                </button>
                {pickerCategories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setPickerCategory(cat)}
                    style={{
                      padding: "4px 10px",
                      borderRadius: "14px",
                      fontSize: "11px",
                      fontWeight: 700,
                      border:
                        pickerCategory === cat
                          ? "1px solid var(--primary)"
                          : "1px solid var(--border)",
                      background: pickerCategory === cat ? "var(--primary)" : "var(--surface)",
                      color: pickerCategory === cat ? "#fff" : "var(--text)",
                      cursor: "pointer",
                    }}
                  >
                    {cat} ({allProducts.filter((p) => p.category === cat).length})
                  </button>
                ))}
              </div>
            </div>

            {/* Quick selection stats bar */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 12px",
                background: "var(--bg)",
                borderRadius: "8px",
                marginBottom: 10,
                fontSize: "12px",
              }}
            >
              <span>
                <strong>{selectedProductIds.length}</strong> products selected for this section
              </span>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => {
                    const filteredIds = filteredPickerProducts.map((p) => p.id);
                    setSelectedProductIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
                  }}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--primary)",
                    fontWeight: 700,
                    fontSize: "11px",
                    cursor: "pointer",
                  }}
                >
                  Select All Filtered
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedProductIds([])}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--muted)",
                    fontWeight: 700,
                    fontSize: "11px",
                    cursor: "pointer",
                  }}
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Products List Scrollable */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                padding: "6px",
                maxHeight: "380px",
                display: "grid",
                gap: "4px",
              }}
            >
              {filteredPickerProducts.length === 0 ? (
                <div style={{ textAlign: "center", padding: "30px", color: "var(--muted)", fontSize: "13px" }}>
                  No matching products found.
                </div>
              ) : (
                filteredPickerProducts.map((product) => {
                  const isSelected = selectedProductIds.includes(product.id);
                  return (
                    <div
                      key={product.id}
                      onClick={() => togglePickerProduct(product.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 12px",
                        borderRadius: "6px",
                        background: isSelected ? "var(--tint)" : "var(--surface)",
                        cursor: "pointer",
                        border: isSelected
                          ? "1px solid rgba(31, 77, 70, 0.3)"
                          : "1px solid transparent",
                        transition: "all 0.1s ease",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div
                          style={{
                            width: "20px",
                            height: "20px",
                            borderRadius: "5px",
                            border: isSelected
                              ? "2px solid var(--primary)"
                              : "1.5px solid var(--muted)",
                            background: isSelected ? "var(--primary)" : "transparent",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#fff",
                            fontSize: "12px",
                            flexShrink: 0,
                          }}
                        >
                          {isSelected && <Check size={14} />}
                        </div>

                        <div
                          style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "6px",
                            overflow: "hidden",
                            background: "var(--bg)",
                            flexShrink: 0,
                          }}
                        >
                          {product.image ? (
                            <img
                              src={product.image}
                              alt={product.name}
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                          ) : (
                            <span style={{ fontSize: "16px" }}>📦</span>
                          )}
                        </div>

                        <div>
                          <strong style={{ fontSize: "13px", color: "var(--text)" }}>
                            {product.name}
                          </strong>
                          <div style={{ fontSize: "11px", color: "var(--muted)" }}>
                            {product.category} &bull; ₹{product.price} / {product.unit}
                          </div>
                        </div>
                      </div>

                      <div style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 600 }}>
                        {product.stock} {product.unit} in stock
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Actions */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 14,
                paddingTop: 14,
                borderTop: "1px solid var(--border)",
              }}
            >
              <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                Selected: <strong>{selectedProductIds.length}</strong> items
              </span>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setManagingSection(null)}
                  style={{
                    padding: "9px 16px",
                    borderRadius: "7px",
                    border: "1px solid var(--border)",
                    background: "var(--surface)",
                    fontSize: "12px",
                    fontWeight: 700,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSavingProducts}
                  onClick={handleSaveProductSelection}
                  className="primary"
                  style={{ padding: "9px 20px", fontSize: "12px" }}
                >
                  {isSavingProducts ? "Saving..." : "Save Products Selection"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Delete Confirmation Modal */}
      {sectionToDelete && (
        <div
          className="delete-modal-backdrop"
          onClick={() => setSectionToDelete(null)}
        >
          <div
            className="delete-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div style={{ marginBottom: 14 }}>
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
                  marginBottom: 12,
                }}
              >
                <Trash2 size={22} />
              </div>
              <h3 style={{ margin: "0 0 6px 0", fontFamily: "Fraunces, serif", fontSize: "19px" }}>
                Delete &ldquo;{sectionToDelete.title}&rdquo;?
              </h3>
              <p style={{ margin: 0, color: "var(--muted)", fontSize: "13px", lineHeight: "1.4" }}>
                Are you sure you want to remove this featured section? The products will not be
                deleted from your catalogue, but this section rail will no longer appear on the customer app.
              </p>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: 18 }}>
              <button
                type="button"
                onClick={() => setSectionToDelete(null)}
                style={{
                  padding: "9px 16px",
                  borderRadius: "7px",
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  fontSize: "12px",
                  fontWeight: 700,
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const target = sectionToDelete;
                  setSectionToDelete(null);
                  await onDeleteSection(target.id);
                  showToast(`Section "${target.title}" deleted.`, "delete");
                }}
                style={{
                  padding: "9px 18px",
                  borderRadius: "7px",
                  border: "none",
                  background: "#BE4436",
                  color: "#fff",
                  fontSize: "12px",
                  fontWeight: 800,
                }}
              >
                Yes, Delete Section
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
