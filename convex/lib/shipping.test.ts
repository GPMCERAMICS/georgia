import { describe, expect, test } from "vitest";
import { computeShippingCents } from "./shipping";

const rates = { plateCents: 1500, platterCents: 2500, freeOverCents: null };
const plate = { shippingTier: "plate" as const };
const platter = { shippingTier: "platter" as const };

describe("computeShippingCents", () => {
  test("pickup is free", () => {
    expect(computeShippingCents([plate, platter], "pickup", 50000, rates)).toBe(0);
  });

  test("an empty cart ships for nothing", () => {
    expect(computeShippingCents([], "ship", 0, rates)).toBe(0);
  });

  test("plates ship at the plate rate", () => {
    expect(computeShippingCents([plate, plate], "ship", 36000, rates)).toBe(1500);
  });

  test("any platter makes it a platter shipment", () => {
    expect(computeShippingCents([plate, platter], "ship", 50000, rates)).toBe(2500);
  });

  test("free shipping threshold applies to the subtotal", () => {
    const withThreshold = { ...rates, freeOverCents: 40000 };
    expect(computeShippingCents([platter], "ship", 39999, withThreshold)).toBe(2500);
    expect(computeShippingCents([platter], "ship", 40000, withThreshold)).toBe(0);
  });
});
