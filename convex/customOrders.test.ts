/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test, vi } from "vitest";
import schema from "./schema";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { customOrderTotals } from "./lib/customOrder";
import { sampleEmails } from "./lib/emailSamples";
import { buildInvoicePdf, pdfSafe } from "./lib/invoicePdf";

const modules = import.meta.glob("./**/*.ts");
type T = ReturnType<typeof convexTest>;
const ADMIN_EMAIL = "georgia@example.com";

async function asAdmin(t: T) {
  process.env.ADMIN_EMAIL = ADMIN_EMAIL;
  const userId = await t.run(async (ctx) => ctx.db.insert("users", { email: ADMIN_EMAIL }));
  return t.withIdentity({ subject: `${userId}|session` });
}

const totem = {
  name: "Jordan Ellis",
  email: "Jordan@Example.com",
  title: "Garden totem, five pieces",
  items: [
    { description: "Garden totem, five pieces", amountCents: 45000 },
    { description: "Steel base and rod", amountCents: 5000 },
  ],
  shippingCents: null,
  pickup: false,
  depositCents: 20000,
  customerNote: "Ready in about six weeks.",
  notes: "",
};

async function draft(t: T, admin: Awaited<ReturnType<typeof asAdmin>>, fields = totem) {
  const id = await admin.mutation(api.admin.customOrders.create, {});
  await admin.mutation(api.admin.customOrders.update, { id, ...fields });
  const order = await t.run(async (ctx) => ctx.db.get("customOrders", id));
  return { id, token: order!.token };
}

const emailJobs = async (t: T) =>
  (await t.run(async (ctx) => ctx.db.system.query("_scheduled_functions").collect()))
    .filter((job) => job.name.includes("customOrder"))
    .map((job) => {
      const args = job.args[0] as { stage?: string; event?: string };
      return `${job.name.replace(/^emails(\.js)?:/, "")}:${args.stage ?? args.event}`;
    });

const paid = (t: T, id: Id<"customOrders">, stage: "deposit" | "balance", paidCents: number) =>
  t.mutation(internal.customOrders.markStagePaid, {
    id,
    stage,
    paymentIntentId: `pi_${stage}`,
    paidCents,
    shippingAddress:
      stage === "balance"
        ? { line1: "1 Marsh Rd", line2: null, city: "Brunswick", state: "GA", postalCode: "31520", country: "US" }
        : null,
    notify: true,
  });

describe("custom order sums", () => {
  const base = { ...totem, depositPaidAt: null, balancePaidAt: null };
  test("before shipping is quoted the balance is the items less the deposit", () => {
    expect(customOrderTotals(base)).toMatchObject({
      subtotalCents: 50000,
      shippingPending: true,
      totalCents: 50000,
      depositCents: 20000,
      balanceCents: 30000,
      dueCents: 50000,
    });
  });
  test("shipping is added to the balance, never to the deposit", () => {
    expect(customOrderTotals({ ...base, shippingCents: 6500, depositPaidAt: 1 })).toMatchObject({
      shippingPending: false,
      totalCents: 56500,
      depositCents: 20000,
      balanceCents: 36500,
      paidCents: 20000,
      dueCents: 36500,
    });
  });
  test("pickup has no shipping to quote", () => {
    expect(customOrderTotals({ ...base, pickup: true, shippingCents: 6500 })).toMatchObject({
      shippingPending: false,
      shippingCents: 0,
      totalCents: 50000,
    });
  });
});

