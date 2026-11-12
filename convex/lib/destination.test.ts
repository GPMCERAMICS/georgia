import { describe, expect, test } from "vitest";
import { checkShipTo, SHIPPING_AREA_MESSAGE } from "./destination";

const address = {
  name: "Pat Buyer",
  line1: "1 Marsh Rd",
  line2: null,
  city: "Brunswick",
  state: "GA",
  postalCode: "31520",
};

describe("checkShipTo", () => {
  test("accepts a lower-48 address and tidies it", () => {
    const result = checkShipTo({ ...address, state: " ga ", line2: "  " });
    expect(result).toEqual({ ok: true, shipTo: address });
  });

  test("accepts DC and ZIP+4", () => {
    const result = checkShipTo({ ...address, state: "DC", postalCode: "20001-1234" });
    expect(result.ok).toBe(true);
  });

  test.each(["AK", "HI", "PR", "GU", "AE"])("refuses %s", (state) => {
    expect(checkShipTo({ ...address, state })).toEqual({ ok: false, error: SHIPPING_AREA_MESSAGE });
  });

  test.each([
    ["99501", "Alaska"],
    ["96813", "Hawaii"],
    ["00901", "Puerto Rico"],
    ["09012", "military mail"],
    ["96910", "Guam"],
  ])("refuses ZIP %s (%s) even with a lower-48 state", (postalCode) => {
    expect(checkShipTo({ ...address, postalCode })).toEqual({
      ok: false,
      error: SHIPPING_AREA_MESSAGE,
    });
  });

  test("asks for missing pieces", () => {
    expect(checkShipTo({ ...address, name: " " }).ok).toBe(false);
    expect(checkShipTo({ ...address, line1: "" }).ok).toBe(false);
    expect(checkShipTo({ ...address, postalCode: "3152" }).ok).toBe(false);
  });
});
