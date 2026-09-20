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
  category: "Fish" | "Meat" | "Vegetables" | "Offers" | string;
  fresh?: boolean;
  image: string;
  description: string;
  origin?: string;
  netWeight?: string;
  grossWeight?: string;
  cuts?: string[];
  storageTip?: string;
  rating?: number;
  reviewsCount?: number;
  isBestSeller?: boolean;
};

export const categories: Category[] = [
  { name: "Fish", icon: "🐟", tint: "#E4ECE9" },
  { name: "Meat", icon: "🥩", tint: "#FBE7DF" },
  { name: "Vegetables", icon: "🥬", tint: "#EAF3E6" },
  { name: "Offers", icon: "🔥", tint: "#FBEEDC" },
];

export const freshProducts: Product[] = [
  {
    id: "seer-fish",
    name: "Seer Fish (Surmai)",
    detail: "Marine · 1.2 kg avail.",
    price: 720,
    unit: "/kg",
    category: "Fish",
    fresh: true,
    image:
      "https://images.unsplash.com/photo-1534948216015-843149f72be3?w=600&auto=format&fit=crop&q=80",
    description:
      "Premium wild-caught Seer Fish (Surmai/Neymeen), freshly line-caught from coastal waters this morning. Firm, white meat with delicate flavor, perfectly cleaned and sliced to your preference.",
    origin: "Kochi Coastal Waters",
    netWeight: "480g - 520g per 500g pack",
    grossWeight: "700g whole fish equivalent",
    cuts: ["Steak / Slice Cut", "Curry Cut (Medium)", "Whole Cleaned"],
    storageTip: "Store between 0°C to 4°C. Consume within 24 hours of delivery.",
    rating: 4.9,
    reviewsCount: 142,
    isBestSeller: true,
  },
  {
    id: "tiger-prawns",
    name: "Fresh Tiger Prawns",
    detail: "Shellfish · 800 g avail.",
    price: 640,
    unit: "/kg",
    category: "Fish",
    fresh: true,
    image:
      "https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=600&auto=format&fit=crop&q=80",
    description:
      "Succulent, jumbo tiger prawns caught fresh from deep sea waters. Tender, sweet, and crisp texture. Ideal for butter garlic prawns, curries, or tandoori grills.",
    origin: "Mangalore Harbor",
    netWeight: "400g deveined meat",
    grossWeight: "500g with shell",
    cuts: ["Tail-on Deveined", "Fully Peeled & Deveined", "Head-on Whole"],
    storageTip: "Keep chilled on crushed ice or freeze immediately if not cooking today.",
    rating: 4.8,
    reviewsCount: 98,
    isBestSeller: true,
  },
  {
    id: "country-chicken",
    name: "Farm Country Chicken",
    detail: "Poultry · 3 kg avail.",
    price: 340,
    unit: "/kg",
    category: "Meat",
    fresh: true,
    image:
      "https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=600&auto=format&fit=crop&q=80",
    description:
      "Free-range, naturally raised country chicken (Nati Koli). Richer in protein and deep traditional flavor, antibiotic-free and 100% Halal certified.",
    origin: "Organic Agro Farms, Mysore",
    netWeight: "850g - 900g dressed",
    grossWeight: "1.2kg live weight",
    cuts: ["Curry Cut (Small)", "Biryani Cut (Large)", "Boneless Cubes"],
    storageTip: "Refrigerate at 2°C to 4°C. Cook within 48 hours.",
    rating: 4.7,
    reviewsCount: 215,
    isBestSeller: true,
  },
  {
    id: "indian-salmon",
    name: "Indian Salmon (Rawas)",
    detail: "Marine · Wild Caught",
    price: 890,
    unit: "/kg",
    category: "Fish",
    fresh: true,
    image:
      "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&auto=format&fit=crop&q=80",
    description:
      "Rawas (Indian Salmon) is famous for its rich omega-3 fatty acids, pinkish tender meat, and mild sweet buttery flavor. Perfect for pan-searing, grilling, or rich curries.",
    origin: "Goa Offshore Waters",
    netWeight: "500g net steaks",
    grossWeight: "750g whole",
    cuts: ["Fillet Steaks (Boneless)", "Curry Cut (Bone-in)", "Whole Cleaned"],
    storageTip: "Keep chilled at 0-2°C. Excellent for heart-healthy meals.",
    rating: 4.9,
    reviewsCount: 88,
  },
  {
    id: "red-snapper",
    name: "Red Snapper (Sankara)",
    detail: "Marine · Reef Fish",
    price: 580,
    unit: "/kg",
    category: "Fish",
    fresh: true,
    image:
      "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&auto=format&fit=crop&q=80",
    description:
      "Vibrant red coastal reef fish with firm white flakes and a subtle nutty-sweet taste. A prized fish for traditional tawa fry, banana leaf wrap, or spicy meen kulambu.",
    origin: "Rameshwaram Coast",
    netWeight: "500g cleaned slices",
    grossWeight: "700g whole",
    cuts: ["Cleaned Whole with Cuts", "Curry Cut", "Fry Steaks"],
    storageTip: "Best prepared within 24 hours of delivery.",
    rating: 4.8,
    reviewsCount: 64,
  },
  {
    id: "sardines",
    name: "Fresh Sardines (Mathi)",
    detail: "Marine · Omega-3 Rich",
    price: 190,
    unit: "/kg",
    category: "Fish",
    fresh: true,
    image:
      "https://images.unsplash.com/photo-1534948216015-843149f72be3?w=600&auto=format&fit=crop&q=80",
    description:
      "Fresh daily small sea sardines (Mathi/Chaala). Highly prized for their rich oil content, natural calcium, and authentic Kerala fry flavor.",
    origin: "Malabar Coast",
    netWeight: "500g cleaned headless",
    grossWeight: "650g whole",
    cuts: ["Whole Cleaned (Headless)", "Whole Gutted with Head"],
    storageTip: "Cook on the day of delivery with fiery red chili marinade.",
    rating: 4.7,
    reviewsCount: 110,
  },
  {
    id: "calamari-squid",
    name: "Cleaned Squid Rings (Calamari)",
    detail: "Shellfish · Tender Rings",
    price: 490,
    unit: "/kg",
    category: "Fish",
    fresh: true,
    image:
      "https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=600&auto=format&fit=crop&q=80",
    description:
      "Delicate sea squid, skin peeled, ink sac removed, and cut into tender bite-sized rings. Quick-cooking, springy, and delicious in butter garlic or batter fry.",
    origin: "Cochin Fisheries Harbour",
    netWeight: "400g cleaned rings",
    cuts: ["Tender Rings", "Whole Tubes"],
    storageTip: "Do not overcook! Cooks in under 3 minutes.",
    rating: 4.8,
    reviewsCount: 52,
  },
];

