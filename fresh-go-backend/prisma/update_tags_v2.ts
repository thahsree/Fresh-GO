import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Applying user's exact product tags to database...");
  
  const allProducts = await prisma.product.findMany({
    include: { category: true },
  });

  for (const p of allProducts) {
    const nameLower = p.name.toLowerCase();
    const catSlug = p.category?.slug?.toLowerCase() || "";
    let tag = "Fresh";

    if (catSlug === "frozen" || nameLower.includes("frozen")) {
      tag = "Frozen";
    } else if (catSlug === "vegetables" || catSlug === "veg" || nameLower.includes("spinach") || nameLower.includes("broccoli") || nameLower.includes("mushroom")) {
      tag = "Fresh Produce";
    } else if (nameLower.includes("mutton") || nameLower.includes("beef") || nameLower.includes("tenderloin") || nameLower.includes("biryani cut") || nameLower.includes("curry cut")) {
      tag = "Fresh Cut";
    } else if (catSlug === "fish" || nameLower.includes("fish") || nameLower.includes("prawn") || nameLower.includes("pomfret") || nameLower.includes("tuna") || nameLower.includes("salmon") || nameLower.includes("squid") || nameLower.includes("sardine") || nameLower.includes("snapper") || nameLower.includes("surmai")) {
      tag = "Fresh Catch";
    } else if (nameLower.includes("chicken")) {
      tag = "Fresh";
    }

    const isCatch = tag === "Fresh Catch";
    const isFrozen = tag === "Frozen";

    await prisma.product.update({
      where: { id: p.id },
      data: {
        tag,
        isDailyCatch: isCatch,
        isFlashFrozen: isFrozen,
      },
    });

    console.log(`[TAGGED] "${p.name}" -> Tag: "${tag}"`);
  }

  console.log("All products updated with exact tags!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
