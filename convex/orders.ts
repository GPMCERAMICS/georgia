import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { computeAvailability } from "./lib/availability";
import { countClaims } from "./lib/claims";
import { ensureContact, findContact, isEmail, normalizeEmail, subscribe } from "./lib/contacts";
import { checkShipTo, type ShipTo } from "./lib/destination";
import { HOLD_MS } from "./lib/hold";
import { computeShippingCents } from "./lib/shipping";
import { adminEmails } from "./lib/adminEmails";
import { SETTLED_STATUSES } from "./lib/pieceShape";
import { ensureSettings, getSettings } from "./settings";
import { shippingAddress, shippingMethod, shipTo } from "./schema";

export { HOLD_MINUTES, HOLD_MS } from "./lib/hold";

/**
 * The cron only expires a hold this long after its deadline, so a webhook
 * that lands right at the deadline still finds a pending order.
 */
export const EXPIRY_GRACE_MS = 2 * 60_000;

/** Most lines one order can carry. A cart is capped at the same number. */
export const MAX_ORDER_LINES = 20;

const MAX_ORDERS_PER_STATUS_SWEEP = 100;

export const ORDER_NUMBER_PREFIX = "GP-";

export type OrderItem = Doc<"orderItems">;

/** Sets the status on an order and mirrors it onto every line item. */
export async function setOrderStatus(
  ctx: MutationCtx,
  orderId: Id<"orders">,
  status: Doc<"orders">["status"],
  patch: Partial<Doc<"orders">> = {},
) {
  await ctx.db.patch("orders", orderId, { status, ...patch });
  const items = await ctx.db
    .query("orderItems")
    .withIndex("by_orderId", (q) => q.eq("orderId", orderId))
    .take(MAX_ORDER_LINES);
  await Promise.all(
    items.map((item) => ctx.db.patch("orderItems", item._id, { orderStatus: status })),
  );
}

export async function itemsForOrder(ctx: QueryCtx | MutationCtx, orderId: Id<"orders">) {
  return ctx.db
    .query("orderItems")
    .withIndex("by_orderId", (q) => q.eq("orderId", orderId))
    .take(MAX_ORDER_LINES);
}

/**
 * The core of "no overselling". One serializable transaction checks every
 * line's availability and writes the whole hold, so two carts racing for the
 * same one-off cannot both succeed: exactly one commits, the other is told
 * before it ever reaches Stripe.
 */
