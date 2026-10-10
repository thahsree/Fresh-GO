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

export type ProductUnit = {
  name: string;
  price: number;
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
  unitOptions?: ProductUnit[];
  storageTip?: string;
  rating?: number;
  reviewsCount?: number;
  isBestSeller?: boolean;
  isTodaysOffer?: boolean;
  originalPrice?: number;
  availableStockKg?: number;
  isInStock?: boolean;
  tag?: string;
};

// Clean schema-driven state with standard canonical categories
export const categories: Category[] = [
  { id: "cat-fish", name: "Fish", slug: "fish", icon: "🐟", tint: "#E4ECE9", sortOrder: 1 },
  { id: "cat-meat", name: "Meat", slug: "meat", icon: "🥩", tint: "#FBE7DF", sortOrder: 2 },
  { id: "cat-vegetables", name: "Vegetables", slug: "vegetables", icon: "🥬", tint: "#EAF3E6", sortOrder: 3 },
  { id: "cat-frozen", name: "Frozen", slug: "frozen", icon: "❄️", tint: "#E0F2FE", sortOrder: 4 },
  { id: "cat-offers", name: "Offers", slug: "offers", icon: "🔥", tint: "#FBEEDC", sortOrder: 5 },
];
export const freshProducts: Product[] = [];
export const bestSellers: Product[] = [];
export const frozenProducts: Product[] = [];
export const offerProducts: Product[] = [];
export const allProducts: Product[] = [];
export const needs: string[] = [];
