import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { customOrderTotals, payableStage } from "./lib/customOrder";
import { shippingAddress } from "./schema";
import { getSettings } from "./settings";

/**
 * Custom orders as the customer and Stripe see them. The dashboard's side
 * (writing them up, sending invoices) is in `admin/customOrders.ts`.
 */

async function byToken(ctx: QueryCtx, token: string): Promise<Doc<"customOrders"> | null> {
  if (!token) return null;
  return ctx.db
    .query("customOrders")
    .withIndex("by_token", (q) => q.eq("token", token))
    .unique();
}

/**
 * The invoice page. Keyed by the token in the link the customer was emailed,
 * and stripped to what an invoice shows: no private notes, no Stripe ids.
 * A draft has not been sent, so it is not shown at all.
 */
export const invoice = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const order = await byToken(ctx, args.token);
    if (!order || order.status === "draft") return null;
    const settings = await getSettings(ctx);
    return {
      number: order.number,
      status: order.status,
      createdAt: order._creationTime,
      name: order.name,
      title: order.title,
      items: order.items,
      pickup: order.pickup,
      pickupLabel: settings.pickup.label,
      customerNote: order.customerNote,
      depositPaidAt: order.depositPaidAt,
      balancePaidAt: order.balancePaidAt,
      carrier: order.carrier,
      trackingNumber: order.trackingNumber,
      shippedAt: order.shippedAt,
      totals: customOrderTotals(order),
      payable: payableStage(order.status),
    };
  },
});

/** What the checkout action needs to open a Stripe payment. */
export const forPayment = internalQuery({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const order = await byToken(ctx, args.token);
    if (!order) return null;
    const settings = await getSettings(ctx);
    return {
      id: order._id,
      number: order.number,
      token: order.token,
      title: order.title,
      email: order.email,
      pickup: order.pickup,
      stage: payableStage(order.status),
      totals: customOrderTotals(order),
      taxEnabled: settings.taxEnabled,
    };
  },
});

/**
 * Stripe says a custom order's deposit or balance was paid. Idempotent: the
 * webhook is retried, and a stage already recorded as paid changes nothing.
 * Also the path for a payment taken outside Stripe and recorded by hand.
 */
export const markStagePaid = internalMutation({
  args: {
    id: v.id("customOrders"),
    stage: v.union(v.literal("deposit"), v.literal("balance")),
    paymentIntentId: v.union(v.string(), v.null()),
    paidCents: v.number(),
    shippingAddress: v.union(shippingAddress, v.null()),
    // False for a payment recorded by hand: nothing to thank the customer
    // for by email that they do not already know.
    notify: v.boolean(),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get("customOrders", args.id);
    if (!order) throw new Error("Custom order not found");
    const now = Date.now();

    if (args.stage === "deposit") {
      if (order.depositPaidAt !== null) return { alreadyProcessed: true as const };
      await ctx.db.patch("customOrders", order._id, {
        status: order.status === "cancelled" ? "cancelled" : "inProgress",
        depositPaidAt: now,
        depositPaidCents: args.paidCents,
        depositPaymentIntentId: args.paymentIntentId,
      });
    } else {
      if (order.balancePaidAt !== null) return { alreadyProcessed: true as const };
      await ctx.db.patch("customOrders", order._id, {
        status: order.status === "cancelled" ? "cancelled" : "paid",
        // A balance can only be paid once the deposit is settled; if it was
        // taken outside Stripe and never recorded, settle it now.
        depositPaidAt: order.depositPaidAt ?? now,
        balancePaidAt: now,
        balancePaidCents: args.paidCents,
        balancePaymentIntentId: args.paymentIntentId,
        shippingAddress: args.shippingAddress ?? order.shippingAddress,
      });
    }
    if (args.notify) {
      await ctx.scheduler.runAfter(0, internal.emails.customOrderPaid, {
        id: order._id,
        stage: args.stage,
      });
    }
    return { alreadyProcessed: false as const };
  },
});

/** Everything an email about a custom order needs. */
export const emailContext = internalQuery({
  args: { id: v.id("customOrders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get("customOrders", args.id);
    if (!order) return null;
    const settings = await getSettings(ctx);
    return {
      order,
      totals: customOrderTotals(order),
      pickupLabel: settings.pickup.label,
      pickupInstructions: settings.pickup.instructions,
      notifyEmail: settings.notifyEmail.trim(),
    };
  },
});
