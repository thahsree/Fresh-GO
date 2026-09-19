"use client";

import { ArrowLeft, ImagePlus, X } from "lucide-react";
import { FormEvent, useState } from "react";
import { Product, ProductInput } from "../models/product";

type ProductFormViewProps = {
  product?: Product;
  onSave: (input: ProductInput) => void;
  onCancel: () => void;
};

const emptyForm: ProductInput = {
  name: "",
  category: "Fish",
  unit: "kg",
  price: 0,
  stock: 0,
  active: true,
  image: "",
};

export function ProductFormView({
  product,
  onSave,
  onCancel,
}: ProductFormViewProps) {
  const [form, setForm] = useState<ProductInput>(() =>
    product ? { ...product } : emptyForm,
  );
  const isEditing = Boolean(product);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSave({
      ...form,
      price: Number(form.price),
      stock: Number(form.stock),
    });
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
            Keep catalogue and stock details current.
          </span>
        </div>
      </div>
      <form className="product-form" onSubmit={submit}>
        <div className="product-image-field">
          <span>Product image</span>
          <label className={`image-upload ${form.image ? "has-image" : ""}`}>
            {form.image ? (
              <img src={form.image} alt="Product preview" />
            ) : (
              <ImagePlus size={24} aria-hidden="true" />
            )}
            <span>{form.image ? "Replace image" : "Upload image"}</span>
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
          />
        </label>
        <div className="form-grid">
          <label>
            Category
            <select
              value={form.category}
              onChange={(event) =>
                setForm({
                  ...form,
                  category: event.target.value as Product["category"],
                })
              }
            >
              <option>Fish</option>
              <option>Meat</option>
              <option>Vegetables</option>
            </select>
          </label>
          <label>
            Unit
            <select
              value={form.unit}
              onChange={(event) =>
                setForm({
                  ...form,
                  unit: event.target.value as Product["unit"],
                })
              }
            >
              <option>kg</option>
              <option>bunch</option>
              <option>pack</option>
            </select>
          </label>
        </div>
        <div className="form-grid">
          <label>
            Price
            <input
              required
              min="0"
              type="number"
              value={form.price}
              onChange={(event) =>
                setForm({ ...form, price: Number(event.target.value) })
              }
            />
          </label>
          <label>
            Stock
            <input
              required
              min="0"
              type="number"
              value={form.stock}
              onChange={(event) =>
                setForm({ ...form, stock: Number(event.target.value) })
              }
            />
          </label>
        </div>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(event) =>
              setForm({ ...form, active: event.target.checked })
            }
          />{" "}
          Available for customers
        </label>
        <button className="primary form-submit" type="submit">
          {isEditing ? "Save changes" : "Create product"}
        </button>
      </form>
    </section>
  );
}
