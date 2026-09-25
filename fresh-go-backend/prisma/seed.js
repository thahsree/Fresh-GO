"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log("🌱 Starting FreshGo complete database seed...");
    // 1. Hub
    const hub = await prisma.hub.upsert({
        where: { code: "HUB-CLT-01" },
        update: {},
        create: {
            name: "FreshGo Central Hub (Mavoor Road)",
            code: "HUB-CLT-01",
            address: "Mavoor Road, Kozhikode, Kerala 673004",
            latitude: 11.2588,
            longitude: 75.7804,
            isActive: true,
        },
    });
    console.log("✅ Hub ready:", hub.name);
    // 2. Delivery Zone
    const zone = await prisma.deliveryZone.upsert({
        where: { name: "Zone 1 · Kozhikode Central" },
        update: {},
        create: {
            name: "Zone 1 · Kozhikode Central",
            centerLat: 11.2588,
            centerLng: 75.7804,
            radiusKm: 12.0,
            baseDeliveryFee: 35.0,
            minOrderAmount: 199.0,
            freeDeliveryThreshold: 799.0,
            estimatedDeliveryMinutes: 25,
            isActive: true,
        },
    });
    console.log("✅ Zone ready:", zone.name);
    // 3. Admin User
    const admin = await prisma.user.upsert({
        where: { phone: "+919999999999" },
        update: {},
        create: {
            phone: "+919999999999",
            email: "admin@freshgo.in",
            name: "FreshGo Dispatch Admin",
            role: client_1.Role.ADMIN,
        },
    });
    console.log("✅ Admin user ready:", admin.name);
    // 4. Delivery Partner User
    const partnerUser = await prisma.user.upsert({
        where: { phone: "+919123456789" },
        update: {},
        create: {
            phone: "+919123456789",
            email: "ramesh@freshgo.in",
            name: "Ramesh K.",
            role: client_1.Role.DELIVERY_PARTNER,
            partnerProfile: {
                create: {
                    vehicleType: client_1.VehicleType.BIKE,
                    licenseNumber: "KL-11-2022-0098421",
                    kycStatus: client_1.KycStatus.VERIFIED,
                    isOnline: true,
                    currentLat: 11.2592,
                    currentLng: 75.7812,
                    lastLocationUpdate: new Date(),
                    codCashInHand: 450.0,
                    preferredZoneId: zone.id,
                    rating: 4.9,
                    completedDeliveries: 42,
                },
            },
        },
    });
    console.log("✅ Delivery partner ready:", partnerUser.name);
    // 5. Customer User
    const customer = await prisma.user.upsert({
        where: { phone: "+919876543210" },
        update: {},
        create: {
            phone: "+919876543210",
            email: "thashreef@freshgo.in",
            name: "Thashreef R.",
            role: client_1.Role.CUSTOMER,
            wallet: {
                create: {
                    balance: 250.0,
                },
            },
            addresses: {
                create: {
                    title: "Home",
                    street: "Palm Residency, Flat 4B, 4th Cross Road",
                    landmark: "Opposite Cyberpark Gate",
                    area: "Kozhikode Central",
                    city: "Kozhikode",
                    pincode: "673004",
                    latitude: 11.2588,
                    longitude: 75.7804,
                    isDefault: true,
                },
            },
        },
    });
    console.log("✅ Customer ready:", customer.name);
    // 6. Categories
    const catFish = await prisma.category.upsert({
        where: { slug: "fish" },
        update: { name: "Fish", icon: "🐟", tint: "#E4ECE9", sortOrder: 1 },
        create: { name: "Fish", slug: "fish", icon: "🐟", tint: "#E4ECE9", sortOrder: 1 },
    });
    const catMeat = await prisma.category.upsert({
        where: { slug: "meat" },
        update: { name: "Meat", icon: "🥩", tint: "#FBE7DF", sortOrder: 2 },
        create: { name: "Meat", slug: "meat", icon: "🥩", tint: "#FBE7DF", sortOrder: 2 },
    });
    const catVeg = await prisma.category.upsert({
        where: { slug: "vegetables" },
        update: { name: "Vegetables", icon: "🥬", tint: "#EAF3E6", sortOrder: 3 },
        create: { name: "Vegetables", slug: "vegetables", icon: "🥬", tint: "#EAF3E6", sortOrder: 3 },
    });
    const catFrozen = await prisma.category.upsert({
        where: { slug: "frozen" },
        update: { name: "Frozen", icon: "❄️", tint: "#E0F2FE", sortOrder: 4 },
        create: { name: "Frozen", slug: "frozen", icon: "❄️", tint: "#E0F2FE", sortOrder: 4 },
    });
    const catOffers = await prisma.category.upsert({
        where: { slug: "offers" },
        update: { name: "Offers", icon: "🔥", tint: "#FBEEDC", sortOrder: 5 },
        create: { name: "Offers", slug: "offers", icon: "🔥", tint: "#FBEEDC", sortOrder: 5 },
    });
    console.log("✅ Categories seeded: Fish, Meat, Vegetables, Frozen, Offers");
    // 7. Full Product Catalog
    const productsToSeed = [
        // --- FISH ---
        {
            slug: "seer-fish",
            name: "Seer Fish (Surmai)",
            categoryId: catFish.id,
            basePrice: 720.0,
            unit: "kg",
            description: "Premium wild-caught Seer Fish (Surmai/Neymeen), freshly line-caught from coastal waters this morning. Firm, white meat with delicate flavor, perfectly cleaned and sliced to your preference.",
            origin: "Kochi Coastal Waters",
            storageTip: "Store between 0°C to 4°C. Consume within 24 hours of delivery.",
            grossWeightDescription: "700g whole fish equivalent",
            netWeightDescription: "480g - 520g per 500g pack",
            image: "https://images.unsplash.com/photo-1534948216015-843149f72be3?w=600&auto=format&fit=crop&q=80",
            rating: 4.9,
            reviewsCount: 142,
            isBestSeller: true,
            initialStockKg: 25.0,
            cuts: [
                { name: "Steak / Slice Cut", priceModifier: 0.0, isDefault: true },
                { name: "Curry Cut (Medium)", priceModifier: 0.0, isDefault: false },
                { name: "Whole Cleaned", priceModifier: -20.0, isDefault: false },
            ],
        },
        {
            slug: "tiger-prawns",
            name: "Fresh Tiger Prawns",
            categoryId: catFish.id,
            basePrice: 640.0,
            unit: "kg",
            description: "Succulent, jumbo tiger prawns caught fresh from deep sea waters. Tender, sweet, and crisp texture. Ideal for butter garlic prawns, curries, or tandoori grills.",
            origin: "Mangalore Harbor",
            storageTip: "Keep chilled on crushed ice or freeze immediately if not cooking today.",
            grossWeightDescription: "500g with shell",
            netWeightDescription: "400g deveined meat",
            image: "https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=600&auto=format&fit=crop&q=80",
            rating: 4.8,
            reviewsCount: 98,
            isBestSeller: true,
            initialStockKg: 20.0,
            cuts: [
                { name: "Tail-on Deveined", priceModifier: 0.0, isDefault: true },
                { name: "Fully Peeled & Deveined", priceModifier: 30.0, isDefault: false },
                { name: "Head-on Whole", priceModifier: -15.0, isDefault: false },
            ],
        },
        {
            slug: "indian-salmon",
            name: "Indian Salmon (Rawas)",
            categoryId: catFish.id,
            basePrice: 890.0,
            unit: "kg",
            description: "Rawas (Indian Salmon) is famous for its rich omega-3 fatty acids, pinkish tender meat, and mild sweet buttery flavor. Perfect for pan-searing, grilling, or rich curries.",
            origin: "Goa Offshore Waters",
            storageTip: "Keep chilled at 0-2°C. Excellent for heart-healthy meals.",
            grossWeightDescription: "750g whole",
            netWeightDescription: "500g net steaks",
            image: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&auto=format&fit=crop&q=80",
            rating: 4.9,
            reviewsCount: 88,
            isBestSeller: false,
            initialStockKg: 18.0,
            cuts: [
                { name: "Fillet Steaks (Boneless)", priceModifier: 40.0, isDefault: true },
                { name: "Curry Cut (Bone-in)", priceModifier: 0.0, isDefault: false },
                { name: "Whole Cleaned", priceModifier: -30.0, isDefault: false },
            ],
        },
        {
            slug: "red-snapper",
            name: "Red Snapper (Sankara)",
            categoryId: catFish.id,
            basePrice: 580.0,
            unit: "kg",
            description: "Vibrant red coastal reef fish with firm white flakes and a subtle nutty-sweet taste. A prized fish for traditional tawa fry, banana leaf wrap, or spicy meen kulambu.",
            origin: "Rameshwaram Coast",
            storageTip: "Best prepared within 24 hours of delivery.",
            grossWeightDescription: "700g whole",
            netWeightDescription: "500g cleaned slices",
            image: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&auto=format&fit=crop&q=80",
            rating: 4.8,
            reviewsCount: 64,
            isBestSeller: false,
            initialStockKg: 20.0,
            cuts: [
                { name: "Cleaned Whole with Cuts", priceModifier: 0.0, isDefault: true },
                { name: "Curry Cut", priceModifier: 0.0, isDefault: false },
                { name: "Fry Steaks", priceModifier: 15.0, isDefault: false },
            ],
        },
        {
            slug: "sardines",
            name: "Fresh Sardines (Mathi)",
            categoryId: catFish.id,
            basePrice: 190.0,
            unit: "kg",
            description: "Fresh daily small sea sardines (Mathi/Chaala). Highly prized for their rich oil content, natural calcium, and authentic Kerala fry flavor.",
            origin: "Malabar Coast",
            storageTip: "Cook on the day of delivery with fiery red chili marinade.",
            grossWeightDescription: "650g whole",
            netWeightDescription: "500g cleaned headless",
            image: "https://images.unsplash.com/photo-1534948216015-843149f72be3?w=600&auto=format&fit=crop&q=80",
            rating: 4.7,
            reviewsCount: 110,
            isBestSeller: false,
            initialStockKg: 30.0,
            cuts: [
                { name: "Whole Cleaned (Headless)", priceModifier: 0.0, isDefault: true },
                { name: "Whole Gutted with Head", priceModifier: 0.0, isDefault: false },
            ],
        },
        {
            slug: "calamari-squid",
            name: "Cleaned Squid Rings (Calamari)",
            categoryId: catFish.id,
            basePrice: 490.0,
            unit: "kg",
            description: "Delicate sea squid, skin peeled, ink sac removed, and cut into tender bite-sized rings. Quick-cooking, springy, and delicious in butter garlic or batter fry.",
            origin: "Cochin Fisheries Harbour",
            storageTip: "Do not overcook! Cooks in under 3 minutes.",
            grossWeightDescription: "600g whole",
            netWeightDescription: "400g cleaned rings",
            image: "https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=600&auto=format&fit=crop&q=80",
            rating: 4.8,
            reviewsCount: 52,
            isBestSeller: false,
            initialStockKg: 20.0,
            cuts: [
                { name: "Tender Rings", priceModifier: 0.0, isDefault: true },
                { name: "Whole Tubes", priceModifier: 0.0, isDefault: false },
            ],
        },
        {
            slug: "rohu",
            name: "Rohu Fish Cut",
            categoryId: catFish.id,
            basePrice: 280.0,
            unit: "kg",
            description: "Popular freshwater sweet-water fish with soft texture and delicious taste. Scaled, gutted, and cut into neat Bengali style steaks or curry pieces.",
            origin: "Krishna River Catch",
            storageTip: "Store in cold chiller, best cooked with mustard gravy or deep fried.",
            grossWeightDescription: "600g whole",
            netWeightDescription: "450g per 500g gross",
            image: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&auto=format&fit=crop&q=80",
            rating: 4.6,
            reviewsCount: 180,
            isBestSeller: true,
            initialStockKg: 25.0,
            cuts: [
                { name: "Bengali Cut (Steaks)", priceModifier: 0.0, isDefault: true },
                { name: "Curry Cut with Head", priceModifier: 0.0, isDefault: false },
                { name: "Headless Curry Cut", priceModifier: 15.0, isDefault: false },
            ],
        },
        // --- MEAT ---
        {
            slug: "country-chicken",
            name: "Farm Country Chicken",
            categoryId: catMeat.id,
            basePrice: 340.0,
            unit: "kg",
            description: "Free-range, naturally raised country chicken (Nati Koli). Richer in protein and deep traditional flavor, antibiotic-free and 100% Halal certified.",
            origin: "Organic Agro Farms, Mysore",
            storageTip: "Refrigerate at 2°C to 4°C. Cook within 48 hours.",
            grossWeightDescription: "1.2kg live weight",
            netWeightDescription: "850g - 900g dressed",
            image: "https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=600&auto=format&fit=crop&q=80",
            rating: 4.7,
            reviewsCount: 215,
            isBestSeller: true,
            initialStockKg: 30.0,
            cuts: [
                { name: "Curry Cut (Small)", priceModifier: 0.0, isDefault: true },
                { name: "Biryani Cut (Large)", priceModifier: 0.0, isDefault: false },
                { name: "Boneless Cubes", priceModifier: 40.0, isDefault: false },
            ],
        },
        {
            slug: "mutton",
            name: "Mutton Curry Cut",
            categoryId: catMeat.id,
            basePrice: 780.0,
            unit: "kg",
            description: "Tender, pasture-raised young goat meat. Hand-picked pieces with an equal mix of bone-in and boneless cuts for maximum curry aroma and tenderness.",
            origin: "Certified Pasture Farms",
            storageTip: "Keep chilled. Marinate with raw papaya or yogurt for best tenderness.",
            grossWeightDescription: "600g with bone",
            netWeightDescription: "500g net pack",
            image: "https://images.unsplash.com/photo-1603048588665-791ca8aea617?w=600&auto=format&fit=crop&q=80",
            rating: 4.9,
            reviewsCount: 310,
            isBestSeller: true,
            initialStockKg: 35.0,
            cuts: [
                { name: "Curry Cut (Mix)", priceModifier: 0.0, isDefault: true },
                { name: "Boneless Cubes", priceModifier: 60.0, isDefault: false },
                { name: "Biryani Cut (Special)", priceModifier: 20.0, isDefault: false },
            ],
        },
        {
            slug: "chicken-breast",
            name: "Chicken Breast Boneless",
            categoryId: catMeat.id,
            basePrice: 380.0,
            unit: "kg",
            description: "Tender, juicy, 100% skinless and boneless chicken breast fillets. High in lean protein, low in fat. Ideal for meal-preps, salads, grills, and wraps.",
            origin: "Bio-Secure Poultry Farms",
            storageTip: "Refrigerate at 2-4°C. Perfect for fitness diets.",
            grossWeightDescription: "550g net pack",
            netWeightDescription: "500g net pack",
            image: "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=600&auto=format&fit=crop&q=80",
            rating: 4.9,
            reviewsCount: 420,
            isBestSeller: true,
            initialStockKg: 40.0,
            cuts: [
                { name: "Whole Fillets", priceModifier: 0.0, isDefault: true },
                { name: "Thin Slices", priceModifier: 10.0, isDefault: false },
                { name: "Diced Cubes", priceModifier: 15.0, isDefault: false },
            ],
        },
        {
            slug: "mutton-biryani",
            name: "Mutton Biryani Cut",
            categoryId: catMeat.id,
            basePrice: 820.0,
            unit: "kg",
            description: "Specially selected succulent goat meat cuts from the leg and shoulder with rich marrow bones. Crafted specifically for royal dum biryanis.",
            origin: "Grass-Fed Livestock Reserve",
            storageTip: "Marinate overnight for unforgettable fragrant biryani.",
            grossWeightDescription: "600g with marrow bone",
            netWeightDescription: "500g net",
            image: "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80",
            rating: 4.9,
            reviewsCount: 195,
            isBestSeller: true,
            initialStockKg: 25.0,
            cuts: [
                { name: "Large Biryani Cuts", priceModifier: 0.0, isDefault: true },
                { name: "Medium Curry Cut", priceModifier: 0.0, isDefault: false },
            ],
        },
        // --- VEGETABLES ---
        {
            slug: "spinach",
            name: "Fresh Farm Spinach",
            categoryId: catVeg.id,
            basePrice: 40.0,
            unit: "bunch",
            description: "Crisp, vibrant green organic spinach (Palak) leaves harvested just hours before delivery. Packed with iron, antioxidants, and vitamins.",
            origin: "Hydroponic Valley Farms",
            storageTip: "Keep wrapped in a dry paper towel in your vegetable crisper.",
            grossWeightDescription: "350g whole bunch",
            netWeightDescription: "250g - 300g per bunch",
            image: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=600&auto=format&fit=crop&q=80",
            rating: 4.8,
            reviewsCount: 84,
            isBestSeller: true,
            initialStockKg: 50.0,
            cuts: [
                { name: "Trimmed Whole Leaves", priceModifier: 0.0, isDefault: true },
                { name: "Pre-washed & Chopped", priceModifier: 10.0, isDefault: false },
            ],
        },
        {
            slug: "broccoli",
            name: "Fresh Organic Broccoli",
            categoryId: catVeg.id,
            basePrice: 95.0,
            unit: "piece",
            description: "Tender, dark green organic broccoli crowns harvested fresh. Loaded with vitamin C, dietary fiber, and essential minerals. Great for stir-fries, soups, and roasting.",
            origin: "Ooty High Altitude Farms",
            storageTip: "Keep chilled in ventilated crisper bag.",
            grossWeightDescription: "450g whole head",
            netWeightDescription: "350g - 400g per head",
            image: "https://images.unsplash.com/photo-1584270359004-7085fbf67883?w=600&auto=format&fit=crop&q=80",
            rating: 4.7,
            reviewsCount: 92,
            isBestSeller: true,
            initialStockKg: 35.0,
            cuts: [
                { name: "Whole Head", priceModifier: 0.0, isDefault: true },
                { name: "Cut Florets", priceModifier: 15.0, isDefault: false },
            ],
        },
        {
            slug: "cherry-tomatoes",
            name: "Hydroponic Cherry Tomatoes",
            categoryId: catVeg.id,
            basePrice: 75.0,
            unit: "pack",
            description: "Bright red, vine-ripened bite-sized cherry tomatoes with a burst of sweetness. Grown hydroponically without toxic pesticides.",
            origin: "Controlled Greenhouse Farms",
            storageTip: "Store at room temperature to preserve maximum sweetness.",
            grossWeightDescription: "280g with punnet",
            netWeightDescription: "250g punnet",
            image: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80",
            rating: 4.8,
            reviewsCount: 78,
            isBestSeller: false,
            initialStockKg: 25.0,
            cuts: [
                { name: "Whole Fresh Pack", priceModifier: 0.0, isDefault: true },
            ],
        },
        {
            slug: "button-mushrooms",
            name: "Fresh Button Mushrooms",
            categoryId: catVeg.id,
            basePrice: 65.0,
            unit: "pack",
            description: "Plump, white, hand-picked button mushrooms with earthy flavor and meaty texture. Ideal for pizza toppings, creamy pastas, or spicy Indian curries.",
            origin: "Mysore Mushroom Cultivation",
            storageTip: "Keep refrigerated in dry paper wrap.",
            grossWeightDescription: "230g sealed box",
            netWeightDescription: "200g sealed box",
            image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&auto=format&fit=crop&q=80",
            rating: 4.7,
            reviewsCount: 65,
            isBestSeller: false,
            initialStockKg: 30.0,
            cuts: [
                { name: "Whole Cleaned", priceModifier: 0.0, isDefault: true },
                { name: "Pre-Sliced", priceModifier: 10.0, isDefault: false },
            ],
        },
        // --- OFFERS ---
        {
            slug: "pomfret",
            name: "Silver Pomfret (500g)",
            categoryId: catOffers.id,
            basePrice: 368.0,
            unit: "pack",
            description: "Delicate silver pomfret, prized for its butter-soft white meat and low bone structure. Perfect for tawa fry, rava fry, or mild coconut curry.",
            origin: "Konkan Coastal Catch",
            storageTip: "Cook on day of arrival for unmatched sweet sea flavor.",
            grossWeightDescription: "550g whole",
            netWeightDescription: "450g cleaned",
            image: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&auto=format&fit=crop&q=80",
            rating: 4.9,
            reviewsCount: 77,
            isBestSeller: false,
            initialStockKg: 25.0,
            cuts: [
                { name: "Whole with Cuts for Marination", priceModifier: 0.0, isDefault: true },
                { name: "Curry Cut", priceModifier: 0.0, isDefault: false },
            ],
        },
        {
            slug: "family-pack",
            name: "Family Weekend Meat Pack",
            categoryId: catOffers.id,
            basePrice: 999.0,
            unit: "pack",
            description: "The ultimate weekend combo: 1kg fresh farm chicken curry cut + 500g tender goat mutton. Cleaned, prepped, and packed separately in vacuum sealed trays.",
            origin: "Curated FreshGo Partner Farms",
            storageTip: "Store mutton and chicken in their sealed boxes until cooking.",
            grossWeightDescription: "1.7kg with bone",
            netWeightDescription: "1.5kg net meat",
            image: "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80",
            rating: 4.9,
            reviewsCount: 165,
            isBestSeller: false,
            initialStockKg: 20.0,
            cuts: [
                { name: "Standard Curry Cut", priceModifier: 0.0, isDefault: true },
            ],
        },
        {
            slug: "biryani-combo",
            name: "Sunday Feast Biryani Combo",
            categoryId: catOffers.id,
            basePrice: 499.0,
            unit: "combo",
            description: "Everything you need for an unforgettable Sunday Biryani: 1kg Biryani Cut Chicken, 1kg Aged Daawat Basmati Rice, and whole biryani spices pouch.",
            origin: "FreshGo Kitchen Essentials",
            storageTip: "Keep chicken chilled, store rice and spices in cool dry place.",
            grossWeightDescription: "2.2kg total pack",
            netWeightDescription: "2kg combo kit",
            image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80",
            rating: 4.9,
            reviewsCount: 130,
            isBestSeller: false,
            initialStockKg: 30.0,
            cuts: [
                { name: "Biryani Cut Chicken + Rice Kit", priceModifier: 0.0, isDefault: true },
            ],
        },
        // --- FROZEN ---
        {
            slug: "frozen-tenderloin-beef",
            name: "Frozen Tenderloin Beef Steak",
            categoryId: catFrozen.id,
            basePrice: 560.0,
            unit: "kg",
            description: "Flash-frozen premium tenderloin beef steaks, vacuum packed to lock in juices and tender texture. Ideal for grilling, pan-searing, or stir fry.",
            origin: "Wayanad High-Range Farms",
            storageTip: "Keep frozen below -18°C. Thaw in refrigerator before cooking.",
            grossWeightDescription: "550g pack",
            netWeightDescription: "500g net steaks",
            image: "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=600&auto=format&fit=crop&q=80",
            rating: 4.8,
            reviewsCount: 38,
            isBestSeller: true,
            initialStockKg: 35.0,
            cuts: [
                { name: "1-inch Thick Steaks", priceModifier: 0.0, isDefault: true },
                { name: "Stir-Fry Strips", priceModifier: 15.0, isDefault: false },
                { name: "Curry Cut Cubes", priceModifier: 0.0, isDefault: false },
            ],
        },
        {
            slug: "frozen-chicken-sausages-nuggets",
            name: "Frozen Chicken Sausages & Nuggets Pack",
            categoryId: catFrozen.id,
            basePrice: 320.0,
            unit: "pack",
            description: "Quick-cook frozen artisanal chicken sausages and crispy nuggets. 100% real breast meat, no artificial preservatives.",
            origin: "FreshGo Kitchen Facility, Kozhikode",
            storageTip: "Store in deep freezer at -18°C. Cook directly from frozen.",
            grossWeightDescription: "550g sealed pack",
            netWeightDescription: "500g combo pack",
            image: "https://images.unsplash.com/photo-1562967914-608f82629710?w=600&auto=format&fit=crop&q=80",
            rating: 4.8,
            reviewsCount: 29,
            isBestSeller: true,
            initialStockKg: 40.0,
            cuts: [
                { name: "500g Value Pack", priceModifier: 0.0, isDefault: true },
                { name: "1kg Family Pack", priceModifier: 280.0, isDefault: false },
            ],
        },
        {
            slug: "frozen-mutton-chops",
            name: "Frozen Prime Mutton Chops & Ribs",
            categoryId: catFrozen.id,
            basePrice: 840.0,
            unit: "kg",
            description: "Succulent prime-cut goat chops and ribs, individually quick frozen (IQF) at -40°C to lock in exceptional tenderness and natural moisture.",
            origin: "Grass-Fed Livestock Reserve",
            storageTip: "Keep in freezer at -18°C. Do not refreeze after thawing.",
            grossWeightDescription: "550g with glaze",
            netWeightDescription: "500g vacuum sealed",
            image: "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80",
            rating: 4.9,
            reviewsCount: 45,
            isBestSeller: true,
            initialStockKg: 20.0,
            cuts: [
                { name: "Rib Chops", priceModifier: 0.0, isDefault: true },
                { name: "Shoulder Cuts", priceModifier: 0.0, isDefault: false },
                { name: "Curry Mix", priceModifier: -20.0, isDefault: false },
            ],
        },
        {
            slug: "frozen-tiger-prawns-glazed",
            name: "Frozen Glazed Tiger Prawns (IQF)",
            categoryId: catFrozen.id,
            basePrice: 680.0,
            unit: "kg",
            description: "Peeled, deveined, and individually quick frozen (IQF) jumbo tiger prawns with a protective ice glaze. Fresh-off-the-boat taste whenever you cook.",
            origin: "Mangalore Deep Sea Fisheries",
            storageTip: "Store in freezer. Thaw under running cold water in 5 minutes.",
            grossWeightDescription: "500g frozen with glaze",
            netWeightDescription: "450g net thawed meat",
            image: "https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=600&auto=format&fit=crop&q=80",
            rating: 4.9,
            reviewsCount: 62,
            isBestSeller: false,
            initialStockKg: 25.0,
            cuts: [
                { name: "Tail-on IQF", priceModifier: 0.0, isDefault: true },
                { name: "Tail-off Peeled", priceModifier: 20.0, isDefault: false },
            ],
        },
    ];
    for (const item of productsToSeed) {
        const product = await prisma.product.upsert({
            where: { slug: item.slug },
            update: {
                name: item.name,
                categoryId: item.categoryId,
                basePrice: item.basePrice,
                unit: item.unit,
                description: item.description,
                origin: item.origin,
                storageTip: item.storageTip,
                grossWeightDescription: item.grossWeightDescription,
                netWeightDescription: item.netWeightDescription,
                image: item.image,
                rating: item.rating,
                reviewsCount: item.reviewsCount,
                isBestSeller: item.isBestSeller,
                isActive: true,
            },
            create: {
                slug: item.slug,
                name: item.name,
                categoryId: item.categoryId,
                basePrice: item.basePrice,
                unit: item.unit,
                description: item.description,
                origin: item.origin,
                storageTip: item.storageTip,
                grossWeightDescription: item.grossWeightDescription,
                netWeightDescription: item.netWeightDescription,
                image: item.image,
                rating: item.rating,
                reviewsCount: item.reviewsCount,
                isBestSeller: item.isBestSeller,
                isActive: true,
            },
        });
        // Seed cut options
        await prisma.productCutOption.deleteMany({
            where: { productId: product.id },
        });
        if (item.cuts && item.cuts.length > 0) {
            await prisma.productCutOption.createMany({
                data: item.cuts.map((c) => ({
                    productId: product.id,
                    name: c.name,
                    priceModifier: c.priceModifier,
                    isDefault: c.isDefault,
                })),
            });
        }
        // Ensure active fresh inventory batch with positive stock
        const isFrozen = item.categoryId === catFrozen.id;
        const batchNumber = `BATCH-${item.slug.toUpperCase().slice(0, 10)}-${Date.now().toString().slice(-4)}`;
        // Check if product already has active batches
        const activeBatchCount = await prisma.inventoryBatch.count({
            where: { productId: product.id, isActive: true, freshnessStatus: client_1.FreshnessStatus.FRESH },
        });
        if (activeBatchCount === 0) {
            await prisma.inventoryBatch.create({
                data: {
                    productId: product.id,
                    hubId: hub.id,
                    batchNumber,
                    catchOrHarvestDate: new Date(Date.now() - (isFrozen ? 24 : 6) * 3600 * 1000),
                    originSource: item.origin || "Kerala Coastal Fisheries",
                    initialQuantityKg: item.initialStockKg,
                    remainingQuantityKg: item.initialStockKg - 2.5,
                    temperatureAtIntake: isFrozen ? -18.5 : 2.0,
                    freshnessStatus: client_1.FreshnessStatus.FRESH,
                    expiryDate: new Date(Date.now() + (isFrozen ? 90 : 3) * 86400 * 1000),
                    isActive: true,
                },
            });
        }
        console.log(`✅ Seeded product: ${product.name} (${item.slug})`);
    }
    // 8. Coupon
    await prisma.coupon.upsert({
        where: { code: "FRESHGO50" },
        update: {},
        create: {
            code: "FRESHGO50",
            discountType: client_1.DiscountType.FLAT_AMOUNT,
            discountValue: 50.0,
            minOrderValue: 299.0,
            startDate: new Date(),
            endDate: new Date(Date.now() + 90 * 86400 * 1000),
            usageLimit: 1000,
            isActive: true,
        },
    });
    console.log("✅ Coupon FRESHGO50 ready");
    // 9. Initial Customer Orders
    const partnerProfile = await prisma.deliveryPartnerProfile.findUnique({
        where: { userId: partnerUser.id },
    });
    const seerProduct = await prisma.product.findUnique({
        where: { slug: "seer-fish" },
        include: { cuts: true, batches: true },
    });
    const snapperProduct = await prisma.product.findUnique({
        where: { slug: "red-snapper" },
        include: { cuts: true, batches: true },
    });
    const prawnsProduct = await prisma.product.findUnique({
        where: { slug: "tiger-prawns" },
        include: { cuts: true, batches: true },
    });
    const salmonProduct = await prisma.product.findUnique({
        where: { slug: "indian-salmon" },
        include: { cuts: true, batches: true },
    });
    if (seerProduct && snapperProduct && partnerProfile) {
        const activeOrder = await prisma.order.upsert({
            where: { orderNumber: "FF90214" },
            update: {},
            create: {
                orderNumber: "FF90214",
                customerId: customer.id,
                hubId: hub.id,
                zoneId: zone.id,
                deliveryPartnerId: partnerProfile.id,
                status: client_1.OrderStatus.OUT_FOR_DELIVERY,
                subtotal: 1040,
                deliveryFee: 0,
                discountAmount: 0,
                totalAmount: 1040,
                paymentMethod: client_1.PaymentMethod.COD,
                paymentStatus: client_1.PaymentStatus.PENDING,
                deliveryAddressSnapshotJson: JSON.stringify({
                    street: "Palm Residency, Flat 4B, 4th Cross Road",
                    area: "Kozhikode Central",
                    city: "Kozhikode",
                    pincode: "673004",
                }),
                placedAt: new Date(Date.now() - 35 * 60 * 1000),
                dispatchedAt: new Date(Date.now() - 12 * 60 * 1000),
                items: {
                    create: [
                        {
                            productId: seerProduct.id,
                            cutOptionId: seerProduct.cuts[0]?.id,
                            batchId: seerProduct.batches[0]?.id,
                            quantity: 1,
                            unitPrice: seerProduct.basePrice,
                            grossWeightGrams: 700,
                            expectedNetWeightGrams: 500,
                            subtotal: seerProduct.basePrice,
                        },
                        {
                            productId: snapperProduct.id,
                            cutOptionId: snapperProduct.cuts[0]?.id,
                            batchId: snapperProduct.batches[0]?.id,
                            quantity: 1,
                            unitPrice: snapperProduct.basePrice,
                            grossWeightGrams: 800,
                            expectedNetWeightGrams: 500,
                            subtotal: snapperProduct.basePrice,
                        },
                    ],
                },
                statusEvents: {
                    create: [
                        { toStatus: client_1.OrderStatus.PLACED, createdAt: new Date(Date.now() - 35 * 60 * 1000) },
                        { toStatus: client_1.OrderStatus.CUTTING_PREPARING, createdAt: new Date(Date.now() - 25 * 60 * 1000) },
                        { toStatus: client_1.OrderStatus.PACKED, createdAt: new Date(Date.now() - 18 * 60 * 1000) },
                        { toStatus: client_1.OrderStatus.OUT_FOR_DELIVERY, createdAt: new Date(Date.now() - 12 * 60 * 1000) },
                    ],
                },
            },
        });
        console.log("✅ Seeded active customer order:", activeOrder.orderNumber);
    }
    if (prawnsProduct && salmonProduct && partnerProfile) {
        const pastOrder = await prisma.order.upsert({
            where: { orderNumber: "FF88421" },
            update: {},
            create: {
                orderNumber: "FF88421",
                customerId: customer.id,
                hubId: hub.id,
                zoneId: zone.id,
                deliveryPartnerId: partnerProfile.id,
                status: client_1.OrderStatus.DELIVERED,
                subtotal: 1320,
                deliveryFee: 0,
                discountAmount: 0,
                totalAmount: 1320,
                paymentMethod: client_1.PaymentMethod.RAZORPAY,
                paymentStatus: client_1.PaymentStatus.PAID,
                deliveryAddressSnapshotJson: JSON.stringify({
                    street: "Palm Residency, Flat 4B, 4th Cross Road",
                    area: "Kozhikode Central",
                    city: "Kozhikode",
                    pincode: "673004",
                }),
                placedAt: new Date(Date.now() - 26 * 3600 * 1000),
                dispatchedAt: new Date(Date.now() - 25 * 3600 * 1000),
                deliveredAt: new Date(Date.now() - 24.5 * 3600 * 1000),
                items: {
                    create: [
                        {
                            productId: prawnsProduct.id,
                            cutOptionId: prawnsProduct.cuts[0]?.id,
                            batchId: prawnsProduct.batches[0]?.id,
                            quantity: 1,
                            unitPrice: prawnsProduct.basePrice,
                            grossWeightGrams: 650,
                            expectedNetWeightGrams: 400,
                            subtotal: prawnsProduct.basePrice,
                        },
                        {
                            productId: salmonProduct.id,
                            cutOptionId: salmonProduct.cuts[0]?.id,
                            batchId: salmonProduct.batches[0]?.id,
                            quantity: 1,
                            unitPrice: salmonProduct.basePrice,
                            grossWeightGrams: 750,
                            expectedNetWeightGrams: 500,
                            subtotal: salmonProduct.basePrice,
                        },
                    ],
                },
                statusEvents: {
                    create: [
                        { toStatus: client_1.OrderStatus.PLACED, createdAt: new Date(Date.now() - 26 * 3600 * 1000) },
                        { toStatus: client_1.OrderStatus.DELIVERED, createdAt: new Date(Date.now() - 24.5 * 3600 * 1000) },
                    ],
                },
            },
        });
        console.log("✅ Seeded past customer order:", pastOrder.orderNumber);
    }
    console.log(`🎉 Database seeding finished! Successfully seeded ${productsToSeed.length} live products and orders.`);
}
main()
    .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
