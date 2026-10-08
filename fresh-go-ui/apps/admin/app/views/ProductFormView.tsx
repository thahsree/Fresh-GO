"use client";

import { ArrowLeft, ImagePlus, Plus, X } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { CutOption, Product, ProductInput } from "../models/product";
import { Category } from "../lib/api";
import { CustomDropdown } from "../components/CustomDropdown";

type ProductFormViewProps = {
  product?: Product;
  categories?: Category[];
  onSave: (input: ProductInput) => Promise<void> | void;
  onCancel: () => void;
};

const CATEGORY_CUT_SUGGESTIONS: Record<string, string[]> = {
  fish: [
    "Curry Cut",
    "Steak / Slice Cut",
    "Whole Cleaned",
    "Fillet / Boneless",
    "Headless Curry Cut",
    "Fry Cut",
  ],
  meat: [
    "Curry Cut (Medium)",
    "Biryani Cut (Large)",
    "Boneless Cubes",
    "Minced / Keema",
    "Soup Bones",
  ],
  chicken: [
    "Curry Cut (Medium)",
    "Biryani Cut (Large)",
    "Boneless Cubes",
    "Minced / Keema",
    "Drumsticks Only",
  ],
  mutton: [
    "Curry Cut (Medium)",
    "Biryani Cut (Large)",
    "Boneless Cubes",
    "Minced / Keema",
    "Chops & Ribs",
  ],
  vegetables: [
    "Whole Cleaned",
    "Pre-Sliced",
    "Diced / Cubes",
    "Florets",
  ],
  frozen: [
    "1-inch Steaks",
    "Standard Pack",
    "Portion Cut",
  ],
  default: [
    "Standard Cut",
    "Whole Cleaned",
    "Diced / Cubes",
  ],
};

function getCategorySuggestions(categoryName: string): string[] {
  const cat = (categoryName || "").toLowerCase();
  if (cat.includes("fish") || cat.includes("seafood") || cat.includes("prawn")) {
    return CATEGORY_CUT_SUGGESTIONS.fish;
  }
  if (cat.includes("chicken")) {
    return CATEGORY_CUT_SUGGESTIONS.chicken;
  }
  if (cat.includes("mutton")) {
    return CATEGORY_CUT_SUGGESTIONS.mutton;
  }
  if (cat.includes("meat")) {
    return CATEGORY_CUT_SUGGESTIONS.meat;
  }
  if (cat.includes("veg") || cat.includes("produce")) {
    return CATEGORY_CUT_SUGGESTIONS.vegetables;
  }
  if (cat.includes("froz")) {
    return CATEGORY_CUT_SUGGESTIONS.frozen;
  }
  return CATEGORY_CUT_SUGGESTIONS.default;
}

const emptyForm: ProductInput = {
  name: "",
  category: "Fish",
  unit: "kg",
  price: 0,
  stock: 10,
  active: true,
  image: "",
  description: "",
  origin: "",
};

