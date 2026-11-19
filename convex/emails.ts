import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { adminEmails } from "./lib/adminEmails";
import * as templates from "./lib/emailTemplates";
import type { Email, InquiryData, OrderData } from "./lib/emailTemplates";
import { itemsForOrder } from "./orders";
import { returnDeductions } from "./schema";
import { getSettings } from "./settings";

/**
 * Transactional email through Resend's HTTP API. Plain `fetch`, no SDK, so
 * these actions run in the default Convex runtime with nothing to bundle.
 *
 * Every send is scheduled from a mutation (`ctx.scheduler.runAfter(0, …)`),
 * which means the order is committed before the email is attempted and a
 * failed send never rolls back a sale.
 *
 * The wording and design live in `lib/emailTemplates.ts`; this file only
 * gathers the data and decides who gets what.
 */

/**
 * Where replies go when a message names nobody in particular. The sending
 * address can live on a send-only subdomain, so replies are pointed at the
 * real mailbox.
 */
export function replyToAddress(): string {
  return process.env.RESEND_REPLY_TO ?? "info@gpmceramics.com";
}

export function fromAddress(): string {
  return process.env.RESEND_FROM_EMAIL ?? "GPM Ceramics <info@sales.gpmceramics.com>";
}

/** The public site, for links and images inside emails. */
export function siteUrl(): string {
  return (process.env.SITE_URL ?? "https://www.gpmceramics.com").replace(/\/$/, "");
}

