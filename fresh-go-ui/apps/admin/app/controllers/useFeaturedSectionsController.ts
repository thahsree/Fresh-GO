"use client";

import { useCallback, useEffect, useState } from "react";
import { api, FeaturedSectionItem } from "../lib/api";

export function useFeaturedSectionsController() {
  const [sections, setSections] = useState<FeaturedSectionItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSections = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.featuredSections.getAll(true);
      setSections(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error("Error fetching featured sections:", err);
      setError(err?.message || "Failed to load featured sections");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSections();
  }, [fetchSections]);

  const createSection = async (data: {
    title: string;
    subtitle?: string;
    icon?: string;
    sortOrder?: number;
    isActive?: boolean;
    productIds?: string[];
  }) => {
    await api.featuredSections.create(data);
    await fetchSections();
  };

  const updateSection = async (
    id: string,
    data: {
      title?: string;
      subtitle?: string;
      icon?: string;
      sortOrder?: number;
      isActive?: boolean;
      productIds?: string[];
    }
  ) => {
    await api.featuredSections.update(id, data);
    await fetchSections();
  };

  const deleteSection = async (id: string) => {
    await api.featuredSections.delete(id);
    await fetchSections();
  };

  const toggleProductInSection = async (sectionId: string, productId: string) => {
    const sec = sections.find((s) => s.id === sectionId);
    if (!sec) return;
    const currentIds = sec.productIds || [];
    const exists = currentIds.includes(productId);
    const newIds = exists
      ? currentIds.filter((id) => id !== productId)
      : [...currentIds, productId];

    // Optimistic update
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, productIds: newIds } : s))
    );

    try {
      await api.featuredSections.update(sectionId, { productIds: newIds });
      await fetchSections();
    } catch (err) {
      console.error("Failed to toggle product in section:", err);
      await fetchSections();
    }
  };

  return {
    sections,
    isLoading,
    error,
    fetchSections,
    createSection,
    updateSection,
    deleteSection,
    toggleProductInSection,
  };
}
