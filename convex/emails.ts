import { v } from "convex/values";
import { internalAction, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { adminEmails } from "./lib/adminEmails";
import { getSettings } from "./settings";

/**
 * Transactional email through Resend's HTTP API. Plain `fetch`, no SDK, so
 * these actions run in the default Convex runtime with nothing to bundle.
 *
 * Every send is scheduled from a mutation (`ctx.scheduler.runAfter(0, …)`),
 * which means the order is committed before the email is attempted and a
 * failed send never rolls back a sale.
 */

const money = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

function fromAddress(): string {
  return process.env.RESEND_FROM_EMAIL ?? "Georgia Perkins Pottery <onboarding@resend.dev>";
}

async function send(message: {
  to: string[];
  subject: string;
  text: string;
  replyTo?: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY is not set; skipping email:", message.subject);
    return;
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromAddress(),
      to: message.to,
      subject: message.subject,
      text: message.text,
      reply_to: message.replyTo,
    }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend ${response.status}: ${body}`);
  }
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

function orderLines(items: Doc<"orderItems">[]): string {
  return items.map((item) => `  • ${item.titleSnapshot} — ${money(item.priceCents)}`).join("\n");
}

function addressBlock(order: Doc<"orders">): string {
  if (order.shippingMethod === "pickup") return "Local pickup";
  const a = order.shippingAddress;
  if (!a) return "Shipping address pending";
  return [a.line1, a.line2, `${a.city}, ${a.state} ${a.postalCode}`, a.country]
    .filter(Boolean)
    .join("\n");
}

export const orderPaid = internalAction({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const result = await ctx.runQuery(internal.orders.getWithItems, { orderId: args.orderId });
    if (!result) return null;
    const { order, items } = result;
    const owners: string[] = await ctx.runQuery(internal.emails.ownerRecipients, {});

    const summary = [
      orderLines(items),
      "",
      `Subtotal: ${money(order.subtotalCents)}`,
      `Shipping: ${money(order.shippingCents)}`,
      order.taxCents > 0 ? `Tax: ${money(order.taxCents)}` : null,
      `Total: ${money(order.totalCents)}`,
    ]
      .filter((line) => line !== null)
      .join("\n");

    if (order.email) {
      await send({
        to: [order.email],
        subject: `Order ${order.orderNumber} — thank you!`,
        text: [
          `Hi ${order.name ?? "there"},`,
          "",
          "Thank you for your order from Georgia Perkins Pottery. Each piece is",
          "handmade, so Georgia will pack it with care and let you know when it ships.",
          "",
          `Order ${order.orderNumber}`,
          summary,
          "",
          order.shippingMethod === "pickup"
            ? "You chose local pickup. Georgia will email you to arrange a time."
            : `Shipping to:\n${addressBlock(order)}`,
          "",
          "Questions? Just reply to this email.",
          "",
          "— Georgia",
        ].join("\n"),
      });
    }

    if (owners.length > 0) {
      await send({
        to: owners,
        subject: `New order ${order.orderNumber} — ${money(order.totalCents)}`,
        replyTo: order.email ?? undefined,
        text: [
          `${order.name ?? "A customer"} <${order.email ?? "no email"}> just paid.`,
          "",
          summary,
          "",
          addressBlock(order),
          "",
          "Open the dashboard to mark it shipped once it is on its way.",
        ].join("\n"),
      });
    }
    return null;
  },
});

export const orderShipped = internalAction({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const result = await ctx.runQuery(internal.orders.getWithItems, { orderId: args.orderId });
    if (!result) return null;
    const { order, items } = result;
    const email = order.email;
    if (!email) return null;
    const tracking =
      order.trackingNumber && order.carrier
        ? `${order.carrier} tracking: ${order.trackingNumber}`
        : order.trackingNumber
          ? `Tracking: ${order.trackingNumber}`
          : null;
    await send({
      to: [email],
      subject: `Order ${order.orderNumber} is on its way`,
      text: [
        `Hi ${order.name ?? "there"},`,
        "",
        "Your pottery has shipped.",
        "",
        orderLines(items),
        "",
        tracking,
        "",
        "Handmade ceramics are sturdy but not indestructible — please unpack",
        "carefully and let Georgia know if anything arrived less than perfect.",
        "",
        "— Georgia",
      ]
        .filter((line) => line !== null)
        .join("\n"),
    });
    return null;
  },
});

export const inquiryReceived = internalAction({
  args: { inquiryId: v.id("inquiries") },
  handler: async (ctx, args) => {
    const inquiry = await ctx.runQuery(internal.inquiries.getInternal, { id: args.inquiryId });
    if (!inquiry) return null;
    const owners: string[] = await ctx.runQuery(internal.emails.ownerRecipients, {});
    if (owners.length === 0) return null;
    await send({
      to: owners,
      replyTo: inquiry.email,
      subject: `New commission inquiry — ${inquiry.name}`,
      text: [
        `Name: ${inquiry.name}`,
        `Email: ${inquiry.email}`,
        `Type: ${inquiry.type || "Not specified"}`,
        `Budget: ${inquiry.budget || "Not specified"}`,
        "",
        "Message:",
        inquiry.message,
        "",
        "This inquiry is also waiting in the dashboard under Inquiries.",
      ].join("\n"),
    });
    return null;
  },
});
