import { Injectable } from "@nestjs/common";

export interface OrderItemPricingInput {
  productId: string;
  unitPrice: number;
  quantity: number;
  cuttingCharge?: number;
  grossWeightGrams?: number;
  expectedNetWeightGrams?: number;
}

@Injectable()
export class PricingService {
  /**
   * Calculates subtotal, cutting charges total, and item lines
   */
  calculateCartPricing(items: OrderItemPricingInput[]) {
    let subtotal = 0;
    let cuttingChargesTotal = 0;

    const computedItems = items.map((item) => {
      const lineSubtotal = item.unitPrice * item.quantity;
      const lineCuttingCharge = (item.cuttingCharge || 0) * item.quantity;
      const lineTotal = lineSubtotal + lineCuttingCharge;

      subtotal += lineSubtotal;
      cuttingChargesTotal += lineCuttingCharge;

      return {
        ...item,
        lineSubtotal: Math.round(lineSubtotal * 100) / 100,
        lineCuttingCharge: Math.round(lineCuttingCharge * 100) / 100,
        lineTotal: Math.round(lineTotal * 100) / 100,
      };
    });

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      cuttingChargesTotal: Math.round(cuttingChargesTotal * 100) / 100,
      items: computedItems,
    };
  }

  /**
   * Calculates final order invoice including delivery fee and coupon discount
   */
  calculateFinalOrderTotal(params: {
    subtotal: number;
    cuttingChargesTotal: number;
    deliveryFee: number;
    discountAmount?: number;
  }) {
    const {
      subtotal,
      cuttingChargesTotal,
      deliveryFee,
      discountAmount = 0,
    } = params;
    const grossTotal = subtotal + cuttingChargesTotal + deliveryFee;
    const finalTotal = Math.max(0, grossTotal - discountAmount);

    return {
      subtotal,
      cuttingChargesTotal,
      deliveryFee,
      discountAmount,
      totalAmount: Math.round(finalTotal * 100) / 100,
    };
  }

  /**
   * Calculates weight variation shortfall refund when hub staff enters actual packed scale weight.
   *
   * Example: Customer ordered 1 kg Seer Fish at ₹720/kg (expected net 700g).
   * Packed scale weight comes in at 630g (10% under expected yield).
   * Shortfall ratio = (700 - 630) / 700 = 0.10.
   * Refund = ₹720 * 0.10 = ₹72.00 to be credited to user's wallet.
   */
  calculateWeightVarianceRefund(params: {
    unitPrice: number;
    quantity: number;
    expectedNetGrams: number;
    actualPackedGrams: number;
  }): { refundAmount: number; shortfallGrams: number } {
    const { unitPrice, quantity, expectedNetGrams, actualPackedGrams } = params;
    const totalExpectedGrams = expectedNetGrams * quantity;

    if (actualPackedGrams >= totalExpectedGrams) {
      return { refundAmount: 0, shortfallGrams: 0 };
    }

    const shortfallGrams = totalExpectedGrams - actualPackedGrams;
    const shortfallRatio = shortfallGrams / totalExpectedGrams;
    const rawRefund = unitPrice * quantity * shortfallRatio;
    const refundAmount = Math.round(rawRefund * 100) / 100;

    return {
      refundAmount,
      shortfallGrams,
    };
  }
}