export const reserve = internalMutation({
  args: {
    pieceIds: v.array(v.id("pieces")),
    shippingMethod,
    // Required when shipping. Checked here, before any hold or charge, so an
    // order can never be taken for an address outside the shipping area.
    shipTo: v.optional(shipTo),
    // The shopper's email from the cart. Kept on the order from the start so
    // an abandoned checkout can be followed up.
    email: v.optional(v.string()),
    newsletterOptIn: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    if (args.pieceIds.length === 0) throw new Error("Your cart is empty.");

    let email: string | null = null;
    if (args.email !== undefined) {
      email = normalizeEmail(args.email);
      if (!isEmail(email)) throw new Error("Enter a valid email address.");
    }

    let destination: ShipTo | null = null;
    if (args.shippingMethod === "ship") {
      if (!args.shipTo) throw new Error("Enter a shipping address to continue.");
      const checked = checkShipTo(args.shipTo);
      if (!checked.ok) throw new Error(checked.error);
      destination = checked.shipTo;
    }
    if (args.pieceIds.length > MAX_ORDER_LINES) {
      throw new Error(`A single order can hold at most ${MAX_ORDER_LINES} pieces.`);
    }
    if (new Set(args.pieceIds).size !== args.pieceIds.length) {
      throw new Error("Each piece can only be in your cart once.");
    }

    const settings = await getSettings(ctx);
    if (args.shippingMethod === "pickup" && !settings.pickup.enabled) {
      throw new Error("Local pickup is not available right now.");
    }

    const lines: { piece: Doc<"pieces"> }[] = [];
    for (const pieceId of args.pieceIds) {
      const piece = await ctx.db.get("pieces", pieceId);
      if (!piece || piece.status !== "published") {
        throw new Error("One of the pieces in your cart is no longer available.");
      }
      const { paidCount, activeHoldCount } = await countClaims(ctx, pieceId, now);
      const availability = computeAvailability({
        status: piece.status,
        stock: piece.stock,
        paidCount,
        activeHoldCount,
      });
      if (availability.state === "held") {
        throw new Error(
          `Someone is checking out with "${piece.title}" right now. If they don't finish, it will be back shortly.`,
        );
      }
      if (availability.state !== "available") {
        throw new Error(`"${piece.title}" has just sold. It has been removed from your cart.`);
      }
      lines.push({ piece });
    }

    const subtotalCents = lines.reduce((sum, { piece }) => sum + piece.priceCents, 0);
    const shippingCents = computeShippingCents();

    const settingsDoc = await ensureSettings(ctx);
    const orderNumber = `${ORDER_NUMBER_PREFIX}${settingsDoc.nextOrderNumber}`;
    await ctx.db.patch("settings", settingsDoc._id, {
      nextOrderNumber: settingsDoc.nextOrderNumber + 1,
    });

    const expiresAt = now + HOLD_MS;
    const orderId = await ctx.db.insert("orders", {
      orderNumber,
      status: "pending",
      email,
      newsletterOptIn: args.newsletterOptIn === true ? true : undefined,
      name: destination?.name ?? null,
      shippingMethod: args.shippingMethod,
      shippingAddress: destination
        ? {
            line1: destination.line1,
            line2: destination.line2,
            city: destination.city,
            state: destination.state,
            postalCode: destination.postalCode,
            country: "US",
          }
        : null,
      subtotalCents,
      shippingCents,
      taxCents: 0,
      totalCents: subtotalCents + shippingCents,
      stripeSessionId: null,
      stripePaymentIntentId: null,
      expiresAt,
      paidAt: null,
      shippedAt: null,
      deliveredAt: null,
      carrier: null,
      trackingNumber: null,
      notes: "",
    });

    for (const { piece } of lines) {
      await ctx.db.insert("orderItems", {
        orderId,
        pieceId: piece._id,
        titleSnapshot: piece.title,
        priceCents: piece.priceCents,
        orderStatus: "pending",
        expiresAt,
      });
    }

    const items = await Promise.all(
      lines.map(async ({ piece }) => ({
        title: piece.title,
        priceCents: piece.priceCents,
        imageUrl: piece.images[0] ? await ctx.storage.getUrl(piece.images[0]) : null,
      })),
    );

    return {
      orderId,
      orderNumber,
      expiresAt,
      items,
      subtotalCents,
      shippingCents,
      shippingMethod: args.shippingMethod,
      shipTo: destination,
      email,
      pickupLabel: settings.pickup.label,
      taxEnabled: settings.taxEnabled,
    };
  },
});

export const attachSession = internalMutation({
  args: { orderId: v.id("orders"), stripeSessionId: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch("orders", args.orderId, { stripeSessionId: args.stripeSessionId });
    return null;
  },
});

/** Releases a hold when the Stripe session could not be created. */
export const cancelPending = internalMutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get("orders", args.orderId);
    if (!order || order.status !== "pending") return null;
    await setOrderStatus(ctx, args.orderId, "cancelled");
    return null;
  },
});

async function findBySession(ctx: MutationCtx | QueryCtx, stripeSessionId: string) {
  return ctx.db
    .query("orders")
    .withIndex("by_stripeSessionId", (q) => q.eq("stripeSessionId", stripeSessionId))
    .unique();
}

/**
 * The webhook's `checkout.session.completed`. Idempotent: Stripe retries, and
 * a re-delivered event on an already-paid order must change nothing. Also
 * accepts an order the cron already expired — if Stripe took the money, the
 * sale stands and the hold is simply re-asserted.
 */
export const markPaid = internalMutation({
  args: {
    stripeSessionId: v.string(),
    stripePaymentIntentId: v.union(v.string(), v.null()),
    email: v.union(v.string(), v.null()),
    name: v.union(v.string(), v.null()),
    shippingAddress: v.union(shippingAddress, v.null()),
    shippingCents: v.number(),
    taxCents: v.number(),
    discountCents: v.optional(v.number()),
    totalCents: v.number(),
  },
  handler: async (ctx, args) => {
    const order = await findBySession(ctx, args.stripeSessionId);
    if (!order) {
      throw new Error(`No order for Stripe session ${args.stripeSessionId}`);
    }
    if (order.status !== "pending" && order.status !== "expired") {
      return { alreadyProcessed: true as const };
    }
    const email = args.email ?? order.email;
    await setOrderStatus(ctx, order._id, "paid", {
      stripePaymentIntentId: args.stripePaymentIntentId,
      email,
      // The cart's ship-to name and address are the ones that were checked
      // against the shipping area; Stripe's are only a fallback (pickup).
      name: order.name ?? args.name,
      shippingAddress: order.shippingAddress ?? args.shippingAddress,
      shippingCents: args.shippingCents,
      taxCents: args.taxCents,
      discountCents: args.discountCents ?? 0,
      totalCents: args.totalCents,
      paidAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.emails.orderPaid, { orderId: order._id });

    // The "send me news" tick only counts once the order is real.
    if (order.newsletterOptIn && email) {
      const { contact, welcome } = await subscribe(ctx, email, "checkout");
      if (welcome) {
        await ctx.scheduler.runAfter(0, internal.emails.newsletterWelcome, {
          email: contact.email,
          token: contact.token,
        });
      }
    }
    return { alreadyProcessed: false as const };
  },
});

/** An order id from a URL, or null if it is not one. */
export const normalizeOrderId = internalQuery({
  args: { orderId: v.string() },
  handler: async (ctx, args) => ctx.db.normalizeId("orders", args.orderId),
});

/** What the hold-release action needs to close a checkout at Stripe. */
export const checkoutState = internalQuery({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get("orders", args.orderId);
    if (!order) return null;
    return { status: order.status, stripeSessionId: order.stripeSessionId };
  },
});

