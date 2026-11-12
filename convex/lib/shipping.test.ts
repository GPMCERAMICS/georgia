import { expect, test } from "vitest";
import { computeShippingCents } from "./shipping";

test("shipping is included in the price, so it is never charged", () => {
  expect(computeShippingCents()).toBe(0);
});
