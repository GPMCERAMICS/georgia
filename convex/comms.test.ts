/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test, vi } from "vitest";
import schema from "./schema";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { MAX_REMINDERS } from "./orders";
import { pieceFields } from "./pieces.test";
import { sampleEmails } from "./lib/emailSamples";
import { commissionReceived, trackingUrl } from "./lib/emailTemplates";

const modules = import.meta.glob("./**/*.ts");

const shipTo = {
  name: "Pat Buyer",
  line1: "1 Marsh Rd",
  line2: null,
  city: "Brunswick",
  state: "GA",
  postalCode: "31520",
};

type T = ReturnType<typeof convexTest>;

/** A checkout that was started and then left to lapse, unpaid. */
async function abandonedCheckout(t: T, email: string, slug: string) {
  const pieceId = await t.run(async (ctx) => ctx.db.insert("pieces", pieceFields({ slug })));
  const reserved = await t.mutation(internal.orders.reserve, {
    pieceIds: [pieceId],
    shippingMethod: "ship",
    shipTo,
    email,
  });
  await t.mutation(internal.orders.expireHold, { orderId: reserved.orderId });
  return { pieceId, orderId: reserved.orderId as Id<"orders"> };
}

const claim = (t: T, orderId: Id<"orders">, attempt: 1 | 2) =>
  t.mutation(internal.orders.claimCartReminder, { orderId, attempt });

describe("abandoned-checkout reminders", () => {
  test("the cart's email is kept on the order and a lapsed hold queues one reminder", async () => {
    vi.useFakeTimers();
    const t = convexTest(schema, modules);
    const { orderId } = await abandonedCheckout(t, "Pat@Example.com", "a");
    const order = await t.run(async (ctx) => ctx.db.get("orders", orderId));
    expect(order?.email).toBe("pat@example.com");
    expect(order?.reminderQueued).toBe(true);

    // The webhook for the same session arriving later must not queue another.
    await t.mutation(internal.orders.expireHold, { orderId });
    const scheduled = await t.run(async (ctx) => ctx.db.system.query("_scheduled_functions").collect());
    expect(scheduled.filter((job) => job.name.includes("cartReminder"))).toHaveLength(1);
    vi.useRealTimers();
  });

  test("a reminder carries the pieces that can still be bought", async () => {
    const t = convexTest(schema, modules);
    const { orderId } = await abandonedCheckout(t, "pat@example.com", "kingfisher");
    const first = await claim(t, orderId, 1);
    expect(first?.email).toBe("pat@example.com");
    expect(first?.items.map((item) => item.slug)).toEqual(["kingfisher"]);
    expect(first?.token).toHaveLength(40);
  });

  test("the same reminder is never sent twice, and the second needs the first", async () => {
    const t = convexTest(schema, modules);
    const a = await abandonedCheckout(t, "pat@example.com", "a");
    const b = await abandonedCheckout(t, "sam@example.com", "b");
    expect(await claim(t, b.orderId, 2)).toBeNull();
    expect(await claim(t, a.orderId, 1)).not.toBeNull();
    expect(await claim(t, a.orderId, 1)).toBeNull();
    expect(await claim(t, a.orderId, 2)).not.toBeNull();
  });

  test("someone who keeps abandoning checkouts gets two reminders a week, no more", async () => {
    const t = convexTest(schema, modules);
    const sent = [];
    for (const slug of ["a", "b", "c", "d"]) {
      const { orderId } = await abandonedCheckout(t, "pat@example.com", slug);
      sent.push(await claim(t, orderId, 1));
    }
    expect(sent.filter((result) => result !== null)).toHaveLength(MAX_REMINDERS);
  });

  test("no reminder once the piece has sold to someone else", async () => {
    const t = convexTest(schema, modules);
    const { orderId, pieceId } = await abandonedCheckout(t, "pat@example.com", "a");
    await t.run(async (ctx) => ctx.db.patch("pieces", pieceId, { stock: 0 }));
    expect(await claim(t, orderId, 1)).toBeNull();
  });

  test("no reminder if they came back and started another checkout", async () => {
    const t = convexTest(schema, modules);
    const { orderId } = await abandonedCheckout(t, "pat@example.com", "a");
    const otherPiece = await t.run(async (ctx) => ctx.db.insert("pieces", pieceFields({ slug: "b" })));
    await t.mutation(internal.orders.reserve, {
      pieceIds: [otherPiece],
      shippingMethod: "ship",
      shipTo,
      email: "pat@example.com",
    });
    expect(await claim(t, orderId, 1)).toBeNull();
  });

  test("no reminder after they ask for none", async () => {
    const t = convexTest(schema, modules);
    const first = await abandonedCheckout(t, "pat@example.com", "a");
    const sent = await claim(t, first.orderId, 1);
    await t.mutation(api.newsletter.unsubscribe, { token: sent!.token, kind: "reminders" });
    const second = await abandonedCheckout(t, "pat@example.com", "b");
    expect(await claim(t, second.orderId, 1)).toBeNull();
  });

  test("no reminder for an order that was paid after all", async () => {
    const t = convexTest(schema, modules);
    const { orderId } = await abandonedCheckout(t, "pat@example.com", "a");
    await t.mutation(internal.orders.attachSession, { orderId, stripeSessionId: "cs_late" });
    await t.mutation(internal.orders.markPaid, {
      stripeSessionId: "cs_late",
      stripePaymentIntentId: "pi_late",
      email: null,
      name: null,
      shippingAddress: null,
      shippingCents: 0,
      taxCents: 0,
      totalCents: 18000,
    });
    expect(await claim(t, orderId, 1)).toBeNull();
  });
});

