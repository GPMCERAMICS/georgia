"use node";

import Stripe from "stripe";
import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
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
        expires_at: Math.floor(reserved.expiresAt / 1000),
        client_reference_id: reserved.orderNumber,
        metadata: { orderId: reserved.orderId, orderNumber: reserved.orderNumber },
        payment_intent_data: {
          metadata: { orderId: reserved.orderId, orderNumber: reserved.orderNumber },
        },
        success_url: `${base}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${base}/cart`,
      });

      if (!session.url) throw new Error("Stripe did not return a checkout URL");

      await ctx.runMutation(internal.orders.attachSession, {
        orderId: reserved.orderId,
        stripeSessionId: session.id,
      });

      return { url: session.url };
    } catch (error) {
      await ctx.runMutation(internal.orders.cancelPending, { orderId: reserved.orderId });
      throw error;
    }
  },
});