export function ProductFormView({
  product,
  categories = [],
  onSave,
  onCancel,
}: ProductFormViewProps) {
  const [form, setForm] = useState<ProductInput>(() =>
    product ? { ...product } : emptyForm
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = Boolean(product);

  const [hasCutPreference, setHasCutPreference] = useState<boolean>(() => {
    return Boolean(product?.cuts && product.cuts.length > 0);
  });

  const [cuts, setCuts] = useState<CutOption[]>(() => {
    if (product?.cuts && product.cuts.length > 0) {
      return product.cuts.map((c) => ({
        id: c.id,
        name: c.name,
        priceModifier: c.priceModifier || 0,
        isDefault: Boolean(c.isDefault),
      }));
    }
    return [];
  });

  const categoryOptions =
    categories.length > 0
      ? categories.map((c) => ({ id: c.id, name: c.name }))
      : [
          { id: "fish", name: "Fish" },
          { id: "meat", name: "Meat" },
          { id: "vegetables", name: "Vegetables" },
          { id: "frozen", name: "Frozen" },
          { id: "offers", name: "Offers" },
        ];

  const suggestedCuts = useMemo(() => {
    return getCategorySuggestions(form.category);
  }, [form.category]);

  const toggleSuggestion = (suggestion: string) => {
    const existingIndex = cuts.findIndex(
      (c) => c.name.toLowerCase().trim() === suggestion.toLowerCase().trim()
    );
    if (existingIndex >= 0) {
      const next = cuts.filter((_, idx) => idx !== existingIndex);
      if (cuts[existingIndex].isDefault && next.length > 0) {
        next[0].isDefault = true;
      }
      setCuts(next);
    } else {
      const isFirst = cuts.length === 0;
      setCuts((prev) => [
        ...prev,
        {
          name: suggestion,
          priceModifier: 0,
          isDefault: isFirst,
        },
      ]);
    }
  };

  const handleAddCustomCut = () => {
    const isFirst = cuts.length === 0;
    setCuts((prev) => [
      ...prev,
      {
        name: "",
        priceModifier: 0,
        isDefault: isFirst,
      },
    ]);
  };

  const updateCut = (index: number, updates: Partial<CutOption>) => {
    setCuts((prev) =>
      prev.map((c, i) => (i === index ? { ...c, ...updates } : c))
    );
  };

  const setDefaultCut = (index: number) => {
    setCuts((prev) =>
      prev.map((c, i) => ({
        ...c,
        isDefault: i === index,
      }))
    );
  };

  const removeCut = (index: number) => {
    setCuts((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (prev[index]?.isDefault && next.length > 0) {
        next[0].isDefault = true;
      }
      return next;
    });
  };

  const handleToggleCutPreference = (enabled: boolean) => {
    setHasCutPreference(enabled);
    if (enabled && cuts.length === 0) {
      const suggestions = getCategorySuggestions(form.category);
      if (suggestions.length >= 2) {
        setCuts([
          { name: suggestions[0], priceModifier: 0, isDefault: true },
          { name: suggestions[1], priceModifier: 0, isDefault: false },
        ]);
      } else if (suggestions.length === 1) {
        setCuts([
          { name: suggestions[0], priceModifier: 0, isDefault: true },
        ]);
      }
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    const trimmedName = form.name.trim();
    if (!trimmedName) {
      setErrorMessage("Product name is required.");
      return;
    }

    if (Number(form.price) <= 0) {
      setErrorMessage("Price must be a positive number greater than 0.");
      return;
    }

    let finalCuts: CutOption[] = [];
    if (hasCutPreference) {
      const cleaned = cuts
        .map((c) => ({
          ...c,
          name: c.name.trim(),
          priceModifier: Number(c.priceModifier) || 0,
          isDefault: Boolean(c.isDefault),
        }))
        .filter((c) => c.name.length > 0);

      if (cleaned.length === 0) {
        setErrorMessage(
          "Cut preference is enabled. Please add at least one cut type or uncheck the toggle."
        );
        return;
      }

      const hasDefault = cleaned.some((c) => c.isDefault);
      finalCuts = cleaned.map((c, idx) => ({
        ...c,
        isDefault: hasDefault ? c.isDefault : idx === 0,
      }));
    }

    try {
      setIsSubmitting(true);
      await onSave({
        ...form,
        name: trimmedName,
        price: Number(form.price),
        stock: Number(form.stock),
        description:
          form.description && form.description.trim().length > 0
            ? form.description.trim()
            : `${trimmedName} - freshly sourced and hygienically packed.`,
        origin:
          form.origin && form.origin.trim().length > 0
            ? form.origin.trim()
            : "Local Hub",
        cuts: finalCuts,
      });
    } catch (err: any) {
      console.error("Save product failed:", err);
      const msg =
        err?.message ||
        "Failed to save product. Please verify all fields and backend connection.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageChange = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () =>
      setForm((current) => ({ ...current, image: String(reader.result) }));
    reader.readAsDataURL(file);
  };

  return (
    <section className="panel product-form-page">
      <div className="form-heading">
        <div>
          <button className="back-button" type="button" onClick={onCancel}>
            <ArrowLeft size={16} aria-hidden="true" /> Back to products
          </button>
          <h2>{isEditing ? "Edit product" : "Add product"}</h2>
          <span className="muted">
            Keep catalogue, prices, and inventory stock current.
          </span>
        </div>
      </div>

      <form className="product-form" onSubmit={submit}>
        {errorMessage && (
          <div
            style={{
              padding: "12px 14px",
              borderRadius: "8px",
              background: "#FBE7E3",
              border: "1px solid #BE4436",
              color: "#9C2B1F",
              fontSize: "13px",
              lineHeight: "1.5",
            }}
          >
            <div style={{ fontWeight: 800, marginBottom: 2 }}>
              ⚠️ Unable to save product
            </div>
            <div>{errorMessage}</div>
          </div>
        )}

        <div className="product-image-field">
          <span>Product image</span>
          <label className={`image-upload ${form.image ? "has-image" : ""}`}>
            {form.image ? (
              <img src={form.image} alt="Product preview" />
            ) : (
              <ImagePlus size={24} aria-hidden="true" />
            )}
            <span>{form.image ? "Replace image" : "Upload image (Optional)"}</span>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => handleImageChange(event.target.files?.[0])}
            />
          </label>
          {form.image && (
            <button
              className="remove-image"
              type="button"
              onClick={() => setForm({ ...form, image: "" })}
            >
              <X size={14} /> Remove image
            </button>
          )}
        </div>

        <label>
          Product name
          <input
            required
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            placeholder="e.g. Seer Fish Steak Cut"
          />
        </label>

        <label>
          Description
          <textarea
            rows={2}
            value={form.description || ""}
            onChange={(event) =>
              setForm({ ...form, description: event.target.value })
            }
            placeholder="e.g. Freshly line-caught coastal seer fish, descaled and cut into firm steaks."
            style={{
              border: "1px solid var(--border)",
              borderRadius: "7px",
              padding: "10px",
              background: "var(--surface)",
              color: "var(--text)",
              font: "inherit",
              fontSize: "13px",
              resize: "vertical",
            }}
          />
        </label>

        <div className="form-grid">
          <div>
            <label style={{ display: "block", marginBottom: "6px" }}>Category</label>
            <CustomDropdown
              value={form.category}
              onChange={(nextCat) => {
                const selectedCat = categoryOptions.find(
                  (c) => c.name === nextCat
                );
                setForm((prev) => ({
                  ...prev,
                  category: nextCat,
                  categoryId: selectedCat?.id,
                }));
              }}
              options={categoryOptions.map((cat) => ({
                value: cat.name,
                label: cat.name,
              }))}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "6px" }}>Unit</label>
            <CustomDropdown
              value={form.unit}
              onChange={(nextUnit) => setForm({ ...form, unit: nextUnit })}
              options={[
                { value: "kg", label: "kg (Kilogram)" },
                { value: "500g", label: "500g" },
                { value: "300g", label: "300g" },
                { value: "200g", label: "200g" },
                { value: "pack", label: "pack (Pack)" },
                { value: "bunch", label: "bunch (Bunch)" },
              ]}
            />
          </div>
        </div>

        <div className="form-grid">
          <label>
            Origin / Catch Source (Optional)
            <input
              value={form.origin || ""}
              onChange={(event) =>
                setForm({ ...form, origin: event.target.value })
              }
              placeholder="e.g. Kozhikode Coastal Waters / Nilgiris Farm"
            />
          </label>

          <label>
            Price (Rs)
            <input
              required
              min="1"
              step="any"
              type="number"
              value={form.price || ""}
              onChange={(event) =>
                setForm({ ...form, price: Number(event.target.value) })
              }
              placeholder="e.g. 650"
            />
          </label>
        </div>

        <div className="form-grid">
          <label>
            Stock ({form.unit || "kg"})
            <input
              required
              min="0"
              step="any"
              type="number"
              value={form.stock}
              onChange={(event) =>
                setForm({ ...form, stock: Number(event.target.value) })
              }
              placeholder="e.g. 2.5"
            />
          </label>

          <label className="checkbox" style={{ alignSelf: "center", marginTop: "18px" }}>
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) =>
                setForm({ ...form, active: event.target.checked })
              }
            />{" "}
            Available for customer ordering
          </label>
        </div>

        {/* Clean, Simple Cut Preferences */}
        <div style={{ display: "grid", gap: "10px", marginTop: "4px" }}>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={hasCutPreference}
              onChange={(e) => handleToggleCutPreference(e.target.checked)}
            />{" "}
            Enable cut preferences (e.g. Curry Cut, Slices)
          </label>

          {hasCutPreference && (
            <div style={{ display: "grid", gap: "10px", paddingLeft: "6px" }}>
              {/* Category Suggestions */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span
                  style={{
                    fontSize: "11.5px",
                    color: "var(--muted)",
                    fontWeight: 600,
                  }}
                >
                  Suggestions:
                </span>
                {suggestedCuts.map((suggestion) => {
                  const isAdded = cuts.some(
                    (c) =>
                      c.name.toLowerCase().trim() ===
                      suggestion.toLowerCase().trim()
                  );
                  return (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => toggleSuggestion(suggestion)}
                      style={{
                        padding: "3px 9px",
                        borderRadius: "14px",
                        fontSize: "11.5px",
                        fontWeight: 600,
                        cursor: "pointer",
                        border: isAdded
                          ? "1px solid var(--primary)"
                          : "1px solid var(--border)",
                        background: isAdded
                          ? "var(--primary)"
                          : "var(--surface)",
                        color: isAdded ? "#FFFFFF" : "var(--text)",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {isAdded ? `✓ ${suggestion}` : `+ ${suggestion}`}
                    </button>
                  );
                })}
              </div>

              {/* Cut Rows */}
              <div style={{ display: "grid", gap: "6px" }}>
                {cuts.map((cut, index) => (
                  <div
                    key={index}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <input
                      type="text"
                      value={cut.name}
                      onChange={(e) =>
                        updateCut(index, { name: e.target.value })
                      }
                      placeholder="Cut name (e.g. Curry Cut)"
                      style={{
                        flex: 1,
                        padding: "7px 10px",
                        fontSize: "13px",
                      }}
                    />

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "3px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "12px",
                          color: "var(--muted)",
                          fontWeight: 600,
                        }}
                      >
                        +₹
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={cut.priceModifier || ""}
                        onChange={(e) =>
                          updateCut(index, {
                            priceModifier: Number(e.target.value) || 0,
                          })
                        }
                        placeholder="0"
                        title="Extra fee"
                        style={{
                          width: "60px",
                          padding: "7px 8px",
                          fontSize: "13px",
                        }}
                      />
                    </div>

                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        fontSize: "12px",
                        color: cut.isDefault
                          ? "var(--primary)"
                          : "var(--muted)",
                        fontWeight: cut.isDefault ? 700 : 500,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        userSelect: "none",
                      }}
                    >
                      <input
                        type="radio"
                        name="default-cut-selection"
                        checked={Boolean(cut.isDefault)}
                        onChange={() => setDefaultCut(index)}
                        style={{ accentColor: "var(--primary)" }}
                      />
                      Default
                    </label>

                    <button
                      type="button"
                      onClick={() => removeCut(index)}
                      title="Remove cut"
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--muted)",
                        cursor: "pointer",
                        padding: "4px",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <X size={15} />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleAddCustomCut}
                  style={{
                    justifySelf: "start",
                    background: "transparent",
                    border: "none",
                    color: "var(--primary)",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                    padding: "4px 0",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <Plus size={13} /> Add another cut
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          className="primary form-submit"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting
            ? "Saving product..."
            : isEditing
            ? "Save changes"
            : "Create product"}
        </button>
      </form>
    </section>
  );
}