describe("refunds", () => {
  async function paidOrder(t: T) {
    const pieceId = await t.run(async (ctx) => ctx.db.insert("pieces", pieceFields()));
    const reserved = await t.mutation(internal.orders.reserve, {
      pieceIds: [pieceId],
      shippingMethod: "ship",
      shipTo,
      email: "pat@example.com",
    });
    await t.mutation(internal.orders.attachSession, {
      orderId: reserved.orderId,
      stripeSessionId: "cs_refund",
    });
    await t.mutation(internal.orders.markPaid, {
      stripeSessionId: "cs_refund",
      stripePaymentIntentId: "pi_refund",
      email: "pat@example.com",
      name: "Pat Buyer",
      shippingAddress: null,
      shippingCents: 0,
      taxCents: 0,
      totalCents: 18000,
    });
    return reserved.orderId as Id<"orders">;
  }
  const refundJobs = async (t: T) =>
    (await t.run(async (ctx) => ctx.db.system.query("_scheduled_functions").collect())).filter((job) =>
      job.name.includes("orderRefunded"),
    );

  test("a partial refund is recorded and emailed without closing the order", async () => {
    vi.useFakeTimers();
    const t = convexTest(schema, modules);
    const orderId = await paidOrder(t);
    const refund = { stripePaymentIntentId: "pi_refund", amountRefundedCents: 4000, full: false };
    await t.mutation(internal.orders.markRefunded, refund);
    await t.mutation(internal.orders.markRefunded, refund); // Stripe re-delivers

    const order = await t.run(async (ctx) => ctx.db.get("orders", orderId));
    expect(order?.status).toBe("paid");
    expect(order?.refundedCents).toBe(4000);
    const jobs = await refundJobs(t);
    expect(jobs).toHaveLength(1);
    expect(jobs[0].args[0]).toMatchObject({ amountCents: 4000, full: false });
    vi.useRealTimers();
  });

  test("refunding the rest closes the order and emails only the new amount", async () => {
    vi.useFakeTimers();
    const t = convexTest(schema, modules);
    const orderId = await paidOrder(t);
    await t.mutation(internal.orders.markRefunded, {
      stripePaymentIntentId: "pi_refund",
      amountRefundedCents: 4000,
      full: false,
    });
    await t.mutation(internal.orders.markRefunded, {
      stripePaymentIntentId: "pi_refund",
      amountRefundedCents: 18000,
      full: true,
    });
    const order = await t.run(async (ctx) => ctx.db.get("orders", orderId));
    expect(order?.status).toBe("refunded");
    const jobs = await refundJobs(t);
    expect(jobs.map((job) => (job.args[0] as { amountCents: number }).amountCents)).toEqual([4000, 14000]);
    vi.useRealTimers();
  });
});

