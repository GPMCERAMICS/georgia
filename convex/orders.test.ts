/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test, vi } from "vitest";
import schema from "./schema";
import { api, internal } from "./_generated/api";
import { pieceFields } from "./pieces.test";

const modules = import.meta.glob("./**/*.ts");


describe("orders.reserve", () => {
  test("holds every piece in the cart and prices shipping once", async () => {
    const t = convexTest(schema, modules);
    const [plate, platter] = await t.run(async (ctx) => [
      await ctx.db.insert("pieces", pieceFields()),
      await ctx.db.insert(
        "pieces",
        pieceFields({ slug: "platter", priceCents: 30000, shippingTier: "platter" }),
      ),
    ]);

    const reserved = await t.mutation(internal.orders.reserve, {
      pieceIds: [plate, platter],
      shippingMethod: "ship",
    });

    expect(reserved.orderNumber).toBe("GP-1001");
    expect(reserved.subtotalCents).toBe(48000);
    expect(reserved.shippingCents).toBe(2500);

    const pieces = await t.query(api.pieces.listPublished, { now: Date.now() });
    expect(pieces.every((p) => p.availability.state === "held")).toBe(true);
  });

  test("order numbers advance", async () => {
    const t = convexTest(schema, modules);
    const [a, b] = await t.run(async (ctx) => [
      await ctx.db.insert("pieces", pieceFields({ slug: "a" })),
      await ctx.db.insert("pieces", pieceFields({ slug: "b" })),
    ]);
    const first = await t.mutation(internal.orders.reserve, { pieceIds: [a], shippingMethod: "ship" });
    const second = await t.mutation(internal.orders.reserve, { pieceIds: [b], shippingMethod: "ship" });
    expect([first.orderNumber, second.orderNumber]).toEqual(["GP-1001", "GP-1002"]);
  });

  test("a one-off can only be reserved once — the second cart is refused", async () => {
    const t = convexTest(schema, modules);
    const pieceId = await t.run(async (ctx) => ctx.db.insert("pieces", pieceFields()));

    await t.mutation(internal.orders.reserve, { pieceIds: [pieceId], shippingMethod: "ship" });
    await expect(
      t.mutation(internal.orders.reserve, { pieceIds: [pieceId], shippingMethod: "ship" }),
    ).rejects.toThrow("checking out");
  });

  test("all or nothing: one sold line rejects the whole cart", async () => {
    const t = convexTest(schema, modules);
    const [live, sold] = await t.run(async (ctx) => [
      await ctx.db.insert("pieces", pieceFields({ slug: "live" })),
      await ctx.db.insert("pieces", pieceFields({ slug: "sold", stock: 0 })),
    ]);

    await expect(
      t.mutation(internal.orders.reserve, { pieceIds: [live, sold], shippingMethod: "ship" }),
    ).rejects.toThrow("just sold");

    // The live piece was not held by the failed attempt.
    const pieces = await t.query(api.pieces.listPublished, { now: Date.now() });
    expect(pieces.find((p) => p.slug === "live")?.availability).toEqual({
      state: "available",
      remaining: 1,
    });
  });

  test("made-to-order pieces never run out", async () => {
    const t = convexTest(schema, modules);
    const pieceId = await t.run(async (ctx) =>
      ctx.db.insert("pieces", pieceFields({ mode: "madeToOrder", stock: null })),
    );
    await t.mutation(internal.orders.reserve, { pieceIds: [pieceId], shippingMethod: "ship" });
    await t.mutation(internal.orders.reserve, { pieceIds: [pieceId], shippingMethod: "ship" });
    const pieces = await t.query(api.pieces.listPublished, { now: Date.now() });
    expect(pieces[0].availability).toEqual({ state: "available", remaining: null });
  });

  test("refuses unpublished pieces, empty carts, and duplicate lines", async () => {
    const t = convexTest(schema, modules);
    const [draft, live] = await t.run(async (ctx) => [
      await ctx.db.insert("pieces", pieceFields({ slug: "draft", status: "draft" })),
      await ctx.db.insert("pieces", pieceFields({ slug: "live" })),
    ]);
    await expect(
      t.mutation(internal.orders.reserve, { pieceIds: [draft], shippingMethod: "ship" }),
    ).rejects.toThrow("no longer available");
    await expect(
      t.mutation(internal.orders.reserve, { pieceIds: [], shippingMethod: "ship" }),
    ).rejects.toThrow("empty");
    await expect(
      t.mutation(internal.orders.reserve, { pieceIds: [live, live], shippingMethod: "ship" }),
    ).rejects.toThrow("once");
  });
});