/** Ends a hold once its Stripe session can no longer be paid. */
export const expireHold = internalMutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get("orders", args.orderId);
    if (!order || order.status !== "pending") return null;
    await setOrderStatus(ctx, args.orderId, "expired");
    await queueCartReminder(ctx, order);
    return null;
  },
});

export const markExpired = internalMutation({
  args: { stripeSessionId: v.string() },
  handler: async (ctx, args) => {
    const order = await findBySession(ctx, args.stripeSessionId);
    if (!order || order.status !== "pending") return null;
    await setOrderStatus(ctx, order._id, "expired");
    await queueCartReminder(ctx, order);
    return null;
  },
});

/**
 * Stripe's `charge.refunded`, which fires for partial refunds too and always
 * carries the running total refunded. Comparing that total with what the
 * order already records makes a re-delivered event a no-op and tells us how
 * much this particular refund was.
 */
export const markRefunded = internalMutation({
  args: {
    stripePaymentIntentId: v.string(),
    // Omitted by older callers, which only ever reported full refunds.
    amountRefundedCents: v.optional(v.number()),
    full: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db
      .query("orders")
      .withIndex("by_stripePaymentIntentId", (q) =>
        q.eq("stripePaymentIntentId", args.stripePaymentIntentId),
      )
      .unique();
    if (!order) return null;

    const full = args.full ?? true;
    const total = args.amountRefundedCents ?? order.totalCents;
    const already = order.refundedCents ?? 0;
    if (total <= already && (!full || order.status === "refunded")) return null;

    if (full && order.status !== "refunded") {
      await setOrderStatus(ctx, order._id, "refunded", { refundedCents: total });
    } else {
      await ctx.db.patch("orders", order._id, { refundedCents: total });
    }
    if (total > already) {
      await ctx.scheduler.runAfter(0, internal.emails.orderRefunded, {
        orderId: order._id,
        amountCents: total - already,
        full,
      });
    }
    return null;
  },
});

// ---------- abandoned-checkout reminders ----------

/** How long after a hold lapses the first reminder goes out. */
export const FIRST_REMINDER_DELAY_MS = 60 * 60_000;
/** No address gets more than this many reminders… */
export const MAX_REMINDERS = 2;
/** …in any window this long, however many checkouts they abandon. */
export const REMINDER_WINDOW_MS = 7 * 24 * 60 * 60_000;

/**
 * Queues the first reminder for a checkout that ended unpaid. Several paths
 * expire a hold (the deadline, the webhook, the cron), so the order remembers
 * that it has been queued.
 */
async function queueCartReminder(ctx: MutationCtx, order: Doc<"orders">) {
  if (!order.email || order.reminderQueued) return;
  await ctx.db.patch("orders", order._id, { reminderQueued: true });
  await ctx.scheduler.runAfter(FIRST_REMINDER_DELAY_MS, internal.emails.cartReminder, {
    orderId: order._id,
    attempt: 1,
  });
}

/**
 * Decides whether a reminder may go out and, if so, records it — in one
 * transaction, so the caps cannot be raced past. Returns what the email
 * needs, or null to send nothing. A reminder is skipped when:
 *
 *   - the order was paid after all, or has no email;
 *   - the person asked for no more reminders;
 *   - they have since started or completed another checkout (they came back);
 *   - none of the pieces can still be bought;
 *   - they have already had two reminders this week, across all checkouts;
 *   - it is the second reminder and the first was never sent.
 */