describe("a custom order from quote to delivery", () => {
  test("deposit invoice, deposit, final invoice with shipping, balance, shipped, delivered", async () => {
    vi.useFakeTimers();
    const t = convexTest(schema, modules);
    const admin = await asAdmin(t);
    const { id, token } = await draft(t, admin);

    // A draft has not been sent, so its link shows nothing.
    expect(await t.query(api.customOrders.invoice, { token })).toBeNull();

    await admin.mutation(api.admin.customOrders.sendDepositInvoice, { id });
    let invoice = await t.query(api.customOrders.invoice, { token });
    expect(invoice).toMatchObject({ status: "depositDue", payable: "deposit", name: "Jordan Ellis" });
    expect(invoice?.totals.depositCents).toBe(20000);
    // The public invoice never carries private notes or the customer's email.
    expect(JSON.stringify(invoice)).not.toContain("example.com");

    await paid(t, id, "deposit", 20000);
    await paid(t, id, "deposit", 20000); // Stripe retries the webhook
    invoice = await t.query(api.customOrders.invoice, { token });
    expect(invoice).toMatchObject({ status: "inProgress", payable: null });

    // The final invoice cannot go out until shipping is quoted.
    await expect(admin.mutation(api.admin.customOrders.sendFinalInvoice, { id })).rejects.toThrow(
      "shipping cost",
    );
    // The deposit is fixed once paid; everything else can still change.
    await expect(
      admin.mutation(api.admin.customOrders.update, { id, ...totem, depositCents: 10000 }),
    ).rejects.toThrow("deposit has been paid");
    await admin.mutation(api.admin.customOrders.update, { id, ...totem, shippingCents: 6500 });
    await admin.mutation(api.admin.customOrders.sendFinalInvoice, { id });
    invoice = await t.query(api.customOrders.invoice, { token });
    expect(invoice).toMatchObject({ status: "balanceDue", payable: "balance" });
    expect(invoice?.totals.balanceCents).toBe(36500);

    await expect(
      admin.mutation(api.admin.customOrders.markShipped, { id, carrier: "UPS", trackingNumber: "1Z" }),
    ).rejects.toThrow("paid in full");
    await paid(t, id, "balance", 36500);
    await admin.mutation(api.admin.customOrders.markShipped, { id, carrier: "UPS", trackingNumber: "1Z" });
    await admin.mutation(api.admin.customOrders.markDelivered, { id });

    const order = await t.run(async (ctx) => ctx.db.get("customOrders", id));
    expect(order).toMatchObject({
      status: "delivered",
      email: "jordan@example.com",
      depositPaidCents: 20000,
      balancePaidCents: 36500,
      trackingNumber: "1Z",
    });
    expect(order?.shippingAddress?.city).toBe("Brunswick");
    expect(await emailJobs(t)).toEqual([
      "customOrderInvoice:deposit",
      "customOrderPaid:deposit",
      "customOrderInvoice:balance",
      "customOrderPaid:balance",
      "customOrderUpdate:shipped",
      "customOrderUpdate:delivered",
    ]);
    vi.useRealTimers();
  });

  test("a payment taken in person moves the order on without emailing a receipt", async () => {
    vi.useFakeTimers();
    const t = convexTest(schema, modules);
    const admin = await asAdmin(t);
    const { id } = await draft(t, admin, { ...totem, pickup: true });
    await admin.mutation(api.admin.customOrders.sendDepositInvoice, { id });
    await admin.mutation(api.admin.customOrders.recordPayment, { id, stage: "deposit" });
    await admin.mutation(api.admin.customOrders.recordPayment, { id, stage: "balance" });
    const order = await t.run(async (ctx) => ctx.db.get("customOrders", id));
    expect(order).toMatchObject({ status: "paid", balancePaidCents: 30000 });
    expect(await emailJobs(t)).toEqual(["customOrderInvoice:deposit"]);
    vi.useRealTimers();
  });

  test("nothing can be sent until the invoice is complete", async () => {
    const t = convexTest(schema, modules);
    const admin = await asAdmin(t);
    const id = await admin.mutation(api.admin.customOrders.create, {});
    await expect(admin.mutation(api.admin.customOrders.sendDepositInvoice, { id })).rejects.toThrow("name");
    await admin.mutation(api.admin.customOrders.update, { id, ...totem, items: [], depositCents: 0 });
    await expect(admin.mutation(api.admin.customOrders.sendDepositInvoice, { id })).rejects.toThrow(
      "at least one line",
    );
    await expect(
      admin.mutation(api.admin.customOrders.update, { id, ...totem, depositCents: 99999 }),
    ).rejects.toThrow("cannot be more");
  });

  test("starting from an inquiry carries the customer over and marks it quoted", async () => {
    const t = convexTest(schema, modules);
    const admin = await asAdmin(t);
    const inquiryId = await t.run(async (ctx) =>
      ctx.db.insert("inquiries", {
        name: "Jordan Ellis",
        email: "jordan@example.com",
        type: "Garden totem",
        budget: "$500",
        message: "A totem for the front garden.",
        status: "new",
        notes: "",
        pieceId: null,
      }),
    );
    const id = await admin.mutation(api.admin.customOrders.create, { inquiryId });
    const order = await t.run(async (ctx) => ctx.db.get("customOrders", id));
    expect(order).toMatchObject({ name: "Jordan Ellis", email: "jordan@example.com", status: "draft" });
    expect(order?.notes).toContain("front garden");
    expect((await t.run(async (ctx) => ctx.db.get("inquiries", inquiryId)))?.status).toBe("quoted");
    expect(await admin.query(api.admin.customOrders.forInquiry, { inquiryId })).toHaveLength(1);
  });

  test("a cancelled order's invoice stops taking payment; only drafts can be deleted", async () => {
    const t = convexTest(schema, modules);
    const admin = await asAdmin(t);
    const { id, token } = await draft(t, admin);
    await admin.mutation(api.admin.customOrders.sendDepositInvoice, { id });
    await expect(admin.mutation(api.admin.customOrders.remove, { id })).rejects.toThrow("Only a draft");
    await admin.mutation(api.admin.customOrders.cancel, { id });
    expect(await t.query(api.customOrders.invoice, { token })).toMatchObject({
      status: "cancelled",
      payable: null,
    });
  });

  test("the dashboard's functions are closed to everyone but an admin", async () => {
    const t = convexTest(schema, modules);
    process.env.ADMIN_EMAIL = ADMIN_EMAIL;
    await expect(t.query(api.admin.customOrders.list, {})).rejects.toThrow("Not authorised");
    await expect(t.mutation(api.admin.customOrders.create, {})).rejects.toThrow("Not authorised");
  });
});

