import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { requireAdmin } from "../lib/adminGuard";
import { itemsForOrder, setOrderStatus } from "../orders";
import { orderStatus } from "../schema";

/** Orders shown at once. Paginate when Georgia is doing this many. */
export const MAX_ORDERS = 500;

export type AdminOrder = Doc<"orders"> & {
  items: { pieceId: Doc<"pieces">["_id"]; title: string; priceCents: number }[];
};

async function withItems(
  ctx: Parameters<typeof itemsForOrder>[0],
  order: Doc<"orders">,
): Promise<AdminOrder> {
  const items = await itemsForOrder(ctx, order._id);
  return {
    ...order,
    items: items.map((item) => ({
      pieceId: item.pieceId,
      title: item.titleSnapshot,
      priceCents: item.priceCents,
    })),
  };
}

/**
 * Newest first. Pending holds are hidden by default: they are checkouts in
 * flight, not orders, and most quietly expire.
 */
export const list = query({
  args: { status: v.union(orderStatus, v.null()) },
  handler: async (ctx, args): Promise<AdminOrder[]> => {
    await requireAdmin(ctx);
    const orders =
      args.status === null
        ? (await ctx.db.query("orders").order("desc").take(MAX_ORDERS)).filter(
            (order) => order.status !== "pending" && order.status !== "expired",
          )
        : await ctx.db
            .query("orders")
            .withIndex("by_status", (q) => q.eq("status", args.status!))
            .order("desc")
            .take(MAX_ORDERS);
    return Promise.all(orders.map((order) => withItems(ctx, order)));
  },
});

export const get = query({
  args: { id: v.id("orders") },
  handler: async (ctx, args): Promise<AdminOrder | null> => {
    await requireAdmin(ctx);
    const order = await ctx.db.get("orders", args.id);
    return order ? withItems(ctx, order) : null;
  },
});

export const markShipped = mutation({
  args: {
    id: v.id("orders"),
    carrier: v.string(),
    trackingNumber: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const order = await ctx.db.get("orders", args.id);
    if (!order) throw new Error("Order not found");
    if (order.status !== "paid") throw new Error("Only a paid order can be marked shipped");
    await setOrderStatus(ctx, args.id, "shipped", {
      shippedAt: Date.now(),
      carrier: args.carrier.trim() || null,
      trackingNumber: args.trackingNumber.trim() || null,
    });
    await ctx.scheduler.runAfter(0, internal.emails.orderUpdate, {
      orderId: args.id,
      event: "shipped",
    });
    return null;
  },
});

/**
 * Corrects the carrier or tracking number on an order already on its way,
 * and tells the customer — but only when something actually changed.
 */
export const updateTracking = mutation({
  args: {
    id: v.id("orders"),
    carrier: v.string(),
    trackingNumber: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const order = await ctx.db.get("orders", args.id);
    if (!order) throw new Error("Order not found");
    if (order.status !== "shipped" || order.shippingMethod !== "ship") {
      throw new Error("Tracking can only be changed on a shipped order");
    }
    const carrier = args.carrier.trim() || null;
    const trackingNumber = args.trackingNumber.trim() || null;
    if (carrier === order.carrier && trackingNumber === order.trackingNumber) {
      return { changed: false };
    }
    await ctx.db.patch("orders", args.id, { carrier, trackingNumber });
    if (trackingNumber) {
      await ctx.scheduler.runAfter(0, internal.emails.orderUpdate, {
        orderId: args.id,
        event: "trackingUpdated",
      });
    }
    return { changed: true };
  },
});

export const markDelivered = mutation({
  args: { id: v.id("orders") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const order = await ctx.db.get("orders", args.id);
    if (!order) throw new Error("Order not found");
    if (order.status !== "shipped") throw new Error("Only a shipped order can be delivered");
    await setOrderStatus(ctx, args.id, "delivered", { deliveredAt: Date.now() });
    await ctx.scheduler.runAfter(0, internal.emails.orderUpdate, {
      orderId: args.id,
      event: "delivered",
    });
    return null;
  },
});

/**
 * Cancels a checkout that never paid. Paid orders are refunded from the
 * Stripe dashboard instead; the webhook flips them to refunded here.
 */
export const cancel = mutation({
  args: { id: v.id("orders") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const order = await ctx.db.get("orders", args.id);
    if (!order) throw new Error("Order not found");
    if (order.status !== "pending") {
      throw new Error("Only a pending checkout can be cancelled. Refund paid orders in Stripe.");
    }
    await setOrderStatus(ctx, args.id, "cancelled");
    return null;
  },
});

export const updateNotes = mutation({
  args: { id: v.id("orders"), notes: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch("orders", args.id, { notes: args.notes.slice(0, 5000) });
    return null;
  },
});

/** The emails attempted for an order, oldest first, for its Activity panel. */
export const emails = query({
  args: { id: v.id("orders") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const log = await ctx.db
      .query("emailLog")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.id))
      .take(100);
    return log.map((entry) => ({
      _id: entry._id,
      kind: entry.kind,
      to: entry.to,
      sentAt: entry.sentAt,
      ok: entry.ok,
      error: entry.error,
    }));
  },
});

/**
 * Sends the customer one of the order's emails again — after a failed send,
 * or when they say it never arrived. Only emails that fit the order's
 * current state can be re-sent.
 */
export const resendEmail = mutation({
  args: {
    id: v.id("orders"),
    email: v.union(v.literal("confirmation"), v.literal("shipped"), v.literal("delivered")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const order = await ctx.db.get("orders", args.id);
    if (!order) throw new Error("Order not found");
    if (!order.email) throw new Error("This order has no email address");

    if (args.email === "confirmation") {
      if (order.paidAt === null) throw new Error("This order has not been paid");
      await ctx.scheduler.runAfter(0, internal.emails.orderPaid, {
        orderId: args.id,
        customerOnly: true,
      });
    } else if (args.email === "shipped") {
      if (order.status !== "shipped" && order.status !== "delivered") {
        throw new Error("This order has not been shipped or made ready yet");
      }
      await ctx.scheduler.runAfter(0, internal.emails.orderUpdate, {
        orderId: args.id,
        event: "shipped",
      });
    } else {
      if (order.status !== "delivered") throw new Error("This order has not been delivered yet");
      await ctx.scheduler.runAfter(0, internal.emails.orderUpdate, {
        orderId: args.id,
        event: "delivered",
      });
    }
    return null;
  },
});
