import { ALLOWED_TRANSITIONS } from "../../src/modules/orders/orders.service";
import { OrderStatus } from "@prisma/client";

describe("Order State Machine Transition Validation", () => {
  it("should allow valid forward transitions", () => {
    expect(ALLOWED_TRANSITIONS[OrderStatus.PLACED]).toContain(
      OrderStatus.CONFIRMED,
    );
    expect(ALLOWED_TRANSITIONS[OrderStatus.CONFIRMED]).toContain(
      OrderStatus.CUTTING_PREPARING,
    );
    expect(ALLOWED_TRANSITIONS[OrderStatus.CUTTING_PREPARING]).toContain(
      OrderStatus.PACKED,
    );
    expect(ALLOWED_TRANSITIONS[OrderStatus.PACKED]).toContain(
      OrderStatus.DISPATCH_READY,
    );
    expect(ALLOWED_TRANSITIONS[OrderStatus.DISPATCH_READY]).toContain(
      OrderStatus.ASSIGNED,
    );
    expect(ALLOWED_TRANSITIONS[OrderStatus.ASSIGNED]).toContain(
      OrderStatus.ARRIVED_AT_HUB,
    );
    expect(ALLOWED_TRANSITIONS[OrderStatus.ARRIVED_AT_HUB]).toContain(
      OrderStatus.PICKED_UP,
    );
    expect(ALLOWED_TRANSITIONS[OrderStatus.PICKED_UP]).toContain(
      OrderStatus.OUT_FOR_DELIVERY,
    );
    expect(ALLOWED_TRANSITIONS[OrderStatus.OUT_FOR_DELIVERY]).toContain(
      OrderStatus.DELIVERED,
    );
  });

  it("should reject illegal direct jumps like PLACED -> DELIVERED", () => {
    expect(ALLOWED_TRANSITIONS[OrderStatus.PLACED]).not.toContain(
      OrderStatus.DELIVERED,
    );
    expect(ALLOWED_TRANSITIONS[OrderStatus.CONFIRMED]).not.toContain(
      OrderStatus.DELIVERED,
    );
    expect(ALLOWED_TRANSITIONS[OrderStatus.CUTTING_PREPARING]).not.toContain(
      OrderStatus.OUT_FOR_DELIVERY,
    );
  });

  it("should reject backward jumps from DELIVERED or CANCELLED", () => {
    expect(ALLOWED_TRANSITIONS[OrderStatus.DELIVERED]).toHaveLength(0);
    expect(ALLOWED_TRANSITIONS[OrderStatus.CANCELLED]).toHaveLength(0);
  });
});