export const claimCartReminder = internalMutation({
  args: { orderId: v.id("orders"), attempt: v.union(v.literal(1), v.literal(2)) },
  handler: async (ctx, args) => {
    const now = Date.now();
    const order = await ctx.db.get("orders", args.orderId);
    if (!order || !order.email) return null;
    if (order.status !== "expired" && order.status !== "cancelled") return null;

    const contact = await findContact(ctx, order.email);
    if (contact?.remindersOff) return null;

    const forThisOrder = await ctx.db
      .query("cartReminders")
      .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
      .take(MAX_REMINDERS + 1);
    if (forThisOrder.some((sent) => sent.attempt === args.attempt)) return null;
    if (args.attempt === 2 && !forThisOrder.some((sent) => sent.attempt === 1)) return null;

    const recent = await ctx.db
      .query("cartReminders")
      .withIndex("by_email_and_sentAt", (q) =>
        q.eq("email", order.email!).gte("sentAt", now - REMINDER_WINDOW_MS),
      )
      .take(MAX_REMINDERS + 1);
    if (recent.length >= MAX_REMINDERS) return null;

    const theirOrders = await ctx.db
      .query("orders")
      .withIndex("by_email", (q) => q.eq("email", order.email))
      .order("desc")
      .take(50);
    const cameBack = theirOrders.some(
      (other) =>
        other._id !== order._id &&
        other._creationTime > order._creationTime &&
        (SETTLED_STATUSES.has(other.status) ||
          other.status === "refunded" ||
          (other.status === "pending" && other.expiresAt > now)),
    );
    if (cameBack) return null;

    const lines = await itemsForOrder(ctx, order._id);
    const items = [];
    for (const line of lines) {
      const piece = await ctx.db.get("pieces", line.pieceId);
      if (!piece || piece.status !== "published") continue;
      const { paidCount, activeHoldCount } = await countClaims(ctx, piece._id, now);
      const availability = computeAvailability({
        status: piece.status,
        stock: piece.stock,
        paidCount,
        activeHoldCount,
      });
      if (availability.state !== "available") continue;
      items.push({
        title: piece.title,
        priceCents: piece.priceCents,
        slug: piece.slug,
        imageUrl: piece.images[0] ? await ctx.storage.getUrl(piece.images[0]) : null,
      });
    }
    if (items.length === 0) return null;

    await ctx.db.insert("cartReminders", {
      email: order.email,
      orderId: order._id,
      attempt: args.attempt,
      sentAt: now,
    });
    const { token } = await ensureContact(ctx, order.email);

    const settings = await getSettings(ctx);
    let owners: string[] = [];
    if (settings.notifyEmail.trim() !== "") owners = [settings.notifyEmail.trim()];
    else {
      try {
        owners = adminEmails();
      } catch {
        owners = [];
      }
    }
    return { email: order.email, name: order.name, items, token, owners };
  },
});

/**
 * Cron backstop for a hold whose scheduled release never ran. Frees the pieces
 * here, then still asks Stripe to close the session so the abandoned checkout
 * cannot be paid for after someone else buys the piece.
 */
export const expireStaleHolds = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - EXPIRY_GRACE_MS;
    const pending = await ctx.db
      .query("orders")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .take(MAX_ORDERS_PER_STATUS_SWEEP);
    let expired = 0;
    for (const order of pending) {
      if (order.expiresAt < cutoff) {
        await setOrderStatus(ctx, order._id, "expired");
        await queueCartReminder(ctx, order);
        await ctx.scheduler.runAfter(0, internal.checkout.releaseCheckout, {
          orderId: order._id,
        });
        expired += 1;
      }
    }
    return { expired };
  },
});

/** Full order with lines, for the email action and the dashboard. */
export const getWithItems = internalQuery({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get("orders", args.orderId);
    if (!order) return null;
    const items = await itemsForOrder(ctx, args.orderId);
    return { order, items };
  },
});

/**
 * What the success page shows. Keyed by the Stripe session id, which only the
 * buyer's browser is handed, and stripped to what a receipt needs.
 */
export const confirmation = query({
  args: { stripeSessionId: v.string() },
  handler: async (ctx, args) => {
    const order = await findBySession(ctx, args.stripeSessionId);
    if (!order) return null;
    const items = await itemsForOrder(ctx, order._id);
    return {
      orderNumber: order.orderNumber,
      status: order.status,
      email: order.email,
      shippingMethod: order.shippingMethod,
      subtotalCents: order.subtotalCents,
      shippingCents: order.shippingCents,
      taxCents: order.taxCents,
      discountCents: order.discountCents ?? 0,
      totalCents: order.totalCents,
      items: items.map((item) => ({
        title: item.titleSnapshot,
        priceCents: item.priceCents,
      })),
    };
  },
});