export const bestSellers: Product[] = [
  {
    id: "rohu",
    name: "Rohu Fish Cut",
    detail: "Freshwater · Daily Catch",
    price: 280,
    unit: "/kg",
    category: "Fish",
    fresh: true,
    image:
      "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&auto=format&fit=crop&q=80",
    description:
      "Popular freshwater sweet-water fish with soft texture and delicious taste. Scaled, gutted, and cut into neat Bengali style steaks or curry pieces.",
    origin: "Krishna River Catch",
    netWeight: "450g per 500g gross",
    cuts: ["Bengali Cut (Steaks)", "Curry Cut with Head", "Headless Curry Cut"],
    storageTip: "Store in cold chiller, best cooked with mustard gravy or deep fried.",
    rating: 4.6,
    reviewsCount: 180,
    isBestSeller: true,
  },
  {
    id: "mutton",
    name: "Mutton Curry Cut",
    detail: "Tender Goat Meat",
    price: 780,
    unit: "/kg",
    category: "Meat",
    fresh: true,
    image:
      "https://images.unsplash.com/photo-1603048588665-791ca8aea617?w=600&auto=format&fit=crop&q=80",
    description:
      "Tender, pasture-raised young goat meat. Hand-picked pieces with an equal mix of bone-in and boneless cuts for maximum curry aroma and tenderness.",
    origin: "Certified Pasture Farms",
    netWeight: "500g net pack",
    cuts: ["Curry Cut (Mix)", "Boneless Cubes", "Biryani Cut (Special)"],
    storageTip: "Keep chilled. Marinate with raw papaya or yogurt for best tenderness.",
    rating: 4.9,
    reviewsCount: 310,
    isBestSeller: true,
  },
  {
    id: "chicken-breast",
    name: "Chicken Breast Boneless",
    detail: "Lean Protein · Tender",
    price: 380,
    unit: "/kg",
    category: "Meat",
    fresh: true,
    image:
      "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=600&auto=format&fit=crop&q=80",
    description:
      "Tender, juicy, 100% skinless and boneless chicken breast fillets. High in lean protein, low in fat. Ideal for meal-preps, salads, grills, and wraps.",
    origin: "Bio-Secure Poultry Farms",
    netWeight: "500g net pack",
    cuts: ["Whole Fillets", "Thin Slices", "Diced Cubes"],
    storageTip: "Refrigerate at 2-4°C. Perfect for fitness diets.",
    rating: 4.9,
    reviewsCount: 420,
    isBestSeller: true,
  },
  {
    id: "mutton-biryani",
    name: "Mutton Biryani Cut",
    detail: "Prime Cuts with Bone",
    price: 820,
    unit: "/kg",
    category: "Meat",
    fresh: true,
    image:
      "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80",
    description:
      "Specially selected succulent goat meat cuts from the leg and shoulder with rich marrow bones. Crafted specifically for royal dum biryanis.",
    origin: "Grass-Fed Livestock Reserve",
    netWeight: "500g net",
    cuts: ["Large Biryani Cuts", "Medium Curry Cut"],
    storageTip: "Marinate overnight for unforgettable fragrant biryani.",
    rating: 4.9,
    reviewsCount: 195,
    isBestSeller: true,
  },
  {
    id: "spinach",
    name: "Fresh Farm Spinach",
    detail: "Leafy greens · Organic",
    price: 40,
    unit: "/bunch",
    category: "Vegetables",
    fresh: true,
    image:
      "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=600&auto=format&fit=crop&q=80",
    description:
      "Crisp, vibrant green organic spinach (Palak) leaves harvested just hours before delivery. Packed with iron, antioxidants, and vitamins.",
    origin: "Hydroponic Valley Farms",
    netWeight: "250g - 300g per bunch",
    cuts: ["Trimmed Whole Leaves", "Pre-washed & Chopped"],
    storageTip: "Keep wrapped in a dry paper towel in your vegetable crisper.",
    rating: 4.8,
    reviewsCount: 84,
    isBestSeller: true,
  },
  {
    id: "broccoli",
    name: "Fresh Organic Broccoli",
    detail: "Crisp Florets · Nutrient-Rich",
    price: 95,
    unit: "/piece",
    category: "Vegetables",
    fresh: true,
    image:
      "https://images.unsplash.com/photo-1584270359004-7085fbf67883?w=600&auto=format&fit=crop&q=80",
    description:
      "Tender, dark green organic broccoli crowns harvested fresh. Loaded with vitamin C, dietary fiber, and essential minerals. Great for stir-fries, soups, and roasting.",
    origin: "Ooty High Altitude Farms",
    netWeight: "350g - 400g per head",
    cuts: ["Whole Head", "Cut Florets"],
    storageTip: "Keep chilled in ventilated crisper bag.",
    rating: 4.7,
    reviewsCount: 92,
    isBestSeller: true,
  },
  {
    id: "cherry-tomatoes",
    name: "Hydroponic Cherry Tomatoes",
    detail: "Sweet & Juicy · 250g",
    price: 75,
    unit: "/pack",
    category: "Vegetables",
    fresh: true,
    image:
      "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80",
    description:
      "Bright red, vine-ripened bite-sized cherry tomatoes with a burst of sweetness. Grown hydroponically without toxic pesticides.",
    origin: "Controlled Greenhouse Farms",
    netWeight: "250g punnet",
    cuts: ["Whole Fresh Pack"],
    storageTip: "Store at room temperature to preserve maximum sweetness.",
    rating: 4.8,
    reviewsCount: 78,
  },
  {
    id: "button-mushrooms",
    name: "Fresh Button Mushrooms",
    detail: "Farm Fresh · 200g",
    price: 65,
    unit: "/pack",
    category: "Vegetables",
    fresh: true,
    image:
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&auto=format&fit=crop&q=80",
    description:
      "Plump, white, hand-picked button mushrooms with earthy flavor and meaty texture. Ideal for pizza toppings, creamy pastas, or spicy Indian curries.",
    origin: "Mysore Mushroom Cultivation",
    netWeight: "200g sealed box",
    cuts: ["Whole Cleaned", "Pre-Sliced"],
    storageTip: "Keep refrigerated in dry paper wrap.",
    rating: 4.7,
    reviewsCount: 65,
  },
];

