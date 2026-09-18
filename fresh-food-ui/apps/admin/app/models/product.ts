export type Product = {
  id: string;
  name: string;
  category: "Fish" | "Meat" | "Vegetables";
  unit: "kg" | "bunch" | "pack";
  price: number;
  stock: number;
  active: boolean;
  image?: string;
};

export type ProductInput = Omit<Product, "id">;

export const initialProducts: Product[] = [
  { id: "prd-seer-fish", name: "Seer Fish", category: "Fish", unit: "kg", price: 890, stock: 8, active: true, image: "" },
  { id: "prd-tiger-prawns", name: "Tiger Prawns", category: "Fish", unit: "kg", price: 760, stock: 22, active: true, image: "" },
  { id: "prd-country-chicken", name: "Country Chicken", category: "Meat", unit: "kg", price: 540, stock: 3, active: true, image: "" },
  { id: "prd-baby-spinach", name: "Baby Spinach", category: "Vegetables", unit: "bunch", price: 80, stock: 0, active: false, image: "" },
];

export function createProduct(input: ProductInput): Product {
  return { ...input, id: `prd-${Date.now()}` };
}

export function getStockState(stock: number): "Healthy" | "Low stock" | "Out of stock" {
  if (stock === 0) return "Out of stock";
  return stock < 5 ? "Low stock" : "Healthy";
}
