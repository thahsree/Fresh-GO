export type Category = {
  id?: string;
  name: string;
  slug?: string;
  icon: string;
  tint: string;
  sortOrder?: number;
};

export type ProductCut = {
  id: string;
  name: string;
  priceModifier?: number;
  isDefault?: boolean;
};

export type Product = {
  id: string;
  slug?: string;
  name: string;
  detail: string;
  price: number;
  unit: string;
  category: "Fish" | "Meat" | "Vegetables" | "Frozen" | "Offers" | string;
  categoryId?: string;
  fresh?: boolean;
  isDailyCatch?: boolean;
  isFlashFrozen?: boolean;
  image: string;
  description: string;
  origin?: string;
  netWeight?: string;
  grossWeight?: string;
  cuts?: string[];
  cutOptions?: ProductCut[];
  storageTip?: string;
  rating?: number;
  reviewsCount?: number;
  isBestSeller?: boolean;
  availableStockKg?: number;
  isInStock?: boolean;
  tag?: string;
};

// Clean schema-driven state: no hardcoded mock products.
// All live products and categories are loaded directly from the FreshGo backend database.
export const categories: Category[] = [];
export const freshProducts: Product[] = [];
export const bestSellers: Product[] = [];
export const frozenProducts: Product[] = [];
export const offerProducts: Product[] = [];
export const allProducts: Product[] = [];
export const needs: string[] = [];
