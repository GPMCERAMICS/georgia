"use node";

import Stripe from "stripe";
import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { STRIPE_SESSION_MS } from "./lib/hold";
import { shippingMethod } from "./schema";

function stripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set on this deployment");
  return new Stripe(key);
}

export function siteUrl(): string {
  return (process.env.SITE_URL ?? "https://www.gpmceramics.com").replace(/\/$/, "");
}

/**
 * Cart → Stripe Checkout.
 *
 * 1. Reserve every piece in one Convex transaction (fails fast if any sold).
 * 2. Create the Checkout Session with inline prices — Stripe never holds a
 *    catalog, so there is nothing to keep in sync.
 * 3. Record the session id on the order so the webhook can find it.
 * 4. Schedule the hold's release. Stripe sessions must live 30 minutes, so the
 *    session is closed early at the (shorter) hold deadline instead.
 *
 * If Stripe refuses the session the hold is released immediately rather than
 * left to time out.
 */
export const start = action({
  args: {
    pieceIds: v.array(v.id("pieces")),
    shippingMethod,
  },
  handler: async (ctx, args): Promise<{ url: string }> => {
    const reserved = await ctx.runMutation(internal.orders.reserve, {
      pieceIds: args.pieceIds,
      shippingMethod: args.shippingMethod,
    });

    try {
      const stripe = stripeClient();
      const base = siteUrl();

      const shippingLabel =
        args.shippingMethod === "pickup"
          ? reserved.pickupLabel
          : "Standard shipping (US)";

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: reserved.items.map((item) => ({
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: item.priceCents,
            product_data: {
              name: item.title,
              images: item.imageUrl ? [item.imageUrl] : undefined,
            },
          },
        })),
        shipping_address_collection:
          args.shippingMethod === "ship" ? { allowed_countries: ["US"] } : undefined,
        shipping_options: [
          {
            shipping_rate_data: {
              type: "fixed_amount",
              display_name: shippingLabel,
              fixed_amount: { amount: reserved.shippingCents, currency: "usd" },
            },
          },
        ],
        automatic_tax: { enabled: reserved.taxEnabled },
        expires_at: Math.floor((Date.now() + STRIPE_SESSION_MS) / 1000),
        client_reference_id: reserved.orderNumber,
        metadata: { orderId: reserved.orderId, orderNumber: reserved.orderNumber },
        payment_intent_data: {
          metadata: { orderId: reserved.orderId, orderNumber: reserved.orderNumber },
        },
        success_url: `${base}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${base}/cart?cancelled=${reserved.orderId}`,
      });

      if (!session.url) throw new Error("Stripe did not return a checkout URL");

      await ctx.runMutation(internal.orders.attachSession, {
        orderId: reserved.orderId,
        stripeSessionId: session.id,
      });
      await ctx.scheduler.runAt(reserved.expiresAt, internal.checkout.releaseCheckout, {
        orderId: reserved.orderId,
      });

      return { url: session.url };
    } catch (error) {
      await ctx.runMutation(internal.orders.cancelPending, { orderId: reserved.orderId });
      throw error;
    }
  },
});

/**
 * Closes a checkout that was never paid and puts its pieces back on sale.
 *
 * Expiring the Stripe session first matters: once the pieces are free someone
 * else can buy them, so the abandoned session must not still be payable. If
 * Stripe reports the session already complete, the buyer paid at the wire and
 * the webhook will mark the order paid; the hold is left alone.
 */
async function closeCheckout(ctx: ActionCtx, orderId: Id<"orders">) {
  const order = await ctx.runQuery(internal.orders.checkoutState, { orderId });
  if (!order || (order.status !== "pending" && order.status !== "expired")) return;

  if (order.stripeSessionId) {
    const stripe = stripeClient();
    const session = await stripe.checkout.sessions.retrieve(order.stripeSessionId);
    if (session.status === "complete") return;
    if (session.status === "open") {
      try {
        await stripe.checkout.sessions.expire(order.stripeSessionId);
      } catch (error) {
        const latest = await stripe.checkout.sessions.retrieve(order.stripeSessionId);
        if (latest.status !== "expired") throw error;
      }
    }
  }

  await ctx.runMutation(internal.orders.expireHold, { orderId });
}

/** Runs at the hold deadline, and from the cron backstop. */
export const releaseCheckout = internalAction({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    await closeCheckout(ctx, args.orderId);
    return null;
  },
});

/**
 * The shopper backed out of Stripe (its cancel link returns to the cart).
 * There is no reason to make everyone else wait out the hold.
 */
export const cancel = action({
  args: { orderId: v.string() },
  handler: async (ctx, args) => {
    // The id arrives from a URL, so it is validated rather than trusted.
    const orderId = await ctx.runQuery(internal.orders.normalizeOrderId, {
      orderId: args.orderId,
    });
    if (orderId) await closeCheckout(ctx, orderId);
    return null;
  },
});
