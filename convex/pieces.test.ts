/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";

// convex-test needs to find the function modules in this directory.
const modules = import.meta.glob("./**/*.ts");

// Time is an argument, never the wall clock — see convex/pieces.ts.
const NOW = 1_800_000_000_000;

function pieceFields(overrides: Record<string, unknown> = {}) {
  return {
    title: "Kingfisher Plate",
    slug: "kingfisher-plate",
    description: "A sacred kingfisher in blue-and-green watercolor.",
    size: '10" plate',
    collection: "wildlife" as const,
    mode: "oneoff" as const,
    priceCents: 18000,
    stock: 1 as number | null,
    releaseAt: null as number | null,
    leadTimeWeeks: null as number | null,
    shippingTier: "plate" as const,
    images: [],
    status: "published" as const,
    sortOrder: 0,
    ...overrides,
  };
}

describe("pieces.listPublished", () => {
  test("returns published pieces", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("pieces", pieceFields());
    });

    const pieces = await t.query(api.pieces.listPublished, { now: NOW });
    expect(pieces).toHaveLength(1);
    expect(pieces[0].title).toBe("Kingfisher Plate");
    expect(pieces[0].availability).toEqual({
      state: "available",
      remaining: 1,
    });
  });

  test("omits draft and archived pieces", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("pieces", pieceFields({ status: "draft" }));
      await ctx.db.insert(
        "pieces",
        pieceFields({ slug: "b", status: "archived" }),
      );
    });

    expect(await t.query(api.pieces.listPublished, { now: NOW })).toEqual([]);
  });

  test("orders by sortOrder ascending", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert(
        "pieces",
        pieceFields({ slug: "second", title: "Second", sortOrder: 2 }),
      );
      await ctx.db.insert(
        "pieces",
        pieceFields({ slug: "first", title: "First", sortOrder: 1 }),
      );
    });

    const pieces = await t.query(api.pieces.listPublished, { now: NOW });
    expect(pieces.map((p) => p.title)).toEqual(["First", "Second"]);
  });

  test("a piece with a paid order reports sold", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const pieceId = await ctx.db.insert("pieces", pieceFields());
      await ctx.db.insert("orders", {
        pieceId,
        stripeSessionId: null,
        stripePaymentIntentId: null,
        status: "paid",
        expiresAt: 0,
        email: "buyer@example.com",
        name: "Buyer",
        shippingAddress: null,
        amountCents: 18000,
        shippingCents: 900,
        paidAt: NOW - 1000,
      });
    });

    const pieces = await t.query(api.pieces.listPublished, { now: NOW });
    expect(pieces[0].availability).toEqual({ state: "sold" });
  });

  test("an expired pending order does not hold stock", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const pieceId = await ctx.db.insert("pieces", pieceFields());
      await ctx.db.insert("orders", {
        pieceId,
        stripeSessionId: null,
        stripePaymentIntentId: null,
        status: "pending",
        expiresAt: NOW - 60_000, // expired a minute ago
        email: null,
        name: null,
        shippingAddress: null,
        amountCents: 18000,
        shippingCents: 900,
        paidAt: null,
      });
    });

    const pieces = await t.query(api.pieces.listPublished, { now: NOW });
    expect(pieces[0].availability).toEqual({
      state: "available",
      remaining: 1,
    });
  });
});

describe("pieces.getBySlug", () => {
  test("finds a published piece by slug", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("pieces", pieceFields());
    });

    const piece = await t.query(api.pieces.getBySlug, {
      slug: "kingfisher-plate",
      now: NOW,
    });
    expect(piece?.title).toBe("Kingfisher Plate");
  });

  test("returns null for an unknown slug", async () => {
    const t = convexTest(schema, modules);
    expect(
      await t.query(api.pieces.getBySlug, { slug: "nope", now: NOW }),
    ).toBeNull();
  });

  test("returns null for a draft piece", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("pieces", pieceFields({ status: "draft" }));
    });

    expect(
      await t.query(api.pieces.getBySlug, {
        slug: "kingfisher-plate",
        now: NOW,
      }),
    ).toBeNull();
  });
});
