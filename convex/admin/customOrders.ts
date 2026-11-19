import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { requireAdmin } from "../lib/adminGuard";
import { isEmail, newToken, normalizeEmail } from "../lib/contacts";
import { customOrderTotals, MIN_CHARGE_CENTS } from "../lib/customOrder";
import { ORDER_NUMBER_PREFIX } from "../orders";
import { customOrderLine } from "../schema";
import { ensureSettings } from "../settings";

/**
 * The dashboard's side of custom orders: write one up, send the quote and
 * its deposit, send the final invoice, then ship it.
 */

/** Custom orders shown at once. */
const MAX_CUSTOM_ORDERS = 300;
/** Lines one invoice may carry. */
const MAX_LINES = 30;

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export type AdminCustomOrder = Doc<"customOrders"> & {
  totals: ReturnType<typeof customOrderTotals>;
};

const withTotals = (order: Doc<"customOrders">): AdminCustomOrder => ({
  ...order,
  totals: customOrderTotals(order),
});

export const list = query({
  args: {},
  handler: async (ctx): Promise<AdminCustomOrder[]> => {
    await requireAdmin(ctx);
    const orders = await ctx.db.query("customOrders").order("desc").take(MAX_CUSTOM_ORDERS);
    return orders.map(withTotals);
  },
});

export const get = query({
  args: { id: v.id("customOrders") },
  handler: async (ctx, args): Promise<AdminCustomOrder | null> => {
    await requireAdmin(ctx);
    const order = await ctx.db.get("customOrders", args.id);
    return order ? withTotals(order) : null;
  },
});

/** The custom orders already started from an inquiry, so it can link to them. */
export const forInquiry = query({
  args: { inquiryId: v.id("inquiries") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const orders = await ctx.db
      .query("customOrders")
      .withIndex("by_inquiryId", (q) => q.eq("inquiryId", args.inquiryId))
      .take(10);
    return orders.map((order) => ({ _id: order._id, number: order.number, status: order.status }));
  },
});

/**
 * Starts a draft. From an inquiry it arrives with the customer's name and
 * email filled in and the inquiry moved on to "Quoted".
 */
export const create = mutation({
  args: { inquiryId: v.optional(v.id("inquiries")) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const inquiry = args.inquiryId ? await ctx.db.get("inquiries", args.inquiryId) : null;
    if (args.inquiryId && !inquiry) throw new Error("Inquiry not found");

    const settings = await ensureSettings(ctx);
    const number = `${ORDER_NUMBER_PREFIX}${settings.nextOrderNumber}`;
    await ctx.db.patch("settings", settings._id, {
      nextOrderNumber: settings.nextOrderNumber + 1,
    });

    const id = await ctx.db.insert("customOrders", {
      number,
      token: newToken(),
      status: "draft",
      inquiryId: inquiry?._id ?? null,
      name: inquiry?.name ?? "",
      email: inquiry?.email ?? "",
      title: inquiry?.type ?? "",
      items: [],
      shippingCents: null,
      pickup: false,
      depositCents: 0,
      customerNote: "",
      notes: inquiry ? `From their inquiry:\n${inquiry.message}` : "",
      depositPaidAt: null,
      balancePaidAt: null,
      depositPaidCents: null,
      balancePaidCents: null,
      depositPaymentIntentId: null,
      balancePaymentIntentId: null,
      shippingAddress: null,
      shippedAt: null,
      deliveredAt: null,
      carrier: null,
      trackingNumber: null,
    });
    if (inquiry && (inquiry.status === "new" || inquiry.status === "replied")) {
      await ctx.db.patch("inquiries", inquiry._id, { status: "quoted" });
    }
    return id;
  },
});

const editable = {
  name: v.string(),
  email: v.string(),
  title: v.string(),
  items: v.array(customOrderLine),
  shippingCents: v.union(v.number(), v.null()),
  pickup: v.boolean(),
  depositCents: v.number(),
  customerNote: v.string(),
  notes: v.string(),
};

const wholeCents = (n: number) => Number.isInteger(n) && n >= 0;

/**
 * Saves the invoice. What can change narrows as money comes in: once the
 * deposit is paid its amount is fixed, and once the balance is paid the
 * invoice is closed (private notes aside).
 */
