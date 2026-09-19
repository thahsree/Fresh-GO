"use client";

import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { getStockState, Product } from "../models/product";

type ProductsViewProps = {
  products: Product[];
  deleteProduct: (id: string) => void;
  onCreate: () => void;
  onEdit: (product: Product) => void;
};

export function ProductsView({
  products,
  deleteProduct,
  onCreate,
  onEdit,
}: ProductsViewProps) {
  const [query, setQuery] = useState("");
  const visibleProducts = products.filter((product) =>
    `${product.name} ${product.category}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );

  return (
    <div className="products-layout">
      <section className="panel">
        <div className="toolbar">
          <div>
            <h2>Products</h2>
            <span className="muted">
              {products.length} products in your catalogue
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
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {visibleProducts.map((product) => {
                const stockState = getStockState(product.stock);
                return (
                  <tr key={product.id}>
                    <td>
                      <strong>{product.name}</strong>
                      <small>per {product.unit}</small>
                    </td>
                    <td>{product.category}</td>
                    <td>Rs {product.price.toLocaleString()}</td>
                    <td>
                      {product.stock} {product.unit}
                    </td>
                    <td>
                      <span
                        className={`badge ${stockState === "Healthy" ? "success" : stockState === "Low stock" ? "warning" : "error"}`}
                      >
                        {stockState}
                      </span>
                    </td>
                    <td className="table-actions">
                      <button
                        className="icon-button"
                        onClick={() => onEdit(product)}
                        aria-label={`Edit ${product.name}`}
                        title="Edit product"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        className="icon-button danger"
                        onClick={() => deleteProduct(product.id)}
                        aria-label={`Delete ${product.name}`}
                        title="Delete product"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
