"use client";

import { useEffect, useState } from "react";
import { createProduct, initialProducts, Product, ProductInput } from "../models/product";

const storageKey = "fresh-food-admin-products";

export function useProductController() {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);
    if (stored) setProducts(JSON.parse(stored) as Product[]);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(storageKey, JSON.stringify(products));
  }, [hydrated, products]);

  return {
    products,
    addProduct: (input: ProductInput) => setProducts([...products, createProduct(input)]),
    updateProduct: (id: string, input: ProductInput) => setProducts(products.map((product) => (product.id === id ? { ...input, id } : product))),
    deleteProduct: (id: string) => setProducts(products.filter((product) => product.id !== id)),
  };
}
