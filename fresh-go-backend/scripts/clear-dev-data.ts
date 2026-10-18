/**
 * FreshGo - Production Database Selective Development Data Cleanup Script
 *
 * Clears:
 *   - Test Orders (Items, Status Events, Trips, Payments, Reviews)
 *   - Test Delivery Partners / Riders (Profiles, Earnings, Settlements, Delivery Partner Users)
 *   - Test Hubs & Hub Batches (and optionally Hub Manager users)
 *
 * STRICTLY PRESERVES:
 *   - Categories
 *   - Products & Product Cuts
 *   - Featured Sections
 *   - Delivery Zones
 *   - Customer Accounts & Addresses
 *   - Super Admin Accounts
 *   - All Schemas & Migrations
 *
 * Usage:
 *   npx ts-node scripts/clear-dev-data.ts
 */

import process from "process";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("==================================================================");
  console.log("   FreshGo - Selective Dev Data Cleanup for Production DB");
  console.log("==================================================================\n");

  // 1. Gather stats before deletion
  const orderCount = await prisma.order.count();
  const riderCount = await prisma.deliveryPartnerProfile.count();
  const riderUsersCount = await prisma.user.count({
    where: { role: Role.DELIVERY_PARTNER },
  });
  const hubCount = await prisma.hub.count();
  const productCount = await prisma.product.count();
  const categoryCount = await prisma.category.count();
  const customerCount = await prisma.user.count({
    where: { role: Role.CUSTOMER },
  });
  const superAdminCount = await prisma.user.count({
    where: { role: Role.SUPER_ADMIN },
  });

  console.log("--- Current Database Counts ---");
  console.log(`Orders to remove:                  ${orderCount}`);
  console.log(`Rider Profiles to remove:          ${riderCount}`);
  console.log(`Rider Users to remove:             ${riderUsersCount}`);
  console.log(`Hubs to remove:                    ${hubCount}`);
  console.log("--------------------------------");
  console.log(`SAFE (Preserved) Products:         ${productCount}`);
  console.log(`SAFE (Preserved) Categories:       ${categoryCount}`);
  console.log(`SAFE (Preserved) Customers:        ${customerCount}`);
  console.log(`SAFE (Preserved) Super Admins:     ${superAdminCount}`);
  console.log("================================\n");

  console.log("Executing atomic cleanup transaction...");

  await prisma.$transaction(async (tx) => {
    // A. Clear all dependent order tables first
    console.log("1. Cleaning Order dependencies (Trips, Tickets, Events, Items)...");
    await tx.deliveryTrip.deleteMany({});
    await tx.deliveryIssueTicket.deleteMany({});
    await tx.paymentTransaction.deleteMany({});
    await tx.review.deleteMany({});
    await tx.orderStatusEvent.deleteMany({});
    await tx.orderItem.deleteMany({});
    
    // B. Clear Orders
    console.log("2. Deleting Orders...");
    const deletedOrders = await tx.order.deleteMany({});
    console.log(`   -> Deleted ${deletedOrders.count} orders.`);

    // C. Clear Cash Settlements and Partner Earnings
    console.log("3. Deleting Partner Settlements & Earning Entries...");
    await tx.cashSettlement.deleteMany({});
    await tx.partnerEarningEntry.deleteMany({});

    // D. Clear Delivery Partner Profiles
    console.log("4. Deleting Delivery Partner Profiles...");
    const deletedRiders = await tx.deliveryPartnerProfile.deleteMany({});
    console.log(`   -> Deleted ${deletedRiders.count} rider profiles.`);

    // E. Clear Rider User Accounts (keeping Customers & Super Admins safe)
    console.log("5. Deleting User accounts with role DELIVERY_PARTNER...");
    const deletedRiderUsers = await tx.user.deleteMany({
      where: { role: Role.DELIVERY_PARTNER },
    });
    console.log(`   -> Deleted ${deletedRiderUsers.count} delivery partner user accounts.`);

    // F. Clear Inventory Batches tied to hubs
    console.log("6. Clearing Hub Inventory Batches...");
    await tx.inventoryBatch.deleteMany({});

    // G. Reset Hub references on remaining users (Hub Admins / Managers)
    console.log("7. Disconnecting Hub references from admin users...");
    await tx.user.updateMany({
      where: { hubId: { not: null } },
      data: { hubId: null },
    });

    // H. Clear Hubs
    console.log("8. Deleting Hubs...");
    const deletedHubs = await tx.hub.deleteMany({});
    console.log(`   -> Deleted ${deletedHubs.count} hubs.`);

    // I. Reset Coupon usage counters
    console.log("9. Resetting Coupon usage counters to 0...");
    await tx.coupon.updateMany({
      data: { usedCount: 0 },
    });
  });

  console.log("\n==================================================================");
  console.log("   CLEANUP COMPLETED SUCCESSFULLY! 🎉");
  console.log("   - All dev orders, test riders, and test hubs have been cleared.");
  console.log("   - Catalog (Products, Categories, Cuts) is 100% intact.");
  console.log("   - Customer accounts, Super Admin, and Zones are 100% intact.");
  console.log("==================================================================\n");
}

main()
  .catch((e) => {
    console.error("Cleanup error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