export const update = mutation({
  args: { id: v.id("customOrders"), ...editable },
  handler: async (ctx, { id, ...fields }) => {
    await requireAdmin(ctx);
    const order = await ctx.db.get("customOrders", id);
    if (!order) throw new Error("Custom order not found");

    if (order.balancePaidAt !== null || order.status === "cancelled") {
      await ctx.db.patch("customOrders", id, { notes: fields.notes.slice(0, 5000) });
      return null;
    }

    if (fields.items.length > MAX_LINES) {
      throw new Error(`An invoice can have at most ${MAX_LINES} lines`);
    }
    const items = fields.items
      .map((item) => ({ description: item.description.trim().slice(0, 200), amountCents: item.amountCents }))
      .filter((item) => item.description !== "" || item.amountCents !== 0);
    for (const item of items) {
      if (item.description === "") throw new Error("Every line needs a description");
      if (!wholeCents(item.amountCents)) throw new Error("Line amounts must be zero or more");
    }
    if (fields.shippingCents !== null && !wholeCents(fields.shippingCents)) {
      throw new Error("Shipping must be zero or more");
    }
    if (!wholeCents(fields.depositCents)) throw new Error("The deposit must be zero or more");
    const subtotal = items.reduce((sum, item) => sum + item.amountCents, 0);
    if (fields.depositCents > subtotal) {
      throw new Error("The deposit cannot be more than the items come to");
    }
    const email = normalizeEmail(fields.email);
    if (email !== "" && !isEmail(email)) throw new Error("Enter a valid email address");
    if (order.depositPaidAt !== null && fields.depositCents !== order.depositCents) {
      throw new Error("The deposit has been paid, so its amount cannot change");
    }

    await ctx.db.patch("customOrders", id, {
      name: fields.name.trim().slice(0, 200),
      email,
      title: fields.title.trim().slice(0, 200),
      items,
      shippingCents: fields.pickup ? null : fields.shippingCents,
      pickup: fields.pickup,
      depositCents: fields.depositCents,
      customerNote: fields.customerNote.trim().slice(0, 2000),
      notes: fields.notes.slice(0, 5000),
    });
    return null;
  },
});

/** What must be true before anything is sent to the customer. */
function assertSendable(order: Doc<"customOrders">) {
  if (order.name.trim() === "") throw new Error("Add the customer's name first");
  if (!isEmail(order.email)) throw new Error("Add the customer's email address first");
  if (order.title.trim() === "") throw new Error("Say what is being made first");
  if (order.items.length === 0) throw new Error("Add at least one line to the invoice first");
}

/**
 * Sends the quote and asks for the deposit. With no deposit set, the work
 * simply starts: there is nothing to pay yet.
 */
export const sendDepositInvoice = mutation({
  args: { id: v.id("customOrders") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const order = await ctx.db.get("customOrders", args.id);
    if (!order) throw new Error("Custom order not found");
    if (order.status !== "draft" && order.status !== "depositDue") {
      throw new Error("The deposit has already been dealt with on this order");
    }
    assertSendable(order);
    const { depositCents } = customOrderTotals(order);
    if (depositCents === 0) {
      await ctx.db.patch("customOrders", order._id, { status: "inProgress", depositPaidAt: Date.now(), depositPaidCents: 0 });
      return { sent: false };
    }
    if (depositCents < MIN_CHARGE_CENTS) {
      throw new Error(`A deposit must be at least ${money(MIN_CHARGE_CENTS)} to be paid by card`);
    }
    await ctx.db.patch("customOrders", order._id, { status: "depositDue" });
    await ctx.scheduler.runAfter(0, internal.emails.customOrderInvoice, {
      id: order._id,
      stage: "deposit",
    });
    return { sent: true };
  },
});

/**
 * The piece is finished: sends the invoice for the balance and shipping.
 * Shipping has to be quoted by now, because this is the last payment.
 */
