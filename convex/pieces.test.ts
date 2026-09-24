/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

// convex-test needs to find the function modules in this directory.
const modules = import.meta.glob("./**/*.ts");

// Time is an argument, never the wall clock — see convex/pieces.ts.
const NOW = 1_800_000_000_000;

export function pieceFields(overrides: Record<string, unknown> = {}) {
  return {
    title: "Kingfisher Plate",
    slug: "kingfisher-plate",
    description: "A sacred kingfisher in blue-and-green watercolor.",
    size: '10" plate',
    tags: ["wildlife"],
    mode: "oneoff" as const,
    priceCents: 18000,
    stock: 1 as number | null,
    leadTimeWeeks: null as number | null,
    shippingTier: "plate" as const,
    images: [],
    status: "published" as const,
    sortOrder: 0,
    ...overrides,
  };
}

export function orderFields(overrides: Record<string, unknown> = {}) {
  return {
    orderNumber: "GP-1001",
    status: "paid" as const,
    email: "buyer@example.com",
    name: "Buyer",
    shippingMethod: "ship" as const,
    shippingAddress: null,
    subtotalCents: 18000,
    shippingCents: 1500,
    taxCents: 0,
    totalCents: 19500,
    stripeSessionId: null,
    stripePaymentIntentId: null,
    expiresAt: 0,
    paidAt: NOW - 1000,
    shippedAt: null,
    deliveredAt: null,
    carrier: null,
    trackingNumber: null,
    notes: "",
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
    expect(pieces[0].tags).toEqual(["wildlife"]);
    expect(pieces[0].availability).toEqual({ state: "available", remaining: 1 });
  });

  test("omits draft and archived pieces", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("pieces", pieceFields({ status: "draft" }));
      await ctx.db.insert("pieces", pieceFields({ slug: "b", status: "archived" }));
    });

    expect(await t.query(api.pieces.listPublished, { now: NOW })).toEqual([]);
  });

  test("orders by sortOrder ascending", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("pieces", pieceFields({ slug: "second", title: "Second", sortOrder: 2 }));
      await ctx.db.insert("pieces", pieceFields({ slug: "first", title: "First", sortOrder: 1 }));
    });

    const pieces = await t.query(api.pieces.listPublished, { now: NOW });
    expect(pieces.map((p) => p.title)).toEqual(["First", "Second"]);
  });

  test("sold pieces stay listed but sink to the bottom", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("pieces", pieceFields({ slug: "sold", title: "Sold", sortOrder: 0, stock: 0 }));
      await ctx.db.insert("pieces", pieceFields({ slug: "live", title: "Live", sortOrder: 1 }));
    });

    const pieces = await t.query(api.pieces.listPublished, { now: NOW });
    expect(pieces.map((p) => p.title)).toEqual(["Live", "Sold"]);
    expect(pieces[1].availability).toEqual({ state: "sold" });
  });

  test("a piece on a paid order reports sold", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const pieceId = await ctx.db.insert("pieces", pieceFields());
      const orderId = await ctx.db.insert("orders", orderFields());
      await ctx.db.insert("orderItems", {
        orderId,
        pieceId,
        titleSnapshot: "Kingfisher Plate",
        priceCents: 18000,
        orderStatus: "paid",
        expiresAt: 0,
      });
    });

    const pieces = await t.query(api.pieces.listPublished, { now: NOW });
    expect(pieces[0].availability).toEqual({ state: "sold" });
  });

  test("an expired pending hold does not consume stock", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const pieceId = await ctx.db.insert("pieces", pieceFields());
      const orderId = await ctx.db.insert(
        "orders",
        orderFields({ status: "pending", paidAt: null, expiresAt: NOW - 60_000 }),
      );
      await ctx.db.insert("orderItems", {
        orderId,
        pieceId,
        titleSnapshot: "Kingfisher Plate",
        priceCents: 18000,
        orderStatus: "pending",
        expiresAt: NOW - 60_000,
      });
    });

    const pieces = await t.query(api.pieces.listPublished, { now: NOW });
    expect(pieces[0].availability).toEqual({ state: "available", remaining: 1 });
  });

  test("legacy documents read as the new shape", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const { tags, ...legacy } = pieceFields({ mode: "drop", releaseAt: null });
      void tags;
      await ctx.db.insert("pieces", { ...legacy, collection: "totems" });
    });

    const pieces = await t.query(api.pieces.listPublished, { now: NOW });
    expect(pieces[0].mode).toBe("oneoff");
    expect(pieces[0].tags).toEqual(["totems"]);
  });
});

describe("pieces.getBySlug", () => {
  test("finds a published piece by slug", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("pieces", pieceFields());
    });

    const piece = await t.query(api.pieces.getBySlug, { slug: "kingfisher-plate", now: NOW });
    expect(piece?.title).toBe("Kingfisher Plate");
  });

  test("returns null for an unknown slug", async () => {
    const t = convexTest(schema, modules);
    expect(await t.query(api.pieces.getBySlug, { slug: "nope", now: NOW })).toBeNull();
  });

  test("returns null for a draft piece", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("pieces", pieceFields({ status: "draft" }));
    });

    expect(
      await t.query(api.pieces.getBySlug, { slug: "kingfisher-plate", now: NOW }),
    ).toBeNull();
  });
});

describe("pieces.listByIds", () => {
  test("drops ids that are missing or unpublished", async () => {
    const t = convexTest(schema, modules);
    const ids = await t.run(async (ctx) => {
      const live = await ctx.db.insert("pieces", pieceFields());
      const draft = await ctx.db.insert("pieces", pieceFields({ slug: "d", status: "draft" }));
      const gone = await ctx.db.insert("pieces", pieceFields({ slug: "g" }));
      await ctx.db.delete("pieces", gone);
      return [live, draft, gone] as Id<"pieces">[];
    });

    const pieces = await t.query(api.pieces.listByIds, { ids, now: NOW });
    expect(pieces.map((p) => p.slug)).toEqual(["kingfisher-plate"]);
  });
});
