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
    await ctx.scheduler.runAfter(0, internal.emails.orderShipped, { orderId: args.id });
    return null;
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
