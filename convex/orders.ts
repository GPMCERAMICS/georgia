import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { computeAvailability } from "./lib/availability";
import { countClaims } from "./lib/claims";
import { HOLD_MS } from "./lib/hold";
import { computeShippingCents } from "./lib/shipping";
import { ensureSettings, getSettings } from "./settings";
import { shippingAddress, shippingMethod } from "./schema";

export { HOLD_MINUTES, HOLD_MS } from "./lib/hold";

/**
 * The cron only expires a hold this long after its deadline, so a webhook
 * that lands right at the deadline still finds a pending order.
 */
export const EXPIRY_GRACE_MS = 2 * 60_000;

/** Most lines one order can carry. A cart is capped at the same number. */
export const MAX_ORDER_LINES = 20;

const MAX_ORDERS_PER_STATUS_SWEEP = 100;

export const ORDER_NUMBER_PREFIX = "GP-";

export type OrderItem = Doc<"orderItems">;

/** Sets the status on an order and mirrors it onto every line item. */
export async function setOrderStatus(
  ctx: MutationCtx,
  orderId: Id<"orders">,
  status: Doc<"orders">["status"],
  patch: Partial<Doc<"orders">> = {},
) {
  await ctx.db.patch("orders", orderId, { status, ...patch });
  const items = await ctx.db
    .query("orderItems")
    .withIndex("by_orderId", (q) => q.eq("orderId", orderId))
    .take(MAX_ORDER_LINES);
  await Promise.all(
    items.map((item) => ctx.db.patch("orderItems", item._id, { orderStatus: status })),
  );
}

export async function itemsForOrder(ctx: QueryCtx | MutationCtx, orderId: Id<"orders">) {
  return ctx.db
    .query("orderItems")
    .withIndex("by_orderId", (q) => q.eq("orderId", orderId))
    .take(MAX_ORDER_LINES);
}

/**
 * The core of "no overselling". One serializable transaction checks every
 * line's availability and writes the whole hold, so two carts racing for the
 * same one-off cannot both succeed: exactly one commits, the other is told
 * before it ever reaches Stripe.
 */
export const reserve = internalMutation({
  args: {
    pieceIds: v.array(v.id("pieces")),
    shippingMethod,
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    if (args.pieceIds.length === 0) throw new Error("Your cart is empty.");
    if (args.pieceIds.length > MAX_ORDER_LINES) {
      throw new Error(`A single order can hold at most ${MAX_ORDER_LINES} pieces.`);
    }
    if (new Set(args.pieceIds).size !== args.pieceIds.length) {
      throw new Error("Each piece can only be in your cart once.");
    }

    const settings = await getSettings(ctx);
    if (args.shippingMethod === "pickup" && !settings.pickup.enabled) {
      throw new Error("Local pickup is not available right now.");
    }

    const lines: { piece: Doc<"pieces"> }[] = [];
    for (const pieceId of args.pieceIds) {
      const piece = await ctx.db.get("pieces", pieceId);
      if (!piece || piece.status !== "published") {
        throw new Error("One of the pieces in your cart is no longer available.");
      }
      const { paidCount, activeHoldCount } = await countClaims(ctx, pieceId, now);
      const availability = computeAvailability({
        status: piece.status,
        stock: piece.stock,
        paidCount,
        activeHoldCount,
      });
      if (availability.state === "held") {
        throw new Error(
          `Someone is checking out with "${piece.title}" right now. If they don't finish, it will be back shortly.`,
        );
      }
      if (availability.state !== "available") {
        throw new Error(`"${piece.title}" has just sold. It has been removed from your cart.`);
      }
      lines.push({ piece });
    }

    const subtotalCents = lines.reduce((sum, { piece }) => sum + piece.priceCents, 0);
    const shippingCents = computeShippingCents(
      lines.map(({ piece }) => piece),
      args.shippingMethod,
      subtotalCents,
      settings.shipping,
    );

    const settingsDoc = await ensureSettings(ctx);
    const orderNumber = `${ORDER_NUMBER_PREFIX}${settingsDoc.nextOrderNumber}`;
    await ctx.db.patch("settings", settingsDoc._id, {
      nextOrderNumber: settingsDoc.nextOrderNumber + 1,
    });

    const expiresAt = now + HOLD_MS;
    const orderId = await ctx.db.insert("orders", {
      orderNumber,
      status: "pending",
      email: null,
      name: null,
      shippingMethod: args.shippingMethod,
      shippingAddress: null,
      subtotalCents,
      shippingCents,
      taxCents: 0,
      totalCents: subtotalCents + shippingCents,
      stripeSessionId: null,
      stripePaymentIntentId: null,
      expiresAt,
      paidAt: null,
      shippedAt: null,
      deliveredAt: null,
      carrier: null,
      trackingNumber: null,
      notes: "",
    });

    for (const { piece } of lines) {
      await ctx.db.insert("orderItems", {
        orderId,
        pieceId: piece._id,
        titleSnapshot: piece.title,
        priceCents: piece.priceCents,
        orderStatus: "pending",
        expiresAt,
      });
    }

    const items = await Promise.all(
      lines.map(async ({ piece }) => ({
        title: piece.title,
        priceCents: piece.priceCents,
        imageUrl: piece.images[0] ? await ctx.storage.getUrl(piece.images[0]) : null,
      })),
    );

    return {
      orderId,
      orderNumber,
      expiresAt,
      items,
      subtotalCents,
      shippingCents,
      shippingMethod: args.shippingMethod,
      pickupLabel: settings.pickup.label,
      taxEnabled: settings.taxEnabled,
    };
  },
});

