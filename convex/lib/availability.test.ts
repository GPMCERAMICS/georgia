import { describe, expect, test } from "vitest";
import { computeAvailability } from "./availability";

const NOW = 1_800_000_000_000;

// Defaults describe a published, in-stock one-off with no holds.
const base = {
  status: "published" as const,
  stock: 1 as number | null,
  releaseAt: null as number | null,
  paidCount: 0,
  activeHoldCount: 0,
  now: NOW,
};

describe("computeAvailability", () => {
  test("a draft piece is hidden", () => {
    expect(computeAvailability({ ...base, status: "draft" })).toEqual({
      state: "hidden",
    });
  });

  test("an archived piece is hidden", () => {
    expect(computeAvailability({ ...base, status: "archived" })).toEqual({
      state: "hidden",
    });
  });

  test("a drop before its release time is unreleased", () => {
    expect(
      computeAvailability({ ...base, stock: 5, releaseAt: NOW + 1000 }),
    ).toEqual({ state: "unreleased", releaseAt: NOW + 1000 });
  });

  test("a drop at exactly its release time is available", () => {
    expect(computeAvailability({ ...base, stock: 5, releaseAt: NOW })).toEqual({
      state: "available",
      remaining: 5,
    });
  });

  test("an unsold one-off is available with one remaining", () => {
    expect(computeAvailability(base)).toEqual({
      state: "available",
      remaining: 1,
    });
  });

  test("a one-off with a paid order is sold", () => {
    expect(computeAvailability({ ...base, paidCount: 1 })).toEqual({
      state: "sold",
    });
  });

  test("a one-off held by an in-progress checkout is sold to everyone else", () => {
    expect(computeAvailability({ ...base, activeHoldCount: 1 })).toEqual({
      state: "sold",
    });
  });

  test("a drop counts paid and held against its stock", () => {
    expect(
      computeAvailability({
        ...base,
        stock: 5,
        paidCount: 2,
        activeHoldCount: 1,
      }),
    ).toEqual({ state: "available", remaining: 2 });
  });

  test("a fully claimed drop is sold", () => {
    expect(
      computeAvailability({
        ...base,
        stock: 5,
        paidCount: 4,
        activeHoldCount: 1,
      }),
    ).toEqual({ state: "sold" });
  });

  test("oversold stock never reports negative remaining", () => {
    expect(computeAvailability({ ...base, stock: 1, paidCount: 3 })).toEqual({
      state: "sold",
    });
  });

  test("null stock (made-to-order) is always available with no limit", () => {
    expect(
      computeAvailability({ ...base, stock: null, paidCount: 99 }),
    ).toEqual({ state: "available", remaining: null });
  });

  test("hidden takes precedence over unreleased", () => {
    expect(
      computeAvailability({
        ...base,
        status: "draft",
        releaseAt: NOW + 1000,
      }),
    ).toEqual({ state: "hidden" });
  });
});
