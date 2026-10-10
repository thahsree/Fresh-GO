export type ProductTag =
  | "Fresh Catch"
  | "Fresh"
  | "Fresh Cut"
  | "Frozen"
  | "Fresh Produce"
  | string;

export type CutOption = {
  id?: string;
  name: string;
  priceModifier?: number;
  isDefault?: boolean;
};

export type UnitOption = {
  name: string;
  price: number;
  isDefault?: boolean;
};

export type Product = {
  id: string;
  name: string;
  category: "Fish" | "Meat" | "Vegetables" | "Frozen" | string;
  categoryId?: string;
  unit: "kg" | "500g" | "300g" | "200g" | "bunch" | "pack" | string;
  price: number;
  stock: number;
  active: boolean;
  image?: string;
  description?: string;
  origin?: string;
  isBestSeller?: boolean;
  isTodaysOffer?: boolean;
  originalPrice?: number;
  isDailyCatch?: boolean;
  isFlashFrozen?: boolean;
  tag?: ProductTag;
  cuts?: CutOption[];
  unitOptions?: UnitOption[];
};

export type ProductInput = Omit<Product, "id">;

export const initialProducts: Product[] = [];

export function createProduct(input: ProductInput): Product {
  return { ...input, id: `prd-${Date.now()}` };
}

export function getStockState(stock: number): "Healthy" | "Low stock" | "Out of stock" {
  if (stock === 0) return "Out of stock";
  return stock < 5 ? "Low stock" : "Healthy";
}
