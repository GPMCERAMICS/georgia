"use node";

import Stripe from "stripe";
import { v } from "convex/values";
import { action } from "../_generated/server";
import { internal } from "../_generated/api";
import { returnDeductions } from "../schema";

/**
 * Refunds an order from the dashboard, in full or in part, and says whether
 * its pieces should go back on sale.
 *
 * Stripe moves the money; the order is then updated here straight away so
 * the dashboard does not wait on the webhook. When Stripe's `charge.refunded`
 * event arrives it reports the same running total and changes nothing.
 * Refunds made in the Stripe dashboard keep working exactly as before.
 */
export const refund = action({
  args: {
    id: v.id("orders"),
    amountCents: v.number(),
    // Only meaningful when this refund finishes off the order.
    restock: v.boolean(),
    // A return: the piece came back, and these were kept from the refund.
    // The order closes even though the refund is not for the full amount.
    returned: v.optional(returnDeductions),
  },
  handler: async (ctx, args): Promise<{ refundedCents: number; full: boolean }> => {
    await ctx.runQuery(internal.admin.emailTest.assertAdmin, {});
    const order = await ctx.runQuery(internal.orders.refundContext, { orderId: args.id });
    if (!order) throw new Error("Order not found");
    if (order.status !== "paid" && order.status !== "shipped" && order.status !== "delivered") {
      throw new Error("Only a paid order can be refunded");
    }

    // Nothing was charged (a promo code covered it all): end the order
    // without involving Stripe.
    if (order.stripePaymentIntentId === null || order.totalCents === 0) {
      await ctx.runMutation(internal.orders.cancelUncharged, {
        orderId: args.id,
        restock: args.restock,
      });
      return { refundedCents: 0, full: true };
    }

    const remaining = order.totalCents - order.refundedCents;
    if (!Number.isInteger(args.amountCents) || args.amountCents <= 0) {
      throw new Error("Enter an amount to refund");
    }
    if (args.amountCents > remaining) {
      throw new Error("That is more than is left to refund on this order");
    }
    if (args.returned) {
      const { returnShippingCents, feeCents } = args.returned;
      const whole = (n: number) => Number.isInteger(n) && n >= 0;
      if (!whole(returnShippingCents) || !whole(feeCents)) {
        throw new Error("Return shipping and the restocking fee must be zero or more");
      }
      if (args.amountCents + returnShippingCents + feeCents !== remaining) {
        throw new Error("The refund and the amounts kept back must add up to what was paid");
      }
    }

    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set on this deployment");
    const stripe = new Stripe(key);
    await stripe.refunds.create(
      {
        payment_intent: order.stripePaymentIntentId,
        amount: args.amountCents,
        metadata: { orderId: args.id, orderNumber: order.orderNumber },
      },
      // The same click retried must not refund twice.
      { idempotencyKey: `refund-${args.id}-${order.refundedCents}-${args.amountCents}` },
    );

    const refundedCents = order.refundedCents + args.amountCents;
    const full = args.returned !== undefined || refundedCents >= order.totalCents;
    await ctx.runMutation(internal.orders.markRefunded, {
      stripePaymentIntentId: order.stripePaymentIntentId,
      amountRefundedCents: refundedCents,
      full,
      restock: args.restock,
      deductions: args.returned,
    });
    return { refundedCents, full };
  },
});

/**
 * Refunds one of a custom order's two payments, the deposit or the balance,
 * in full or in part, and optionally calls the order off.
 *
 * Only payments taken by card through the invoice page can be refunded here;
 * one recorded by hand never went through Stripe.
 */
export const refundCustom = action({
  args: {
    id: v.id("customOrders"),
    stage: v.union(v.literal("deposit"), v.literal("balance")),
    amountCents: v.number(),
    cancelOrder: v.boolean(),
  },
  handler: async (ctx, args): Promise<{ refundedCents: number }> => {
    await ctx.runQuery(internal.admin.emailTest.assertAdmin, {});
    const order = await ctx.runQuery(internal.customOrders.refundContext, { id: args.id });
    if (!order) throw new Error("Custom order not found");
    const payment = order[args.stage];
    if (payment.paymentIntentId === null) {
      throw new Error("This payment was not taken by card here, so it cannot be refunded from the dashboard");
    }
    const remaining = payment.paidCents - payment.refundedCents;
    if (!Number.isInteger(args.amountCents) || args.amountCents <= 0) {
      throw new Error("Enter an amount to refund");
    }
    if (args.amountCents > remaining) {
      throw new Error("That is more than is left to refund on this payment");
    }

    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set on this deployment");
    const stripe = new Stripe(key);
    await stripe.refunds.create(
      {
        payment_intent: payment.paymentIntentId,
        amount: args.amountCents,
        metadata: { customOrderId: args.id, orderNumber: order.number, stage: args.stage },
      },
      { idempotencyKey: `refund-${args.id}-${args.stage}-${payment.refundedCents}-${args.amountCents}` },
    );

    const refundedCents = payment.refundedCents + args.amountCents;
    await ctx.runMutation(internal.customOrders.recordRefund, {
      id: args.id,
      stage: args.stage,
      refundedCents,
      cancelOrder: args.cancelOrder,
    });
    return { refundedCents };
  },
});