describe("newsletter", () => {
  test("signing up twice keeps one row and welcomes once", async () => {
    vi.useFakeTimers();
    const t = convexTest(schema, modules);
    await t.mutation(api.newsletter.subscribe, { email: " Pat@Example.com " });
    await t.mutation(api.newsletter.subscribe, { email: "pat@example.com" });
    const contacts = await t.run(async (ctx) => ctx.db.query("contacts").collect());
    expect(contacts).toHaveLength(1);
    expect(contacts[0]).toMatchObject({ email: "pat@example.com", newsletter: true, source: "footer" });
    const jobs = await t.run(async (ctx) => ctx.db.system.query("_scheduled_functions").collect());
    expect(jobs.filter((job) => job.name.includes("newsletterWelcome"))).toHaveLength(1);
    vi.useRealTimers();
  });

  test("rejects something that is not an email address", async () => {
    const t = convexTest(schema, modules);
    await expect(t.mutation(api.newsletter.subscribe, { email: "not-an-email" })).rejects.toThrow(
      "valid email",
    );
  });

  test("the unsubscribe link works, hides the full address, and can be undone", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.newsletter.subscribe, { email: "pat@example.com" });
    const [contact] = await t.run(async (ctx) => ctx.db.query("contacts").collect());

    const before = await t.query(api.newsletter.preferences, { token: contact.token });
    expect(before).toMatchObject({ newsletter: true });
    expect(before?.email).not.toContain("pat@");

    await t.mutation(api.newsletter.unsubscribe, { token: contact.token, kind: "newsletter" });
    expect((await t.query(api.newsletter.preferences, { token: contact.token }))?.newsletter).toBe(false);
    await t.mutation(api.newsletter.resubscribe, { token: contact.token, kind: "newsletter" });
    expect((await t.query(api.newsletter.preferences, { token: contact.token }))?.newsletter).toBe(true);
    expect(await t.query(api.newsletter.preferences, { token: "nope" })).toBeNull();
  });

  test("ticking the box at checkout subscribes only once the order is paid", async () => {
    vi.useFakeTimers();
    const t = convexTest(schema, modules);
    const pieceId = await t.run(async (ctx) => ctx.db.insert("pieces", pieceFields()));
    const reserved = await t.mutation(internal.orders.reserve, {
      pieceIds: [pieceId],
      shippingMethod: "pickup",
      email: "pat@example.com",
      newsletterOptIn: true,
    });
    expect(await t.run(async (ctx) => ctx.db.query("contacts").collect())).toHaveLength(0);

    await t.mutation(internal.orders.attachSession, {
      orderId: reserved.orderId,
      stripeSessionId: "cs_news",
    });
    await t.mutation(internal.orders.markPaid, {
      stripeSessionId: "cs_news",
      stripePaymentIntentId: "pi_news",
      email: "pat@example.com",
      name: "Pat",
      shippingAddress: null,
      shippingCents: 0,
      taxCents: 0,
      totalCents: 18000,
    });
    const contacts = await t.run(async (ctx) => ctx.db.query("contacts").collect());
    expect(contacts[0]).toMatchObject({ email: "pat@example.com", newsletter: true, source: "checkout" });
    vi.useRealTimers();
  });
});

describe("email templates", () => {
  const samples = sampleEmails("https://example.test");

  test("every email has a subject, an HTML version and a plain-text version", () => {
    expect(samples.length).toBeGreaterThanOrEqual(17);
    for (const sample of samples) {
      expect(sample.email.subject.length, sample.id).toBeGreaterThan(5);
      expect(sample.email.html, sample.id).toContain("</html>");
      expect(sample.email.html, sample.id).toContain("GPM Ceramics");
      expect(sample.email.text.length, sample.id).toBeGreaterThan(40);
    }
  });

  test("optional emails carry an unsubscribe link; order emails do not", () => {
    const byId = new Map(samples.map((sample) => [sample.id, sample.email]));
    for (const id of ["reminder-1", "reminder-2", "newsletter-welcome"]) {
      expect(byId.get(id)?.html, id).toContain("/unsubscribe?t=");
      expect(byId.get(id)?.text, id).toContain("/unsubscribe?t=");
    }
    expect(byId.get("confirmation")?.html).not.toContain("/unsubscribe");
  });

  test("customer text is escaped, never injected as HTML", () => {
    const email = commissionReceived({
      siteUrl: "https://example.test",
      name: "<b>Pat</b>",
      email: "pat@example.com",
      type: "",
      budget: "",
      message: '<script>alert("x")</script>',
      pieceTitle: null,
    });
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;");
    expect(email.html).not.toContain("<b>Pat</b>");
  });

  test("tracking links are built for the carriers we recognise", () => {
    expect(trackingUrl("USPS", "9400 1000")).toContain("usps.com");
    expect(trackingUrl("ups ground", "1Z999")).toContain("ups.com");
    expect(trackingUrl("FedEx", "7712")).toContain("fedex.com");
    expect(trackingUrl("Local courier", "123")).toBeNull();
    expect(trackingUrl("USPS", null)).toBeNull();
  });
});
