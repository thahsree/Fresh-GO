export type Category = {
  name: string;
  icon: string;
  tint: string;
};

export type Product = {
  id: string;
  name: string;
  detail: string;
  price: number;
  unit: string;
  category: string;
  fresh?: boolean;
};

export const categories: Category[] = [
  { name: "Fish", icon: "🐟", tint: "#E4ECE9" },
  { name: "Meat", icon: "🥩", tint: "#FBE7DF" },
  { name: "Vegetables", icon: "🥬", tint: "#EAF3E6" },
  { name: "Offers", icon: "🔥", tint: "#FBEEDC" },
];

export const freshProducts: Product[] = [
  { id: "seer-fish", name: "Seer Fish", detail: "Marine · 1.2 kg avail.", price: 720, unit: "/kg", category: "Fish", fresh: true },
  { id: "tiger-prawns", name: "Tiger Prawns", detail: "Shellfish · 800 g avail.", price: 640, unit: "/kg", category: "Fish", fresh: true },
  { id: "country-chicken", name: "Country Chicken", detail: "Poultry · 3 kg avail.", price: 340, unit: "/kg", category: "Meat", fresh: true },
];

export const bestSellers: Product[] = [
  { id: "rohu", name: "Rohu Fish", detail: "Freshwater", price: 280, unit: "/kg", category: "Fish" },
  { id: "mutton", name: "Mutton Curry Cut", detail: "Goat", price: 780, unit: "/kg", category: "Meat" },
  { id: "spinach", name: "Spinach Bunch", detail: "Leafy greens", price: 40, unit: "/bunch", category: "Vegetables" },
];

export const needs = [
  "Today's Fish",
  "Family Meat Packs",
  "Daily Vegetables",
  "Weekend Specials",
  "Budget Picks",
  "Premium Selection",
];
