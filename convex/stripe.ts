"use node";

import Stripe from "stripe";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

type Address = {
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

function toAddress(address: Stripe.Address | null | undefined): Address | null {
  if (!address || !address.line1) return null;
  return {
    line1: address.line1,
    line2: address.line2 ?? null,
    city: address.city ?? "",
    state: address.state ?? "",
    postalCode: address.postal_code ?? "",
    country: address.country ?? "US",
  };
}

/**
 * Stripe has moved the shipping address between API versions
 * (`shipping_details` → `collected_information.shipping_details`). Read
 * whichever the event carries.
 */
function shippingAddressOf(session: Stripe.Checkout.Session): Address | null {
  const collected = (
    session as unknown as {
      collected_information?: { shipping_details?: { address?: Stripe.Address } | null };
    }
  ).collected_information?.shipping_details?.address;
  const legacy = (session as unknown as { shipping_details?: { address?: Stripe.Address } | null })
    .shipping_details?.address;
  return toAddress(collected ?? legacy);
}

/**
 * Verifies the signature and applies the event. Runs in the Node runtime
 * because the Stripe SDK needs it; the HTTP route in `http.ts` hands the raw
 * body and signature across.
 */
export const handleWebhook = internalAction({
  args: { payload: v.string(), signature: v.string() },
  handler: async (ctx, args): Promise<{ handled: string }> => {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    const key = process.env.STRIPE_SECRET_KEY;
    if (!secret || !key) {
      throw new Error("STRIPE_WEBHOOK_SECRET / STRIPE_SECRET_KEY are not set");
    }
    const stripe = new Stripe(key);
    const event = stripe.webhooks.constructEvent(args.payload, args.signature, secret);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.payment_status !== "paid") {
          // Delayed payment methods are not enabled; nothing to do until paid.
          return { handled: "completed-unpaid" };
        }
        await ctx.runMutation(internal.orders.markPaid, {
          stripeSessionId: session.id,
          stripePaymentIntentId:
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : (session.payment_intent?.id ?? null),
          email: session.customer_details?.email ?? null,
          name: session.customer_details?.name ?? null,
          shippingAddress: shippingAddressOf(session),
          shippingCents: session.total_details?.amount_shipping ?? 0,
          taxCents: session.total_details?.amount_tax ?? 0,
          totalCents: session.amount_total ?? 0,
        });
        return { handled: event.type };
      }
      case "checkout.session.expired": {
        await ctx.runMutation(internal.orders.markExpired, {
          stripeSessionId: event.data.object.id,
        });
        return { handled: event.type };
      }
      case "charge.refunded": {
        const charge = event.data.object;
        const paymentIntentId =
          typeof charge.payment_intent === "string"
            ? charge.payment_intent
            : (charge.payment_intent?.id ?? null);
        if (paymentIntentId && charge.refunded) {
          await ctx.runMutation(internal.orders.markRefunded, {
            stripePaymentIntentId: paymentIntentId,
          });
        }
        return { handled: event.type };
      }
      default:
        return { handled: "ignored" };
    }
  },
});
