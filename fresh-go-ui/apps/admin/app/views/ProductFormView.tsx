"use client";

import { ArrowLeft, ImagePlus, Sparkles, X } from "lucide-react";
import { FormEvent, useState } from "react";
import { Product, ProductInput } from "../models/product";
import { Category } from "../lib/api";

type ProductFormViewProps = {
  product?: Product;
  categories?: Category[];
  onSave: (input: ProductInput) => Promise<void> | void;
  onCancel: () => void;
};

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
  isDailyCatch: true,
  isFlashFrozen: false,
  tag: "Fresh Catch",
};

export function ProductFormView({
  product,
  categories = [],
  onSave,
  onCancel,
}: ProductFormViewProps) {
  const [form, setForm] = useState<ProductInput>(() =>
    product
      ? {
          ...product,
          tag:
            product.tag ||
            (product.isDailyCatch
              ? "Fresh Catch"
              : product.isFlashFrozen
              ? "Frozen"
              : "Fresh"),
        }
      : emptyForm
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = Boolean(product);

  const categoryOptions =
    categories.length > 0
      ? categories.map((c) => ({ id: c.id, name: c.name }))
      : [
          { id: "fish", name: "Fish" },
          { id: "meat", name: "Meat" },
          { id: "vegetables", name: "Vegetables" },
          { id: "frozen", name: "Frozen" },
        ];

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

    try {
      setIsSubmitting(true);
      const chosenTag = form.tag || "Fresh";
      await onSave({
        ...form,
        name: trimmedName,
        price: Number(form.price),
        stock: Number(form.stock),
        tag: chosenTag,
        isDailyCatch: chosenTag === "Fresh Catch" || Boolean(form.isDailyCatch),
        isFlashFrozen: chosenTag === "Frozen" || Boolean(form.isFlashFrozen),
        description:
          form.description && form.description.trim().length > 0
            ? form.description.trim()
            : `${trimmedName} - freshly sourced and hygienically packed.`,
        origin: form.origin && form.origin.trim().length > 0 ? form.origin.trim() : "Local Hub",
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
            Keep catalogue, descriptions, tags, and decimal stock details current.
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
          <label>
            Category
            <select
              value={form.category}
              onChange={(event) => {
                const nextCat = event.target.value;
                const selectedCat = categoryOptions.find(
                  (c) => c.name === nextCat
                );
                const isFish = nextCat.toLowerCase().includes("fish");
                const isMeat = nextCat.toLowerCase().includes("meat");
                const isFroz = nextCat.toLowerCase().includes("frozen");
                const isVeg = nextCat.toLowerCase().includes("veg");

                let autoTag = form.tag;
                if (isFish) autoTag = "Fresh Catch";
                else if (isMeat) autoTag = "Fresh Cut";
                else if (isFroz) autoTag = "Frozen";
                else if (isVeg) autoTag = "Fresh Produce";

                setForm((prev) => ({
                  ...prev,
                  category: nextCat,
                  categoryId: selectedCat?.id,
                  tag: autoTag,
                  isDailyCatch: autoTag === "Fresh Catch",
                  isFlashFrozen: autoTag === "Frozen",
                }));
              }}
            >
              {categoryOptions.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Unit
            <select
              value={form.unit}
              onChange={(event) =>
                setForm({
                  ...form,
                  unit: event.target.value,
                })
              }
            >
              <option value="kg">kg</option>
              <option value="500g">500g</option>
              <option value="pack">pack</option>
              <option value="bunch">bunch</option>
            </select>
          </label>
        </div>

        {/* Product Tag Dropdown Menu */}
        <div className="form-grid">
          <label>
            Product Tag
            <select
              value={form.tag || "Fresh"}
              onChange={(event) => {
                const nextTag = event.target.value;
                setForm((prev) => ({
                  ...prev,
                  tag: nextTag,
                  isDailyCatch: nextTag === "Fresh Catch",
                  isFlashFrozen: nextTag === "Frozen",
                }));
              }}
              style={{
                fontWeight: 700,
                color: "var(--primary)",
              }}
            >
              <option value="Fresh Catch">🐟 Fresh Catch (Recently caught fish)</option>
              <option value="Fresh">🌱 Fresh (Fish caught earlier / Fresh chicken)</option>
              <option value="Fresh Cut">🥩 Fresh Cut (Fresh-cut meat)</option>
              <option value="Frozen">❄️ Frozen (Frozen meat / chicken / fish)</option>
              <option value="Fresh Produce">🥬 Fresh Produce (Vegetables / Leafy vegetables)</option>
            </select>
          </label>

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
        </div>

        <div className="form-grid">
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
        </div>

        {/* Daily Catch & Flash-Frozen Merchandise Badges */}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "10px",
            padding: "16px 18px",
            display: "grid",
            gap: "14px",
          }}
        >
          <div>
            <span
              style={{
                fontWeight: 700,
                fontSize: "13px",
                color: "var(--text)",
                display: "flex",
                alignItems: "center",
                gap: "7px",
              }}
            >
              <Sparkles size={16} style={{ color: "var(--primary)" }} /> Sourcing &amp; Customer Badging Control
            </span>
            <p
              style={{
                margin: "4px 0 0 0",
                fontSize: "12px",
                color: "var(--muted)",
                lineHeight: "1.4",
              }}
            >
              Control visibility in customer app filters, category rails, and product badges.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "12px",
            }}
          >
            {/* Daily Catch Control */}
            <label
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
                padding: "14px 14px",
                borderRadius: "8px",
                border: form.isDailyCatch
                  ? "2px solid #2E7D5B"
                  : "1px solid var(--border)",
                background: form.isDailyCatch
                  ? "rgba(46, 125, 91, 0.08)"
                  : "var(--bg)",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <input
                type="checkbox"
                checked={Boolean(form.isDailyCatch)}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setForm((prev) => ({
                    ...prev,
                    isDailyCatch: checked,
                    isFlashFrozen: checked ? false : prev.isFlashFrozen,
                  }));
                }}
                style={{ marginTop: "3px", accentColor: "#2E7D5B", width: "16px", height: "16px" }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "16px" }}>🐟</span>
                  <strong
                    style={{
                      fontSize: "13px",
                      color: form.isDailyCatch ? "#1E5840" : "var(--text)",
                    }}
                  >
                    Daily Catch
                  </strong>
                  {form.isDailyCatch && (
                    <span
                      style={{
                        fontSize: "10px",
                        background: "#2E7D5B",
                        color: "#fff",
                        padding: "1px 6px",
                        borderRadius: "10px",
                        fontWeight: 800,
                      }}
                    >
                      ACTIVE
                    </span>
                  )}
                </div>
                <p
                  style={{
                    margin: "4px 0 0 0",
                    fontSize: "11px",
                    color: "var(--muted)",
                    lineHeight: "1.4",
                  }}
                >
                  Displays pulsing green &ldquo;Daily Catch&rdquo; badge. Placed in &ldquo;Fresh today&rdquo; rail and &ldquo;Shop Fresh&rdquo; listings.
                </p>
              </div>
            </label>

            {/* Flash-Frozen Control */}
            <label
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
                padding: "14px 14px",
                borderRadius: "8px",
                border: form.isFlashFrozen
                  ? "2px solid #0284C7"
                  : "1px solid var(--border)",
                background: form.isFlashFrozen
                  ? "rgba(2, 132, 199, 0.08)"
                  : "var(--bg)",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <input
                type="checkbox"
                checked={Boolean(form.isFlashFrozen)}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setForm((prev) => ({
                    ...prev,
                    isFlashFrozen: checked,
                    isDailyCatch: checked ? false : prev.isDailyCatch,
                  }));
                }}
                style={{ marginTop: "3px", accentColor: "#0284C7", width: "16px", height: "16px" }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "16px" }}>❄️</span>
                  <strong
                    style={{
                      fontSize: "13px",
                      color: form.isFlashFrozen ? "#0369A1" : "var(--text)",
                    }}
                  >
                    Flash-Frozen Meat
                  </strong>
                  {form.isFlashFrozen && (
                    <span
                      style={{
                        fontSize: "10px",
                        background: "#0284C7",
                        color: "#fff",
                        padding: "1px 6px",
                        borderRadius: "10px",
                        fontWeight: 800,
                      }}
                    >
                      ACTIVE
                    </span>
                  )}
                </div>
                <p
                  style={{
                    margin: "4px 0 0 0",
                    fontSize: "11px",
                    color: "var(--muted)",
                    lineHeight: "1.4",
                  }}
                >
                  Displays cold blue &ldquo;Flash-Frozen Meats&rdquo; badge. Placed in &ldquo;Frozen meats &amp; specials&rdquo; section and sub-zero filters.
                </p>
              </div>
            </label>
          </div>
        </div>

        <label className="checkbox">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(event) =>
              setForm({ ...form, active: event.target.checked })
            }
          />{" "}
          Available for customer ordering
        </label>

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
