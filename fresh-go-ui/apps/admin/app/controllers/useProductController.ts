"use client";

import { useEffect, useState, useCallback } from "react";
import { Product, ProductInput } from "../models/product";
import { api, BackendProduct, Category } from "../lib/api";

const storageKey = "fresh-food-admin-products";

export function useProductController() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);

  const fetchBackendData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Ensure authenticated
      await api.ensureAdminAuth();

      // 2. Fetch categories & products in parallel
      const [backendCats, backendProds] = await Promise.all([
        api.catalog.getCategories().catch(() => []),
        api.catalog.getProducts().catch(() => []),
      ]);

      if (backendCats && backendCats.length > 0) {
        setCategories(backendCats);
      }

      if (backendProds && backendProds.length > 0) {
        const mapped: Product[] = backendProds.map((bp: BackendProduct) => ({
          id: bp.id,
          name: bp.name,
          category: bp.category?.name || "Fish",
          categoryId: bp.categoryId,
          unit: bp.unit || "kg",
          price: Number(bp.basePrice),
          stock: bp.availableStockKg !== undefined ? bp.availableStockKg : 10,
          active: bp.isActive,
          image: bp.imageUrl || (bp as any).image || "",
          description: bp.description || "",
          origin: bp.origin || "",
          isDailyCatch: Boolean(bp.isDailyCatch),
          isFlashFrozen: Boolean(bp.isFlashFrozen),
          tag: bp.tag || (bp.isDailyCatch ? "Fresh Catch" : bp.isFlashFrozen ? "Frozen" : "Fresh"),
        }));
        setProducts(mapped);
        setIsBackendConnected(true);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(storageKey, JSON.stringify(mapped));
        }
      } else {
        // If no products returned yet (e.g. fresh DB), keep local products
        setIsBackendConnected(true);
      }
    } catch (err) {
      console.warn("Could not fetch products from backend, using cached/initial:", err);
      setIsBackendConnected(false);
      const stored = typeof window !== "undefined" ? window.localStorage.getItem(storageKey) : null;
      if (stored) {
        try {
          setProducts(JSON.parse(stored) as Product[]);
        } catch {}
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBackendData();
  }, [fetchBackendData]);

  const addProduct = async (input: ProductInput) => {
    // 1. Determine categoryId
    let catId = input.categoryId;
    if (!catId && categories.length > 0) {
      const match = categories.find(
        (c) => c.name.toLowerCase() === input.category.toLowerCase()
      );
      catId = match ? match.id : categories[0].id;
    }

    if (!catId) {
      throw new Error("Please select a category");
    }

    // Default image based on category if empty
    let image = input.image && input.image.trim().length > 0 ? input.image : "";
    if (!image) {
      const catLower = input.category.toLowerCase();
      if (catLower.includes("fish")) {
        image =
          "https://images.unsplash.com/photo-1534948216015-843149f72be3?w=600&auto=format&fit=crop&q=80";
      } else if (catLower.includes("frozen")) {
        image =
          "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=600&auto=format&fit=crop&q=80";
      } else if (catLower.includes("meat")) {
        image =
          "https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=600&auto=format&fit=crop&q=80";
      } else {
        image =
          "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80";
      }
    }

    // Default description if empty
    const description =
      input.description && input.description.trim().length > 0
        ? input.description
        : `${input.name} - freshly sourced and hygienically packed.`;

    await api.ensureAdminAuth();
    await api.catalog.createProduct({
      name: input.name,
      categoryId: catId,
      basePrice: Number(input.price),
      unit: input.unit || "kg",
      stock: Number(input.stock || 10),
      initialStockKg: Number(input.stock || 10),
      description,
      image,
      origin: input.origin || "Local Sourcing",
      isDailyCatch: Boolean(input.isDailyCatch),
      isFlashFrozen: Boolean(input.isFlashFrozen),
      tag: input.tag || (input.isDailyCatch ? "Fresh Catch" : input.isFlashFrozen ? "Frozen" : "Fresh"),
    });

    await fetchBackendData();
  };

  const updateProduct = async (id: string, input: ProductInput) => {
    if (isBackendConnected) {
      try {
        await api.ensureAdminAuth();
        let catId = input.categoryId;
        if (!catId && categories.length > 0) {
          const match = categories.find(
            (c) => c.name.toLowerCase() === input.category.toLowerCase()
          );
          catId = match ? match.id : undefined;
        }

        await api.catalog.updateProduct(id, {
          name: input.name,
          categoryId: catId,
          basePrice: Number(input.price),
          unit: input.unit || "kg",
          stock: Number(input.stock),
          initialStockKg: Number(input.stock),
          description: input.description,
          image: input.image,
          origin: input.origin,
          isActive: input.active,
          isDailyCatch: input.isDailyCatch,
          isFlashFrozen: input.isFlashFrozen,
          tag: input.tag,
        });
        await fetchBackendData();
        return;
      } catch (err) {
        console.warn("Update product backend warning, saving locally:", err);
      }
    }

    const updated = products.map((product) =>
      product.id === id ? { ...input, id } : product
    );
    setProducts(updated);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey, JSON.stringify(updated));
    }
  };

  const deleteProduct = async (id: string) => {
    if (isBackendConnected) {
      try {
        await api.ensureAdminAuth();
        await api.catalog.deleteProduct(id);
        await fetchBackendData();
        return;
      } catch (err) {
        console.warn("Delete product backend warning, removing locally:", err);
      }
    }

    const updated = products.filter((product) => product.id !== id);
    setProducts(updated);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey, JSON.stringify(updated));
    }
  };

  return {
    products,
    categories,
    isLoading,
    isBackendConnected,
    refreshProducts: fetchBackendData,
    addProduct,
    updateProduct,
    deleteProduct,
  };
}
