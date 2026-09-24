import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { auth } from "./auth";

const http = httpRouter();

auth.addHttpRoutes(http);

/**
 * Stripe → Convex. Register this URL in the Stripe dashboard:
 *   https://<deployment>.convex.site/stripe/webhook
 * for checkout.session.completed, checkout.session.expired, charge.refunded.
 *
 * The raw body is passed through untouched — signature verification needs
 * the exact bytes Stripe signed.
 */
http.route({
  path: "/stripe/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      return new Response("Missing stripe-signature header", { status: 400 });
    }
    const payload = await request.text();
    try {
      const result = await ctx.runAction(internal.stripe.handleWebhook, {
        payload,
        signature,
      });
      return Response.json({ received: true, ...result });
    } catch (error) {
      console.error("stripe webhook rejected", error);
      return new Response("Webhook error", { status: 400 });
    }
  }),
});

export default http;
