-- ==============================================================================
-- FreshGo: Selective Production Database Cleanup Script
-- 
-- PURPOSE:
-- Clears development/test Orders, Delivery Riders, and Hubs.
--
-- PRESERVED TABLES (UNTOUCHED):
--   ✓ "Category"            (All product categories)
--   ✓ "Product"             (All fishes, meats, chicken, groceries)
--   ✓ "ProductCutOption"    (All custom cut options & pricing modifiers)
--   ✓ "FeaturedSection"     (All homepage hero & featured sections)
--   ✓ "DeliveryZone"        (All delivery coverage zones)
--   ✓ "User" (CUSTOMER)     (Real customer accounts)
--   ✓ "CustomerProfile"     (Customer profiles)
--   ✓ "Address"             (Customer addresses)
--   ✓ "Wallet"              (Customer wallets)
--   ✓ "User" (SUPER_ADMIN)  (Super admin credentials)
-- ==============================================================================

BEGIN;

-- 1. Remove Order Dependencies
DELETE FROM "DeliveryTrip";
DELETE FROM "DeliveryIssueTicket";
DELETE FROM "PaymentTransaction";
DELETE FROM "Review";
DELETE FROM "OrderStatusEvent";
DELETE FROM "OrderItem";

-- 2. Remove Orders
DELETE FROM "Order";

-- 3. Remove Delivery Partner Settlements & Earnings
DELETE FROM "CashSettlement";
DELETE FROM "PartnerEarningEntry";

-- 4. Remove Delivery Partner Profiles
DELETE FROM "DeliveryPartnerProfile";

-- 5. Remove Delivery Partner User accounts (Leaves Customers and Super Admin safe)
DELETE FROM "User" WHERE "role" = 'DELIVERY_PARTNER';

-- 6. Remove Inventory Batches
DELETE FROM "InventoryBatch";

-- 7. Disconnect hub references from any Hub Admin users before removing Hubs
UPDATE "User" SET "hubId" = NULL WHERE "hubId" IS NOT NULL;

-- 8. Remove Hubs
DELETE FROM "Hub";

-- 9. Reset coupon usage count back to 0
UPDATE "Coupon" SET "usedCount" = 0;

COMMIT;

-- Verify results:
SELECT 'Orders remaining' as entity, COUNT(*) as count FROM "Order"
UNION ALL
SELECT 'Riders remaining', COUNT(*) FROM "DeliveryPartnerProfile"
UNION ALL
SELECT 'Hubs remaining', COUNT(*) FROM "Hub"
UNION ALL
SELECT 'Products preserved (SAFE)', COUNT(*) FROM "Product"
UNION ALL
SELECT 'Categories preserved (SAFE)', COUNT(*) FROM "Category"
UNION ALL
SELECT 'Customers preserved (SAFE)', COUNT(*) FROM "User" WHERE "role" = 'CUSTOMER';
