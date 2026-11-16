/**
 * One made-up example of every email the shop can send, for the "send me
 * the samples" button and the review page. The data is invented; the
 * templates are the real ones.
 */
import * as templates from "./emailTemplates";
import type { Email, InquiryData, OrderData } from "./emailTemplates";

export type Sample = {
  id: string;
  /** Short name, e.g. "Order confirmation — local pickup". */
  label: string;
  /** What makes the site send it. */
  trigger: string;
  /** Who receives it. */
  audience: string;
  /** Present when this email did not exist before this round of work. */
  isNew: boolean;
  email: Email;
};

export type SampleImages = { plate: string; platter: string; totem: string };

/** Photos already on the site, so samples show real work. */
export const SITE_SAMPLE_IMAGES: SampleImages = {
  plate: "/wildlife-kingfisher.png",
  platter: "/wildlife-fish-platter.png",
  totem: "/wildlife-owl.png",
};

export function sampleEmails(siteUrl: string, images: SampleImages = SITE_SAMPLE_IMAGES): Sample[] {
  const kingfisher = { title: "The Kingfisher Plate", priceCents: 8000, imageUrl: images.plate, note: null };
  const platter = { title: "Sardine Fish Serving Platter", priceCents: 12500, imageUrl: images.platter, note: null };
  const madeToOrder = {
    title: "Great Horned Owl Plate",
    priceCents: 11000,
    imageUrl: images.totem,
    note: "Made to order — ships in about 3 weeks",
  };

  const base: OrderData = {
    siteUrl,
    orderNumber: "GP-1042",
    name: "Pat Morgan",
    email: "pat@example.com",
    items: [kingfisher, platter],
    subtotalCents: 20500,
    discountCents: 0,
    shippingCents: 0,
    taxCents: 0,
    totalCents: 20500,
    shippingMethod: "ship",
    addressLines: ["Pat Morgan", "128 Live Oak Lane", "Savannah, GA 31401"],
    pickupLabel: "Local pickup (St. Marys, GA)",
    pickupInstructions: "I will email you to arrange a pickup time once your order is ready.",
    carrier: null,
    trackingNumber: null,
  };
  const withPromo: OrderData = { ...base, discountCents: 2050, totalCents: 18450 };
  const pickup: OrderData = {
    ...base,
    orderNumber: "GP-1043",
    items: [kingfisher],
    subtotalCents: 8000,
    totalCents: 8000,
    shippingMethod: "pickup",
    addressLines: null,
  };
  const custom: OrderData = {
    ...base,
    orderNumber: "GP-1044",
    items: [madeToOrder],
    subtotalCents: 11000,
    totalCents: 11000,
  };
  const shipped: OrderData = { ...base, carrier: "USPS", trackingNumber: "9400 1000 0000 0000 0000 00" };
  const retracked: OrderData = { ...base, carrier: "UPS", trackingNumber: "1Z999AA10123456784" };

  const inquiry: InquiryData = {
    siteUrl,
    name: "Jordan Ellis",
    email: "jordan@example.com",
    type: "Heirloom / commemorative piece",
    budget: "$300–$400",
    message:
      "We are celebrating my parents' 40th anniversary in June and would love a platter with their names, the date, and the house they have lived in since 1986. Is that something you could do in time?",
    pieceTitle: "Anniversary Portrait Platter",
  };

  const reminderItems = [{ title: kingfisher.title, priceCents: kingfisher.priceCents, imageUrl: images.plate, slug: "the-kingfisher" }];
  const unsubscribeReminders = `${siteUrl}/unsubscribe?t=sample&k=reminders`;

  return [
    {
      id: "confirmation",
      label: "Order confirmation",
      trigger: "A payment succeeds. This example includes a promo code.",
      audience: "Customer",
      isNew: false,
      email: templates.orderConfirmation(withPromo),
    },
    {
      id: "confirmation-pickup",
      label: "Order confirmation — local pickup",
      trigger: "A payment succeeds on an order set for local pickup.",
      audience: "Customer",
      isNew: false,
      email: templates.orderConfirmation(pickup),
    },
    {
      id: "confirmation-made-to-order",
      label: "Order confirmation — made to order",
      trigger: "A payment succeeds on an order that includes a made-to-order piece.",
      audience: "Customer",
      isNew: true,
      email: templates.orderConfirmation(custom),
    },
    {
      id: "owner-new-order",
      label: "New order",
      trigger: "A payment succeeds.",
      audience: "Owner",
      isNew: false,
      email: templates.newOrderForOwner(withPromo),
    },
    {
      id: "shipped",
      label: "Order shipped",
      trigger: "The order is marked shipped in the dashboard.",
      audience: "Customer, with a copy to the owner",
      isNew: false,
      email: templates.orderShipped(shipped),
    },
    {
      id: "tracking-updated",
      label: "Tracking updated",
      trigger: "The carrier or tracking number is changed on an order already shipped.",
      audience: "Customer, with a copy to the owner",
      isNew: true,
      email: templates.shippingUpdate(retracked),
    },
    {
      id: "pickup-ready",
      label: "Ready for pickup",
      trigger: "A pickup order is marked ready in the dashboard.",
      audience: "Customer, with a copy to the owner",
      isNew: true,
      email: templates.pickupReady(pickup),
    },
    {
      id: "delivered",
      label: "Order delivered",
      trigger: "A shipped order is marked delivered in the dashboard.",
      audience: "Customer, with a copy to the owner",
      isNew: true,
      email: templates.orderDelivered(shipped),
    },
    {
      id: "collected",
      label: "Order collected",
      trigger: "A pickup order is marked picked up in the dashboard.",
      audience: "Customer, with a copy to the owner",
      isNew: true,
      email: templates.orderDelivered(pickup),
    },
    {
      id: "refund-full",
      label: "Refund — full",
      trigger: "The whole order is refunded in Stripe.",
      audience: "Customer, with a copy to the owner",
      isNew: true,
      email: templates.orderRefunded(base, { amountCents: 20500, full: true }),
    },
    {
      id: "refund-partial",
      label: "Refund — partial",
      trigger: "Part of the order is refunded in Stripe.",
      audience: "Customer, with a copy to the owner",
      isNew: true,
      email: templates.orderRefunded(base, { amountCents: 4000, full: false }),
    },
    {
      id: "reminder-1",
      label: "Checkout reminder — first",
      trigger: "One hour after a checkout is abandoned, if the piece is still for sale.",
      audience: "Customer, with a copy to the owner",
      isNew: true,
      email: templates.cartReminder({
        siteUrl,
        name: "Pat Morgan",
        items: reminderItems,
        attempt: 1,
        unsubscribeUrl: unsubscribeReminders,
      }),
    },
    {
      id: "reminder-2",
      label: "Checkout reminder — last",
      trigger: "A day after the first reminder, if the piece is still for sale and they have not come back.",
      audience: "Customer, with a copy to the owner",
      isNew: true,
      email: templates.cartReminder({
        siteUrl,
        name: "Pat Morgan",
        items: reminderItems,
        attempt: 2,
        unsubscribeUrl: unsubscribeReminders,
      }),
    },
    {
      id: "commission-received",
      label: "Commission request received",
      trigger: "Someone submits the commission form.",
      audience: "The person who sent it",
      isNew: true,
      email: templates.commissionReceived(inquiry),
    },
    {
      id: "owner-commission",
      label: "New commission inquiry",
      trigger: "Someone submits the commission form.",
      audience: "Owner",
      isNew: false,
      email: templates.commissionForOwner(inquiry),
    },
    {
      id: "newsletter-welcome",
      label: "Newsletter welcome",
      trigger: "Someone joins the newsletter, from the site or by ticking the box at checkout. Sent once per address.",
      audience: "New subscriber",
      isNew: true,
      email: templates.newsletterWelcome({
        siteUrl,
        unsubscribeUrl: `${siteUrl}/unsubscribe?t=sample&k=newsletter`,
      }),
    },
    {
      id: "reset-code",
      label: "Dashboard reset code",
      trigger: "An admin asks to reset their dashboard password.",
      audience: "Admin",
      isNew: false,
      email: templates.resetCode({ siteUrl, code: "48291735" }),
    },
  ];
}
