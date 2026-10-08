"use client";

import { ArrowLeft, ImagePlus, X } from "lucide-react";
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
          <label>
            Category
            <select
              value={form.category}
              onChange={(event) => {
                const nextCat = event.target.value;
                const selectedCat = categoryOptions.find(
                  (c) => c.name === nextCat
                );
                setForm((prev) => ({
                  ...prev,
                  category: nextCat,
                  categoryId: selectedCat?.id,
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
              <option value="300g">300g</option>
              <option value="200g">200g</option>
              <option value="pack">pack</option>
              <option value="bunch">bunch</option>
            </select>
          </label>
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
