export type ProductTag =
  | "Fresh Catch"
  | "Fresh"
  | "Fresh Cut"
  | "Frozen"
  | "Fresh Produce"
  | string;

export type Product = {
  id: string;
  name: string;
  category: "Fish" | "Meat" | "Vegetables" | "Frozen" | string;
  categoryId?: string;
  unit: "kg" | "bunch" | "pack" | string;
  price: number;
  stock: number;
  active: boolean;
  image?: string;
  description?: string;
  origin?: string;
  isDailyCatch?: boolean;
  isFlashFrozen?: boolean;
  tag?: ProductTag;
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