describe("custom order emails", () => {
  test("the samples cover the quote, both receipts and the final invoice", () => {
    const ids = sampleEmails("https://example.test").map((sample) => sample.id);
    for (const id of ["custom-deposit", "custom-deposit-paid", "custom-final", "custom-paid", "owner-custom-paid"]) {
      expect(ids, id).toContain(id);
    }
  });
});

describe("refunding a custom order", () => {
  async function depositPaidOrder(t: T) {
    const admin = await asAdmin(t);
    const { id, token } = await draft(t, admin);
    await admin.mutation(api.admin.customOrders.sendDepositInvoice, { id });
    await paid(t, id, "deposit", 20000);
    return { admin, id, token };
  }
  const refundJobs = async (t: T) =>
    (await t.run(async (ctx) => ctx.db.system.query("_scheduled_functions").collect()))
      .filter((job) => job.name.includes("customOrderRefunded"))
      .map((job) => job.args[0] as { amountCents: number; full: boolean });

  test("part of the deposit, then the rest, each emailed once", async () => {
    vi.useFakeTimers();
    const t = convexTest(schema, modules);
    const { id, token } = await depositPaidOrder(t);

    await t.mutation(internal.customOrders.recordRefund, {
      id,
      stage: "deposit",
      refundedCents: 5000,
      cancelOrder: false,
    });
    // Stripe's webhook for the same refund must not email a second time.
    await t.mutation(internal.customOrders.markRefundedByIntent, {
      paymentIntentId: "pi_deposit",
      amountRefundedCents: 5000,
    });
    expect((await t.run(async (ctx) => ctx.db.get("customOrders", id)))?.status).toBe("inProgress");

    await t.mutation(internal.customOrders.recordRefund, {
      id,
      stage: "deposit",
      refundedCents: 20000,
      cancelOrder: true,
    });
    const order = await t.run(async (ctx) => ctx.db.get("customOrders", id));
    expect(order).toMatchObject({ status: "cancelled", depositRefundedCents: 20000 });
    expect(await refundJobs(t)).toEqual([
      { id, amountCents: 5000, full: false },
      { id, amountCents: 15000, full: true },
    ]);
    // The customer's invoice shows the money back and takes no more payment.
    expect(await t.query(api.customOrders.invoice, { token })).toMatchObject({
      refundedCents: 20000,
      payable: null,
    });
    vi.useRealTimers();
  });

  test("a refund made in Stripe is picked up for either payment", async () => {
    vi.useFakeTimers();
    const t = convexTest(schema, modules);
    const { admin, id } = await depositPaidOrder(t);
    await admin.mutation(api.admin.customOrders.update, { id, ...totem, shippingCents: 6500 });
    await admin.mutation(api.admin.customOrders.sendFinalInvoice, { id });
    await paid(t, id, "balance", 36500);

    await t.mutation(internal.customOrders.markRefundedByIntent, {
      paymentIntentId: "pi_balance",
      amountRefundedCents: 6500,
    });
    const order = await t.run(async (ctx) => ctx.db.get("customOrders", id));
    expect(order).toMatchObject({ status: "paid", balanceRefundedCents: 6500 });
    expect(order?.depositRefundedCents).toBeUndefined();
    expect(await refundJobs(t)).toEqual([{ id, amountCents: 6500, full: false }]);
    expect(
      await t.mutation(internal.customOrders.markRefundedByIntent, {
        paymentIntentId: "pi_unknown",
        amountRefundedCents: 100,
      }),
    ).toBeNull();
    vi.useRealTimers();
  });

  test("the refund action is admin-only, and a payment recorded by hand cannot be refunded by card", async () => {
    const t = convexTest(schema, modules);
    const admin = await asAdmin(t);
    const { id } = await draft(t, admin);
    await admin.mutation(api.admin.customOrders.recordPayment, { id, stage: "deposit" });
    const args = { id, stage: "deposit" as const, amountCents: 1000, cancelOrder: false };
    await expect(t.action(api.admin.refunds.refundCustom, args)).rejects.toThrow("Not authorised");
    await expect(admin.action(api.admin.refunds.refundCustom, args)).rejects.toThrow(
      "not taken by card",
    );
  });
});

