import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Updating initial tags on existing products...");
  
  // 1. Tag fish products as isDailyCatch
  const fishProds = await prisma.product.findMany({
    where: {
      OR: [
        { category: { slug: "fish" } },
        { category: { name: { contains: "Fish", mode: "insensitive" } } },
        { name: { contains: "Fish", mode: "insensitive" } },
        { name: { contains: "Prawn", mode: "insensitive" } },
        { name: { contains: "Pomfret", mode: "insensitive" } },
      ],
    },
  });

  for (const p of fishProds) {
    await prisma.product.update({
      where: { id: p.id },
      data: { isDailyCatch: true, isFlashFrozen: false },
    });
    console.log(`Tagged as Daily Catch: ${p.name}`);
  }

  // 2. Tag frozen products as isFlashFrozen
  const frozenProds = await prisma.product.findMany({
    where: {
      OR: [
        { category: { slug: "frozen" } },
        { category: { name: { contains: "Frozen", mode: "insensitive" } } },
        { name: { contains: "Frozen", mode: "insensitive" } },
      ],
    },
  });

  for (const p of frozenProds) {
    await prisma.product.update({
      where: { id: p.id },
      data: { isFlashFrozen: true, isDailyCatch: false },
    });
    console.log(`Tagged as Flash-Frozen: ${p.name}`);
  }

  console.log("Tag update completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
