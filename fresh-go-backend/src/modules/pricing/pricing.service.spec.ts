import { PricingService } from "./pricing.service";

describe("PricingService Unit Tests", () => {
  let pricingService: PricingService;

  beforeEach(() => {
    pricingService = new PricingService();
  });

  describe("calculateCartPricing", () => {
    it("should correctly calculate subtotal, cutting charges, and item totals", () => {
      const result = pricingService.calculateCartPricing([
        {
          productId: "seer-fish",
          unitPrice: 720,
          quantity: 2,
          cuttingCharge: 20, // e.g. specialized fillet cut
        },
        {
          productId: "tiger-prawns",
          unitPrice: 640,
          quantity: 1,
          cuttingCharge: 0,
        },
      ]);

      // (720 * 2) + (640 * 1) = 1440 + 640 = 2080
      expect(result.subtotal).toBe(2080);
      // (20 * 2) + 0 = 40
      expect(result.cuttingChargesTotal).toBe(40);
      expect(result.items[0].lineTotal).toBe(1480);
      expect(result.items[1].lineTotal).toBe(640);
    });
  });

  describe("calculateFinalOrderTotal", () => {
    it("should calculate gross total, delivery fee, and apply coupon discount", () => {
      const result = pricingService.calculateFinalOrderTotal({
        subtotal: 1000,
        cuttingChargesTotal: 40,
        deliveryFee: 35,
        discountAmount: 150,
      });

      // 1000 + 40 + 35 - 150 = 925
      expect(result.totalAmount).toBe(925);
    });

    it("should not allow total to fall below zero if discount exceeds order value", () => {
      const result = pricingService.calculateFinalOrderTotal({
        subtotal: 100,
        cuttingChargesTotal: 0,
        deliveryFee: 0,
        discountAmount: 250,
      });

      expect(result.totalAmount).toBe(0);
    });
  });

  describe("calculateWeightVarianceRefund (Critical Financial Domain Logic)", () => {
    it("should calculate exact proportional refund when net scaled weight is under expected yield", () => {
      // 1kg Seer Fish @ ₹720. Expected net yield: 700g.
      // Final scale weight at packing: 630g (shortfall of 70g = 10%).
      const result = pricingService.calculateWeightVarianceRefund({
        unitPrice: 720,
        quantity: 1,
        expectedNetGrams: 700,
        actualPackedGrams: 630,
      });

      expect(result.shortfallGrams).toBe(70);
      // 720 * (70 / 700) = 72.00
      expect(result.refundAmount).toBe(72.0);
    });

    it("should return 0 refund when actual weight matches or exceeds expected yield", () => {
      const result = pricingService.calculateWeightVarianceRefund({
        unitPrice: 720,
        quantity: 1,
        expectedNetGrams: 700,
        actualPackedGrams: 720, // Extra generous 720g yield
      });

      expect(result.shortfallGrams).toBe(0);
      expect(result.refundAmount).toBe(0);
    });

    it("should handle multi-quantity variable weight calculations accurately", () => {
      // 3 packs of Country Chicken @ ₹340/each = ₹1020.
      // Expected net yield: 850g per pack = 2550g total.
      // Actual packed weight: 2295g (10% under total).
      const result = pricingService.calculateWeightVarianceRefund({
        unitPrice: 340,
        quantity: 3,
        expectedNetGrams: 850,
        actualPackedGrams: 2295,
      });

      expect(result.shortfallGrams).toBe(255);
      // Total price 1020 * (255 / 2550) = 102.00
      expect(result.refundAmount).toBe(102.0);
    });
  });
});