describe("the invoice PDF", () => {
  const sample = sampleEmails("https://example.test").find((s) => s.id === "custom-deposit")!;

  test("the custom order emails that should carry a PDF say what to build it from", () => {
    const withInvoice = sampleEmails("https://example.test").filter((s) => s.invoice);
    expect(withInvoice.map((s) => s.id)).toEqual([
      "custom-deposit",
      "custom-deposit-paid",
      "custom-final",
      "custom-paid",
    ]);
  });

  test("renders a real PDF, even with characters the built-in typefaces lack", async () => {
    const bytes = await buildInvoicePdf(
      { ...sample.invoice!.data, name: "Zoë “Quotes” 北京 ✓", title: "A piece — with dashes…" },
      "deposit",
      Date.UTC(2026, 10, 19),
    );
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
    expect(bytes.length).toBeGreaterThan(5000);
    expect(pdfSafe("北京 “x” ✓")).toBe('?? "x" ?');
  });

  test("the render action returns it base64-encoded for the email", async () => {
    const t = convexTest(schema, modules);
    const base64 = await t.action(internal.invoicePdf.render, {
      data: sample.invoice!.data,
      stage: "deposit",
      issuedAt: Date.UTC(2026, 10, 19),
    });
    expect(atob(base64).startsWith("%PDF-")).toBe(true);
  });
});