export async function send(message: {
  to: string[];
  subject: string;
  text: string;
  html?: string;
  bcc?: string[];
  replyTo?: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY is not set; skipping email:", message.subject);
    return;
  }
  const to = message.to.map((address) => address.toLowerCase());
  const bcc = (message.bcc ?? []).filter((address) => !to.includes(address.toLowerCase()));
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromAddress(),
      to: message.to,
      bcc: bcc.length > 0 ? bcc : undefined,
      subject: message.subject,
      text: message.text,
      html: message.html,
      reply_to: message.replyTo ?? replyToAddress(),
    }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend ${response.status}: ${body}`);
  }
}

/** Sends a rendered template. `copyOwners` blind-copies the shop owner. */
async function deliver(
  email: Email,
  options: { to: string[]; copyOwners?: string[]; replyTo?: string },
): Promise<void> {
  await send({
    to: options.to,
    bcc: options.copyOwners,
    replyTo: options.replyTo,
    subject: email.subject,
    text: email.text,
    html: email.html,
  });
}

/** Records one attempted order email. See `emailLog` in the schema. */
export const logSend = internalMutation({
  args: {
    orderId: v.id("orders"),
    kind: v.string(),
    to: v.string(),
    ok: v.boolean(),
    error: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("emailLog", { ...args, sentAt: Date.now() });
    return null;
  },
});

/**
 * Sends an order email and writes the outcome to the order's log. A failed
 * send is recorded, not thrown: the order page shows it and offers to send
 * again, and one failure never stops the other emails in the same action.
 */
async function deliverForOrder(
  ctx: ActionCtx,
  orderId: Id<"orders">,
  kind: string,
  email: Email,
  options: { to: string[]; copyOwners?: string[]; replyTo?: string },
): Promise<void> {
  let error: string | null = null;
  if (!process.env.RESEND_API_KEY) {
    error = "Email is not set up on this deployment (RESEND_API_KEY is missing).";
  } else {
    try {
      await deliver(email, options);
    } catch (caught) {
      error = caught instanceof Error ? caught.message : "The email could not be sent.";
      console.error(`email ${kind} for order ${orderId} failed:`, error);
    }
  }
  await ctx.runMutation(internal.emails.logSend, {
    orderId,
    kind,
    to: options.to.join(", "),
    ok: error === null,
    error: error === null ? null : error.slice(0, 500),
  });
}

/** Where owner notifications go: Settings first, then the admin allowlist. */
export const ownerRecipients = internalQuery({
  args: {},
  handler: async (ctx): Promise<string[]> => {
    const settings = await getSettings(ctx);
    if (settings.notifyEmail.trim() !== "") return [settings.notifyEmail.trim()];
    try {
      return adminEmails();
    } catch {
      return [];
    }
  },
});

/**
 * Everything an order email needs, in the template's shape: lines with their
 * photo and lead-time note, totals, address, pickup details, and who the
 * owner copies go to.
 */
export const orderContext = internalQuery({
  args: { orderId: v.id("orders") },
  handler: async (
    ctx,
    args,
  ): Promise<{ order: Omit<OrderData, "siteUrl">; owners: string[] } | null> => {
    const order = await ctx.db.get("orders", args.orderId);
    if (!order) return null;
    const settings = await getSettings(ctx);
    const lines = await itemsForOrder(ctx, order._id);

    const items = await Promise.all(
      lines.map(async (line) => {
        const piece = await ctx.db.get("pieces", line.pieceId);
        const imageUrl = piece?.images[0] ? await ctx.storage.getUrl(piece.images[0]) : null;
        const note =
          piece?.mode === "madeToOrder"
            ? piece.leadTimeWeeks
              ? `Made to order — ships in about ${piece.leadTimeWeeks} week${piece.leadTimeWeeks === 1 ? "" : "s"}`
              : "Made to order"
            : null;
        return { title: line.titleSnapshot, priceCents: line.priceCents, imageUrl, note };
      }),
    );

    const address = order.shippingAddress;
    let owners: string[] = [];
    if (settings.notifyEmail.trim() !== "") owners = [settings.notifyEmail.trim()];
    else {
      try {
        owners = adminEmails();
      } catch {
        owners = [];
      }
    }

    return {
      owners,
      order: {
        orderNumber: order.orderNumber,
        name: order.name,
        email: order.email,
        items,
        subtotalCents: order.subtotalCents,
        discountCents: order.discountCents ?? 0,
        shippingCents: order.shippingCents,
        taxCents: order.taxCents,
        totalCents: order.totalCents,
        shippingMethod: order.shippingMethod,
        addressLines:
          order.shippingMethod === "pickup" || !address
            ? null
            : [
                order.name ?? "",
                address.line1,
                address.line2 ?? "",
                `${address.city}, ${address.state} ${address.postalCode}`,
              ].filter(Boolean),
        pickupLabel: settings.pickup.label,
        pickupInstructions: settings.pickup.instructions,
        carrier: order.carrier,
        trackingNumber: order.trackingNumber,
      },
    };
  },
});

/** Payment landed: confirmation to the buyer, a separate notice to the owner. */
export const orderPaid = internalAction({
  // `customerOnly` is for "send again" from the dashboard: the owner does not
  // need a second New order notice.
  args: { orderId: v.id("orders"), customerOnly: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const context = await ctx.runQuery(internal.emails.orderContext, { orderId: args.orderId });
    if (!context) return null;
    const order: OrderData = { ...context.order, siteUrl: siteUrl() };

    if (order.email) {
      await deliverForOrder(ctx, args.orderId, "confirmation", templates.orderConfirmation(order), {
        to: [order.email],
      });
    }
    if (context.owners.length > 0 && !args.customerOnly) {
      await deliverForOrder(ctx, args.orderId, "ownerNotice", templates.newOrderForOwner(order), {
        to: context.owners,
        replyTo: order.email ?? undefined,
      });
    }
    return null;
  },
});

const orderEvent = v.union(
  v.literal("shipped"),
  v.literal("trackingUpdated"),
  v.literal("delivered"),
);

/**
 * The fulfilment emails. A pickup order "ships" by becoming ready to collect
 * and is "delivered" when collected, so the wording follows the order.
 */
export const orderUpdate = internalAction({
  args: { orderId: v.id("orders"), event: orderEvent },
  handler: async (ctx, args) => {
    const context = await ctx.runQuery(internal.emails.orderContext, { orderId: args.orderId });
    if (!context || !context.order.email) return null;
    const order: OrderData = { ...context.order, siteUrl: siteUrl() };
    const pickup = order.shippingMethod === "pickup";

    let email: Email;
    let kind: string;
    if (args.event === "delivered") {
      email = templates.orderDelivered(order);
      kind = pickup ? "collected" : "delivered";
    } else if (pickup) {
      email = templates.pickupReady(order);
      kind = "pickupReady";
    } else if (args.event === "trackingUpdated") {
      email = templates.shippingUpdate(order);
      kind = "trackingUpdated";
    } else {
      email = templates.orderShipped(order);
      kind = "shipped";
    }

    await deliverForOrder(ctx, args.orderId, kind, email, {
      to: [context.order.email],
      copyOwners: context.owners,
    });
    return null;
  },
});

export const orderRefunded = internalAction({
  args: {
    orderId: v.id("orders"),
    amountCents: v.number(),
    full: v.boolean(),
    deductions: v.optional(returnDeductions),
  },
  handler: async (ctx, args) => {
    const context = await ctx.runQuery(internal.emails.orderContext, { orderId: args.orderId });
    if (!context || !context.order.email) return null;
    const order: OrderData = { ...context.order, siteUrl: siteUrl() };
    await deliverForOrder(
      ctx,
      args.orderId,
      "refunded",
      templates.orderRefunded(order, {
        amountCents: args.amountCents,
        full: args.full,
        deductions: args.deductions,
      }),
      { to: [context.order.email], copyOwners: context.owners },
    );
    return null;
  },
});

/** How long after the first reminder the second (and last) one goes out. */
const SECOND_REMINDER_DELAY_MS = 24 * 60 * 60_000;

/**
 * An abandoned-checkout reminder. Whether it may be sent at all is decided,
 * and recorded, by `orders.claimCartReminder` in one transaction — so two
 * runs can never both send, and the caps hold.
 */
export const cartReminder = internalAction({
  args: { orderId: v.id("orders"), attempt: v.union(v.literal(1), v.literal(2)) },
  handler: async (ctx, args) => {
    const claim = await ctx.runMutation(internal.orders.claimCartReminder, args);
    if (!claim) return null;
    const base = siteUrl();
    await deliverForOrder(
      ctx,
      args.orderId,
      "reminder",
      templates.cartReminder({
        siteUrl: base,
        name: claim.name,
        items: claim.items,
        attempt: args.attempt,
        unsubscribeUrl: `${base}/unsubscribe?t=${claim.token}&k=reminders`,
      }),
      { to: [claim.email], copyOwners: claim.owners },
    );
    if (args.attempt === 1) {
      await ctx.scheduler.runAfter(SECOND_REMINDER_DELAY_MS, internal.emails.cartReminder, {
        orderId: args.orderId,
        attempt: 2,
      });
    }
    return null;
  },
});

/** The commission form: an acknowledgement to the sender, the request to the owner. */
export const inquiryReceived = internalAction({
  args: { inquiryId: v.id("inquiries") },
  handler: async (ctx, args) => {
    const found = await ctx.runQuery(internal.inquiries.getInternal, { id: args.inquiryId });
    if (!found) return null;
    const inquiry: InquiryData = {
      siteUrl: siteUrl(),
      name: found.inquiry.name,
      email: found.inquiry.email,
      type: found.inquiry.type,
      budget: found.inquiry.budget,
      message: found.inquiry.message,
      pieceTitle: found.pieceTitle,
    };
    const owners: string[] = await ctx.runQuery(internal.emails.ownerRecipients, {});

    if (owners.length > 0) {
      await deliver(templates.commissionForOwner(inquiry), {
        to: owners,
        replyTo: inquiry.email,
      });
    }
    await deliver(templates.commissionReceived(inquiry), { to: [inquiry.email] });
    return null;
  },
});

export const newsletterWelcome = internalAction({
  args: { email: v.string(), token: v.string() },
  handler: async (_ctx, args) => {
    const base = siteUrl();
    await deliver(
      templates.newsletterWelcome({
        siteUrl: base,
        unsubscribeUrl: `${base}/unsubscribe?t=${args.token}&k=newsletter`,
      }),
      { to: [args.email] },
    );
    return null;
  },
});
