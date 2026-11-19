"use node";

import Stripe from "stripe";
import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { MIN_CHARGE_CENTS } from "./lib/customOrder";

function siteUrl(): string {
  return (process.env.SITE_URL ?? "https://www.gpmceramics.com").replace(/\/$/, "");
}

/**
 * The "Pay" button on a custom order's invoice page.
 *
 * A fresh Stripe Checkout Session is made on each click, so the link in the
 * customer's email never expires: the link is to our invoice page, and only
 * the short-lived Stripe session behind the button is created on demand.
 * Which stage is being paid comes from the order, never from the browser.
 */
export const pay = action({
  args: { token: v.string() },
  handler: async (ctx, args): Promise<{ url: string }> => {
    const order = await ctx.runQuery(internal.customOrders.forPayment, { token: args.token });
    if (!order) throw new Error("This invoice could not be found.");
    if (order.stage === null) throw new Error("There is nothing to pay on this invoice right now.");

    const deposit = order.stage === "deposit";
    const amountCents = deposit ? order.totals.depositCents : order.totals.balanceCents;
    const goodsCents = deposit ? amountCents : amountCents - order.totals.shippingCents;
    if (amountCents < MIN_CHARGE_CENTS) {
      throw new Error("This amount is too small to pay by card. Please get in touch.");
    }

    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set on this deployment");
    const stripe = new Stripe(key);
    const invoiceUrl = `${siteUrl()}/invoice/${order.token}`;
    const metadata = { customOrderId: order.id, customOrderStage: order.stage, orderNumber: order.number };
    const shipsNow = !deposit && !order.pickup;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: shipsNow ? goodsCents : amountCents,
            product_data: {
              name: `${deposit ? "Deposit" : "Balance"} — ${order.title}`,
              description: `Order ${order.number}`,
            },
          },
        },
      ],
      // The address is taken with the final payment, when the piece ships.
      shipping_address_collection: shipsNow ? { allowed_countries: ["US"] } : undefined,
      shipping_options:
        shipsNow && order.totals.shippingCents > 0
          ? [
              {
                shipping_rate_data: {
                  type: "fixed_amount",
                  display_name: "Shipping",
                  fixed_amount: { amount: order.totals.shippingCents, currency: "usd" },
                },
              },
            ]
          : undefined,
      customer_email: order.email,
      automatic_tax: { enabled: order.taxEnabled },
      client_reference_id: order.number,
      metadata,
      payment_intent_data: { metadata },
      success_url: `${invoiceUrl}?paid=${order.stage}`,
      cancel_url: invoiceUrl,
    });
    if (!session.url) throw new Error("Stripe did not return a checkout URL");
    return { url: session.url };
  },
});
