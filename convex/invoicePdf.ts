"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { buildInvoicePdf, bytesToBase64 } from "./lib/invoicePdf";

/**
 * Renders a custom order's invoice as a PDF and hands it back base64-encoded,
 * ready to attach to an email. In the Node runtime because that is where a
 * PDF library is certain to run; the email actions call across to it.
 */
export const render = internalAction({
  args: {
    stage: v.union(v.literal("deposit"), v.literal("balance"), v.literal("receipt")),
    issuedAt: v.number(),
    data: v.object({
      siteUrl: v.string(),
      invoiceUrl: v.string(),
      number: v.string(),
      name: v.string(),
      email: v.string(),
      title: v.string(),
      items: v.array(v.object({ description: v.string(), amountCents: v.number() })),
      subtotalCents: v.number(),
      shippingCents: v.number(),
      shippingPending: v.boolean(),
      pickup: v.boolean(),
      totalCents: v.number(),
      depositCents: v.number(),
      balanceCents: v.number(),
      depositPaid: v.boolean(),
      balancePaid: v.optional(v.boolean()),
      customerNote: v.string(),
    }),
  },
  handler: async (_ctx, args): Promise<string> => {
    return bytesToBase64(await buildInvoicePdf(args.data, args.stage, args.issuedAt));
  },
});