describe("order lifecycle", () => {
  async function reservedOrder(t: ReturnType<typeof convexTest>) {
    const pieceId = await t.run(async (ctx) => ctx.db.insert("pieces", pieceFields()));
    const reserved = await t.mutation(internal.orders.reserve, {
      pieceIds: [pieceId],
      shippingMethod: "ship",
    });
    await t.mutation(internal.orders.attachSession, {
      orderId: reserved.orderId,
      stripeSessionId: "cs_test_1",
    });
    return { pieceId, orderId: reserved.orderId };
  }

  const paidArgs = {
    stripeSessionId: "cs_test_1",
    stripePaymentIntentId: "pi_1",
    email: "buyer@example.com",
    name: "Buyer",
    shippingAddress: {
      line1: "1 Marsh Rd",
      line2: null,
      city: "Brunswick",
      state: "GA",
      postalCode: "31520",
      country: "US",
    },
    shippingCents: 1500,
    taxCents: 0,
    totalCents: 19500,
  };

  test("markPaid settles the order and is idempotent on replay", async () => {
    const t = convexTest(schema, modules);
    const { orderId } = await reservedOrder(t);

    const first = await t.mutation(internal.orders.markPaid, paidArgs);
    const second = await t.mutation(internal.orders.markPaid, paidArgs);
    expect(first.alreadyProcessed).toBe(false);
    expect(second.alreadyProcessed).toBe(true);

    const order = await t.run(async (ctx) => ctx.db.get("orders", orderId));
    expect(order?.status).toBe("paid");
    expect(order?.email).toBe("buyer@example.com");

    const confirmation = await t.query(api.orders.confirmation, { stripeSessionId: "cs_test_1" });
    expect(confirmation?.orderNumber).toBe("GP-1001");
    expect(confirmation?.items).toEqual([{ title: "Kingfisher Plate", priceCents: 18000 }]);
  });

  test("markExpired releases the hold", async () => {
    const t = convexTest(schema, modules);
    await reservedOrder(t);

    await t.mutation(internal.orders.markExpired, { stripeSessionId: "cs_test_1" });
    const pieces = await t.query(api.pieces.listPublished, { now: Date.now() });
    expect(pieces[0].availability).toEqual({ state: "available", remaining: 1 });
  });

  test("a paid order is not expired by a late expiry event", async () => {
    const t = convexTest(schema, modules);
    const { orderId } = await reservedOrder(t);
    await t.mutation(internal.orders.markPaid, paidArgs);
    await t.mutation(internal.orders.markExpired, { stripeSessionId: "cs_test_1" });
    const order = await t.run(async (ctx) => ctx.db.get("orders", orderId));
    expect(order?.status).toBe("paid");
  });

  test("a payment that lands after the cron expired the hold still counts", async () => {
    const t = convexTest(schema, modules);
    const { orderId } = await reservedOrder(t);
    await t.mutation(internal.orders.markExpired, { stripeSessionId: "cs_test_1" });
    await t.mutation(internal.orders.markPaid, paidArgs);
    const order = await t.run(async (ctx) => ctx.db.get("orders", orderId));
    expect(order?.status).toBe("paid");
    const pieces = await t.query(api.pieces.listPublished, { now: Date.now() });
    expect(pieces[0].availability).toEqual({ state: "sold" });
  });

  test("markRefunded flips a paid order and frees the piece", async () => {
    const t = convexTest(schema, modules);
    const { orderId } = await reservedOrder(t);
    await t.mutation(internal.orders.markPaid, paidArgs);
    await t.mutation(internal.orders.markRefunded, { stripePaymentIntentId: "pi_1" });
    const order = await t.run(async (ctx) => ctx.db.get("orders", orderId));
    expect(order?.status).toBe("refunded");
    const pieces = await t.query(api.pieces.listPublished, { now: Date.now() });
    expect(pieces[0].availability).toEqual({ state: "available", remaining: 1 });
  });

  test("expireHold puts an abandoned checkout's piece back on sale", async () => {
    const t = convexTest(schema, modules);
    const { orderId } = await reservedOrder(t);
    await t.mutation(internal.orders.expireHold, { orderId });
    const order = await t.run(async (ctx) => ctx.db.get("orders", orderId));
    expect(order?.status).toBe("expired");
    const pieces = await t.query(api.pieces.listPublished, { now: Date.now() });
    expect(pieces[0].availability).toEqual({ state: "available", remaining: 1 });
  });

  test("expireHold never touches a paid order", async () => {
    const t = convexTest(schema, modules);
    const { orderId } = await reservedOrder(t);
    await t.mutation(internal.orders.markPaid, paidArgs);
    await t.mutation(internal.orders.expireHold, { orderId });
    const order = await t.run(async (ctx) => ctx.db.get("orders", orderId));
    expect(order?.status).toBe("paid");
  });

  test("normalizeOrderId rejects strings that are not order ids", async () => {
    const t = convexTest(schema, modules);
    const { orderId } = await reservedOrder(t);
    expect(await t.query(internal.orders.normalizeOrderId, { orderId })).toBe(orderId);
    expect(
      await t.query(internal.orders.normalizeOrderId, { orderId: "not-an-id" }),
    ).toBeNull();
  });

  test("expireStaleHolds only sweeps holds past the grace period", async () => {
    // The sweep schedules a Stripe call; fake timers keep it queued, not run.
    vi.useFakeTimers();
    const t = convexTest(schema, modules);
    const { orderId } = await reservedOrder(t);

    // Fresh hold: untouched.
    expect(await t.mutation(internal.orders.expireStaleHolds, {})).toEqual({ expired: 0 });

    await t.run(async (ctx) => {
      await ctx.db.patch("orders", orderId, { expiresAt: Date.now() - 10 * 60_000 });
    });
    expect(await t.mutation(internal.orders.expireStaleHolds, {})).toEqual({ expired: 1 });
    const order = await t.run(async (ctx) => ctx.db.get("orders", orderId));
    expect(order?.status).toBe("expired");
    vi.useRealTimers();
  });
});