export const offerProducts: Product[] = [
  {
    id: "pomfret",
    name: "Silver Pomfret (500g)",
    detail: "Marine · Today's Offer",
    price: 368,
    unit: "/pack",
    category: "Offers",
    fresh: true,
    image:
      "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&auto=format&fit=crop&q=80",
    description:
      "Delicate silver pomfret, prized for its butter-soft white meat and low bone structure. Perfect for tawa fry, rava fry, or mild coconut curry.",
    origin: "Konkan Coastal Catch",
    netWeight: "450g cleaned",
    cuts: ["Whole with Cuts for Marination", "Curry Cut"],
    storageTip: "Cook on day of arrival for unmatched sweet sea flavor.",
    rating: 4.9,
    reviewsCount: 77,
  },
  {
    id: "family-pack",
    name: "Family Weekend Meat Pack",
    detail: "Chicken 1kg + Mutton 500g",
    price: 999,
    unit: "/pack",
    category: "Offers",
    fresh: true,
    image:
      "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80",
    description:
      "The ultimate weekend combo: 1kg fresh farm chicken curry cut + 500g tender goat mutton. Cleaned, prepped, and packed separately in vacuum sealed trays.",
    origin: "Curated FreshGo Partner Farms",
    netWeight: "1.5kg net meat",
    cuts: ["Standard Curry Cut"],
    storageTip: "Store mutton and chicken in their sealed boxes until cooking.",
    rating: 4.9,
    reviewsCount: 165,
  },
  {
    id: "biryani-combo",
    name: "Sunday Feast Biryani Combo",
    detail: "Chicken 1kg + Basmati 1kg",
    price: 499,
    unit: "/combo",
    category: "Offers",
    fresh: true,
    image:
      "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80",
    description:
      "Everything you need for an unforgettable Sunday Biryani: 1kg Biryani Cut Chicken, 1kg Aged Daawat Basmati Rice, and whole biryani spices pouch.",
    origin: "FreshGo Kitchen Essentials",
    netWeight: "2kg combo kit",
    cuts: ["Biryani Cut Chicken + Rice Kit"],
    storageTip: "Keep chicken chilled, store rice and spices in cool dry place.",
    rating: 4.9,
    reviewsCount: 130,
  },
];

export const allProducts: Product[] = [
  ...freshProducts,
  ...bestSellers,
  ...offerProducts,
];

export const needs = [
  "Today's Fish",
  "Family Meat Packs",
  "Daily Vegetables",
  "Weekend Specials",
  "Budget Picks",
  "Premium Selection",
];