export const sendFinalInvoice = mutation({
  args: { id: v.id("customOrders") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const order = await ctx.db.get("customOrders", args.id);
    if (!order) throw new Error("Custom order not found");
    if (order.status !== "inProgress" && order.status !== "balanceDue") {
      throw new Error("The final invoice can be sent once the deposit is paid");
    }
    assertSendable(order);
    const totals = customOrderTotals(order);
    if (totals.shippingPending) {
      throw new Error("Add the shipping cost first, or mark the order as local pickup");
    }
    if (totals.balanceCents === 0) {
      await ctx.db.patch("customOrders", order._id, { status: "paid", balancePaidAt: Date.now(), balancePaidCents: 0 });
      return { sent: false };
    }
    if (totals.balanceCents < MIN_CHARGE_CENTS) {
      throw new Error(`The balance must be at least ${money(MIN_CHARGE_CENTS)} to be paid by card`);
    }
    await ctx.db.patch("customOrders", order._id, { status: "balanceDue" });
    await ctx.scheduler.runAfter(0, internal.emails.customOrderInvoice, {
      id: order._id,
      stage: "balance",
    });
    return { sent: true };
  },
});

/**
 * For a deposit or balance paid some other way — cash, a cheque, a bank
 * transfer. Moves the order on exactly as a card payment would, without
 * emailing the customer a receipt for something they handed over in person.
 */
export const recordPayment = mutation({
  args: { id: v.id("customOrders"), stage: v.union(v.literal("deposit"), v.literal("balance")) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const order = await ctx.db.get("customOrders", args.id);
    if (!order) throw new Error("Custom order not found");
    const totals = customOrderTotals(order);
    if (args.stage === "deposit" && order.status !== "depositDue" && order.status !== "draft") {
      throw new Error("The deposit has already been dealt with on this order");
    }
    if (args.stage === "balance") {
      if (order.status !== "balanceDue" && order.status !== "inProgress") {
        throw new Error("The balance cannot be recorded at this stage");
      }
      if (totals.shippingPending) {
        throw new Error("Add the shipping cost first, or mark the order as local pickup");
      }
    }
    await ctx.runMutation(internal.customOrders.markStagePaid, {
      id: order._id,
      stage: args.stage,
      paymentIntentId: null,
      paidCents: args.stage === "deposit" ? totals.depositCents : totals.balanceCents,
      shippingAddress: null,
      notify: false,
    });
    return null;
  },
});

async function paidOrder(ctx: MutationCtx, id: Doc<"customOrders">["_id"], from: Doc<"customOrders">["status"]) {
  const order = await ctx.db.get("customOrders", id);
  if (!order) throw new Error("Custom order not found");
  if (order.status !== from) {
    throw new Error(
      from === "paid"
        ? "Only an order that is paid in full can be shipped"
        : "Only a shipped order can be marked delivered",
    );
  }
  return order;
}

/** Shipped, or ready for pickup. Emails the customer either way. */
export const markShipped = mutation({
  args: { id: v.id("customOrders"), carrier: v.string(), trackingNumber: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const order = await paidOrder(ctx, args.id, "paid");
    await ctx.db.patch("customOrders", order._id, {
      status: "shipped",
      shippedAt: Date.now(),
      carrier: order.pickup ? null : args.carrier.trim() || null,
      trackingNumber: order.pickup ? null : args.trackingNumber.trim() || null,
    });
    await ctx.scheduler.runAfter(0, internal.emails.customOrderUpdate, {
      id: order._id,
      event: "shipped",
    });
    return null;
  },
});

export const markDelivered = mutation({
  args: { id: v.id("customOrders") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const order = await paidOrder(ctx, args.id, "shipped");
    await ctx.db.patch("customOrders", order._id, { status: "delivered", deliveredAt: Date.now() });
    await ctx.scheduler.runAfter(0, internal.emails.customOrderUpdate, {
      id: order._id,
      event: "delivered",
    });
    return null;
  },
});

/**
 * Calls the order off. Its invoice link stops taking payment. Money already
 * paid is not returned by this: refund it in Stripe.
 */
export const cancel = mutation({
  args: { id: v.id("customOrders") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const order = await ctx.db.get("customOrders", args.id);
    if (!order) throw new Error("Custom order not found");
    if (order.status === "shipped" || order.status === "delivered") {
      throw new Error("This order has already gone out");
    }
    await ctx.db.patch("customOrders", order._id, { status: "cancelled" });
    return null;
  },
});

/** Drafts only: nothing has been sent, so nothing is lost. */
export const remove = mutation({
  args: { id: v.id("customOrders") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const order = await ctx.db.get("customOrders", args.id);
    if (!order) return null;
    if (order.status !== "draft") throw new Error("Only a draft can be deleted. Cancel it instead.");
    await ctx.db.delete("customOrders", order._id);
    return null;
  },
});
