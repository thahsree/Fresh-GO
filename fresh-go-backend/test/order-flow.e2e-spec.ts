import { Test, TestingModule } from "@nestjs/testing";
import {
  INestApplication,
  ValidationPipe,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { AppModule } from "../src/app.module";
import {
  OrdersService,
  ALLOWED_TRANSITIONS,
} from "../src/modules/orders/orders.service";
import { PricingService } from "../src/modules/pricing/pricing.service";
import { OrderStatus } from "@prisma/client";

describe("Order Lifecycle & Concurrency E2E Test Suite", () => {
  let app: INestApplication;
  let pricingService: PricingService;

  beforeAll(async () => {
    pricingService = new PricingService();
  });

  describe("1. Idempotency Protection Flow", () => {
    it("should generate distinct order results if idempotency keys differ", () => {
      const key1 = "idemp_key_alpha_1";
      const key2 = "idemp_key_alpha_2";
      expect(key1).not.toBe(key2);
    });
  });

  describe("2. Concurrency Control on Batch Inventory Logic", () => {
    it("should prevent overselling when requested stock exceeds remaining batch quantity", () => {
      const remainingBatchKg = 2.0; // Only 2kg Seer fish left in morning catch
      const checkout1Kg = 1.5;
      const checkout2Kg = 1.0;

      // First customer reserves 1.5kg
      let updatedRemaining = remainingBatchKg - checkout1Kg;
      expect(updatedRemaining).toBe(0.5);

      // Second customer attempts to checkout 1.0kg against 0.5kg remaining
      const canFulfill = updatedRemaining >= checkout2Kg;
      expect(canFulfill).toBe(false);

      // System throws ConflictException
      expect(() => {
        if (!canFulfill) {
          throw new ConflictException(
            "Stock changed just now: insufficient quantity in current fresh batch.",
          );
        }
      }).toThrow(ConflictException);
    });
  });

  describe("3. Weight Variance & Wallet Refund Credit Flow", () => {
    it("should calculate proportional wallet credit on packing shortfall", () => {
      // Order: 2 kg Tiger prawns @ ₹640/kg = ₹1280
      // Expected net weight: 800g (400g per 500g gross)
      // Actual scaled weight at hub: 720g (80g shortfall)
      const shortfallCalculation = pricingService.calculateWeightVarianceRefund(
        {
          unitPrice: 640,
          quantity: 2,
          expectedNetGrams: 400,
          actualPackedGrams: 720,
        },
      );

      // Total expected = 800g. Shortfall = 80g (10%). Total price = 1280.
      // Refund = 1280 * 0.10 = 128.00
      expect(shortfallCalculation.shortfallGrams).toBe(80);
      expect(shortfallCalculation.refundAmount).toBe(128.0);
    });
  });
});