export const attachSession = internalMutation({
  args: { orderId: v.id("orders"), stripeSessionId: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch("orders", args.orderId, { stripeSessionId: args.stripeSessionId });
    return null;
  },
});

/** Releases a hold when the Stripe session could not be created. */
export const cancelPending = internalMutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get("orders", args.orderId);
    if (!order || order.status !== "pending") return null;
    await setOrderStatus(ctx, args.orderId, "cancelled");
    return null;
  },
});

async function findBySession(ctx: MutationCtx | QueryCtx, stripeSessionId: string) {
  return ctx.db
    .query("orders")
    .withIndex("by_stripeSessionId", (q) => q.eq("stripeSessionId", stripeSessionId))
    .unique();
}

/**
 * The webhook's `checkout.session.completed`. Idempotent: Stripe retries, and
 * a re-delivered event on an already-paid order must change nothing. Also
 * accepts an order the cron already expired — if Stripe took the money, the
 * sale stands and the hold is simply re-asserted.
 */
export const markPaid = internalMutation({
  args: {
    stripeSessionId: v.string(),
    stripePaymentIntentId: v.union(v.string(), v.null()),
    email: v.union(v.string(), v.null()),
    name: v.union(v.string(), v.null()),
    shippingAddress: v.union(shippingAddress, v.null()),
    shippingCents: v.number(),
    taxCents: v.number(),
    totalCents: v.number(),
  },
  handler: async (ctx, args) => {
    const order = await findBySession(ctx, args.stripeSessionId);
    if (!order) {
      throw new Error(`No order for Stripe session ${args.stripeSessionId}`);
    }
    if (order.status !== "pending" && order.status !== "expired") {
      return { alreadyProcessed: true as const };
    }
    await setOrderStatus(ctx, order._id, "paid", {
      stripePaymentIntentId: args.stripePaymentIntentId,
      email: args.email,
      name: args.name,
      shippingAddress: args.shippingAddress,
      shippingCents: args.shippingCents,
      taxCents: args.taxCents,
      totalCents: args.totalCents,
      paidAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.emails.orderPaid, { orderId: order._id });
    return { alreadyProcessed: false as const };
  },
});

/** An order id from a URL, or null if it is not one. */
export const normalizeOrderId = internalQuery({
  args: { orderId: v.string() },
  handler: async (ctx, args) => ctx.db.normalizeId("orders", args.orderId),
});

/** What the hold-release action needs to close a checkout at Stripe. */
export const checkoutState = internalQuery({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get("orders", args.orderId);
    if (!order) return null;
    return { status: order.status, stripeSessionId: order.stripeSessionId };
  },
});

/** Ends a hold once its Stripe session can no longer be paid. */
export const expireHold = internalMutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get("orders", args.orderId);
    if (!order || order.status !== "pending") return null;
    await setOrderStatus(ctx, args.orderId, "expired");
    return null;
  },
});

export const markExpired = internalMutation({
  args: { stripeSessionId: v.string() },
  handler: async (ctx, args) => {
    const order = await findBySession(ctx, args.stripeSessionId);
    if (!order || order.status !== "pending") return null;
    await setOrderStatus(ctx, order._id, "expired");
    return null;
  },
});

export const markRefunded = internalMutation({
  args: { stripePaymentIntentId: v.string() },
  handler: async (ctx, args) => {
    const order = await ctx.db
      .query("orders")
      .withIndex("by_stripePaymentIntentId", (q) =>
        q.eq("stripePaymentIntentId", args.stripePaymentIntentId),
      )
      .unique();
    if (!order || order.status === "refunded") return null;
    await setOrderStatus(ctx, order._id, "refunded");
    return null;
  },
});

/**
 * Cron backstop for a hold whose scheduled release never ran. Frees the pieces
 * here, then still asks Stripe to close the session so the abandoned checkout
 * cannot be paid for after someone else buys the piece.
 */
export const expireStaleHolds = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - EXPIRY_GRACE_MS;
    const pending = await ctx.db
      .query("orders")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .take(MAX_ORDERS_PER_STATUS_SWEEP);
    let expired = 0;
    for (const order of pending) {
      if (order.expiresAt < cutoff) {
        await setOrderStatus(ctx, order._id, "expired");
        await ctx.scheduler.runAfter(0, internal.checkout.releaseCheckout, {
          orderId: order._id,
        });
        expired += 1;
      }
    }
    return { expired };
  },
});

/** Full order with lines, for the email action and the dashboard. */
export const getWithItems = internalQuery({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get("orders", args.orderId);
    if (!order) return null;
    const items = await itemsForOrder(ctx, args.orderId);
    return { order, items };
  },
});

/**
 * What the success page shows. Keyed by the Stripe session id, which only the
 * buyer's browser is handed, and stripped to what a receipt needs.
 */
export const confirmation = query({
  args: { stripeSessionId: v.string() },
  handler: async (ctx, args) => {
    const order = await findBySession(ctx, args.stripeSessionId);
    if (!order) return null;
    const items = await itemsForOrder(ctx, order._id);
    return {
      orderNumber: order.orderNumber,
      status: order.status,
      email: order.email,
      shippingMethod: order.shippingMethod,
      subtotalCents: order.subtotalCents,
      shippingCents: order.shippingCents,
      taxCents: order.taxCents,
      totalCents: order.totalCents,
      items: items.map((item) => ({
        title: item.titleSnapshot,
        priceCents: item.priceCents,
      })),
    };
  },
});
