/**
 * Every email the shop sends, as pure functions from data to
 * `{ subject, html, text }`.
 *
 * Pure on purpose: the same functions produce the real emails (see
 * `emails.ts`), the samples sent from the dashboard, and the review page —
 * so what is approved is exactly what goes out.
 *
 * Email clients ignore stylesheets and web fonts, so everything is tables
 * with inline styles and system typefaces; the wordmark is an image.
 */

export const BRAND = "GPM Ceramics";
export const MAKER = "Georgia";
const NAVY = "#16223a";
const INK = "#1c1d22";
const MUTED = "#6b6e76";
const RULE = "#e3e4e8";
const BAND = "#f0f1f3";
const SERIF = "Georgia, 'Times New Roman', Times, serif";
const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

export type Email = { subject: string; html: string; text: string };

export type OrderLine = {
  title: string;
  priceCents: number;
  imageUrl: string | null;
  /** e.g. "Made to order — ships in about 3 weeks". */
  note: string | null;
};

export type OrderData = {
  siteUrl: string;
  orderNumber: string;
  name: string | null;
  email: string | null;
  items: OrderLine[];
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  shippingMethod: "ship" | "pickup";
  /** Street, city/state/ZIP lines. Null for pickup. */
  addressLines: string[] | null;
  pickupLabel: string;
  pickupInstructions: string;
  carrier: string | null;
  trackingNumber: string | null;
};

// ---------- small helpers ----------

export const money = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

export function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const firstName = (name: string | null) => name?.trim().split(/\s+/)[0] || "there";

/** A carrier's tracking page, when the carrier is one we recognise. */
export function trackingUrl(carrier: string | null, trackingNumber: string | null): string | null {
  if (!trackingNumber) return null;
  const number = encodeURIComponent(trackingNumber.replace(/\s+/g, ""));
  const name = (carrier ?? "").toLowerCase();
  if (name.includes("usps") || name.includes("postal")) {
    return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${number}`;
  }
  if (name.includes("ups")) return `https://www.ups.com/track?tracknum=${number}`;
  if (name.includes("fedex")) return `https://www.fedex.com/fedextrack/?trknbr=${number}`;
  return null;
}

// ---------- building blocks ----------

const p = (html: string) =>
  `<p style="margin:0 0 16px;font-family:${SANS};font-size:16px;line-height:1.6;color:${INK};">${html}</p>`;

const small = (html: string) =>
  `<p style="margin:0 0 12px;font-family:${SANS};font-size:13px;line-height:1.6;color:${MUTED};">${html}</p>`;

const heading = (text: string) =>
  `<h1 style="margin:0 0 20px;font-family:${SERIF};font-size:28px;line-height:1.25;font-weight:normal;color:${INK};">${esc(text)}</h1>`;

const subheading = (text: string) =>
  `<h2 style="margin:28px 0 12px;font-family:${SERIF};font-size:19px;line-height:1.3;font-weight:normal;color:${INK};">${esc(text)}</h2>`;

const link = (href: string, label: string) =>
  `<a href="${esc(href)}" style="color:${NAVY};text-decoration:underline;">${esc(label)}</a>`;

const button = (href: string, label: string) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;"><tr><td bgcolor="${NAVY}" style="background:${NAVY};"><a href="${esc(href)}" style="display:inline-block;padding:14px 30px;font-family:${SANS};font-size:15px;font-weight:600;letter-spacing:0.02em;color:#ffffff;text-decoration:none;">${esc(label)}</a></td></tr></table>`;

const rule = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-top:1px solid ${RULE};font-size:0;line-height:0;height:1px;">&nbsp;</td></tr></table>`;

/** A boxed note: an address, tracking details, pickup instructions. */
const panel = (title: string, bodyHtml: string) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;"><tr><td style="background:${BAND};padding:18px 20px;"><p style="margin:0 0 6px;font-family:${SANS};font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:${MUTED};">${esc(title)}</p><div style="font-family:${SANS};font-size:15px;line-height:1.6;color:${INK};">${bodyHtml}</div></td></tr></table>`;

/** Site photos, resized by the site so emails stay light. */
function thumb(siteUrl: string, imageUrl: string | null, size: number): string {
  if (!imageUrl) {
    return `<div style="width:${size}px;height:${size}px;background:${BAND};"></div>`;
  }
  const src = imageUrl.startsWith("data:")
    ? imageUrl
    : `${siteUrl}/_next/image?url=${encodeURIComponent(imageUrl)}&w=256&q=75`;
  return `<img src="${esc(src)}" width="${size}" height="${size}" alt="" style="display:block;width:${size}px;height:${size}px;object-fit:cover;border:0;">`;
}

function itemRows(siteUrl: string, items: OrderLine[]): string {
  return items
    .map(
      (item) =>
        `<tr><td width="76" valign="top" style="padding:12px 0;border-bottom:1px solid ${RULE};">${thumb(siteUrl, item.imageUrl, 64)}</td><td valign="top" style="padding:12px 0;border-bottom:1px solid ${RULE};font-family:${SANS};font-size:15px;line-height:1.5;color:${INK};">${esc(item.title)}${item.note ? `<br><span style="font-size:13px;color:${MUTED};">${esc(item.note)}</span>` : ""}</td><td valign="top" align="right" style="padding:12px 0;border-bottom:1px solid ${RULE};font-family:${SANS};font-size:15px;line-height:1.5;color:${INK};white-space:nowrap;">${money(item.priceCents)}</td></tr>`,
    )
    .join("");
}

function shippingLabel(order: OrderData): string {
  if (order.shippingMethod === "pickup") return "Local pickup";
  return order.shippingCents === 0 ? "Free" : money(order.shippingCents);
}

function totalsRows(order: OrderData): string {
  const row = (label: string, value: string, strong = false) =>
    `<tr><td colspan="2" style="padding:${strong ? "12px 0 0" : "6px 0 0"};font-family:${SANS};font-size:${strong ? "17px" : "14px"};color:${strong ? INK : MUTED};${strong ? "font-weight:600;" : ""}">${label}</td><td align="right" style="padding:${strong ? "12px 0 0" : "6px 0 0"};font-family:${SANS};font-size:${strong ? "17px" : "14px"};color:${INK};${strong ? "font-weight:600;" : ""}white-space:nowrap;">${value}</td></tr>`;
  return [
    row("Subtotal", money(order.subtotalCents)),
    order.discountCents > 0 ? row("Discount", `&minus;${money(order.discountCents)}`) : "",
    row("Shipping", shippingLabel(order)),
    order.taxCents > 0 ? row("Tax", money(order.taxCents)) : "",
    row("Total", money(order.totalCents), true),
  ].join("");
}

const orderTable = (order: OrderData, withTotals: boolean) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;border-top:1px solid ${RULE};">${itemRows(order.siteUrl, order.items)}${withTotals ? totalsRows(order) : ""}</table>`;

function itemsText(items: OrderLine[]): string {
  return items
    .map((item) => `  - ${item.title} (${money(item.priceCents)})${item.note ? `\n    ${item.note}` : ""}`)
    .join("\n");
}

function totalsText(order: OrderData): string {
  return [
    `Subtotal: ${money(order.subtotalCents)}`,
    order.discountCents > 0 ? `Discount: -${money(order.discountCents)}` : null,
    `Shipping: ${shippingLabel(order)}`,
    order.taxCents > 0 ? `Tax: ${money(order.taxCents)}` : null,
    `Total: ${money(order.totalCents)}`,
  ]
    .filter((line) => line !== null)
    .join("\n");
}

const signOff = `<p style="margin:24px 0 0;font-family:${SERIF};font-size:17px;line-height:1.5;color:${INK};">${MAKER}<br><span style="font-family:${SANS};font-size:13px;color:${MUTED};">${BRAND}</span></p>`;
const signOffText = `${MAKER}\n${BRAND}`;

/**
 * The shell every email shares: wordmark, body, grey footer band.
 * `footerNote` is the line that says why the reader got this email;
 * `unsubscribeUrl` adds the opt-out link the optional emails must carry.
 */
export function layout(options: {
  siteUrl: string;
  preheader: string;
  body: string;
  footerNote: string;
  unsubscribeUrl?: string;
}): string {
  const { siteUrl, preheader, body, footerNote, unsubscribeUrl } = options;
  const footerLink = (href: string, label: string) =>
    `<a href="${esc(href)}" style="color:${INK};text-decoration:underline;">${esc(label)}</a>`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<title>${esc(BRAND)}</title>
</head>
<body style="margin:0;padding:0;background:#ffffff;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;">
<tr><td align="center" style="padding:0 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">
<tr><td style="padding:28px 0 22px;border-bottom:1px solid ${RULE};">
<a href="${esc(siteUrl)}" style="text-decoration:none;"><img src="${esc(siteUrl)}/email-logo.png" width="194" height="36" alt="${esc(BRAND)}" style="display:block;border:0;width:194px;height:36px;"></a>
</td></tr>
<tr><td style="padding:36px 0 40px;">
${body}
</td></tr>
<tr><td style="background:${BAND};padding:24px 24px 26px;">
<p style="margin:0 0 10px;font-family:${SERIF};font-size:17px;color:${INK};">${esc(BRAND)}</p>
<p style="margin:0 0 12px;font-family:${SANS};font-size:13px;line-height:1.6;color:${MUTED};">Handmade, hand painted ceramics from St. Marys, Georgia.<br>${footerLink(`${siteUrl}/shop`, "Shop")} &nbsp;&middot;&nbsp; ${footerLink(`${siteUrl}/care`, "Care guide")} &nbsp;&middot;&nbsp; ${footerLink(`${siteUrl}/contact`, "Contact")}</p>
<p style="margin:0;font-family:${SANS};font-size:12px;line-height:1.6;color:${MUTED};">${footerNote}${unsubscribeUrl ? ` ${footerLink(unsubscribeUrl, "Unsubscribe")}.` : ""}</p>
</td></tr>
<tr><td style="height:28px;font-size:0;line-height:0;">&nbsp;</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

const ORDER_NOTE = "You are receiving this email because you placed an order with us.";

// ---------- 1. Order confirmation (customer) ----------

export function orderConfirmation(order: OrderData): Email {
  const pickup = order.shippingMethod === "pickup";
  const madeToOrder = order.items.some((item) => item.note);
  const next = pickup
    ? `You chose local pickup. ${MAKER} will email you as soon as your order is ready to collect.`
    : madeToOrder
      ? `Part of your order is made for you after you order, so it takes a little longer. ${MAKER} will email you with tracking as soon as it ships.`
      : `${MAKER} will pack your order by hand and email you with tracking as soon as it ships.`;
  const body = [
    heading("Thank you for your order"),
    p(`Hi ${esc(firstName(order.name))},`),
    p(`Your order is confirmed. Every piece is made and painted by hand, and yours is now set aside for you.`),
    p(esc(next)),
    subheading(`Order ${order.orderNumber}`),
    orderTable(order, true),
    pickup
      ? panel(order.pickupLabel, esc(order.pickupInstructions))
      : panel("Shipping to", (order.addressLines ?? []).map(esc).join("<br>")),
    p(`Questions about your order? Just reply to this email.`),
    signOff,
  ].join("\n");
  return {
    subject: `Order ${order.orderNumber} confirmed — thank you`,
    html: layout({
      siteUrl: order.siteUrl,
      preheader: `Your order ${order.orderNumber} is confirmed. Total ${money(order.totalCents)}.`,
      body,
      footerNote: ORDER_NOTE,
    }),
    text: [
      `Hi ${firstName(order.name)},`,
      "",
      "Thank you for your order. It is confirmed, and your pieces are set aside for you.",
      next,
      "",
      `Order ${order.orderNumber}`,
      itemsText(order.items),
      "",
      totalsText(order),
      "",
      pickup
        ? `${order.pickupLabel}\n${order.pickupInstructions}`
        : `Shipping to:\n${(order.addressLines ?? []).join("\n")}`,
      "",
      "Questions about your order? Just reply to this email.",
      "",
      signOffText,
    ].join("\n"),
  };
}

// ---------- 2. New order (owner) ----------

export function newOrderForOwner(order: OrderData): Email {
  const pickup = order.shippingMethod === "pickup";
  const adminUrl = `${order.siteUrl}/admin/orders`;
  const body = [
    heading(`New order ${order.orderNumber}`),
    p(`<strong>${esc(order.name ?? "A customer")}</strong> ${order.email ? `(${link(`mailto:${order.email}`, order.email)})` : ""} just paid <strong>${money(order.totalCents)}</strong>.`),
    orderTable(order, true),
    pickup
      ? panel("Local pickup", "The customer will collect this order. Mark it ready for pickup in the dashboard when it is.")
      : panel("Ship to", [order.name ?? "", ...(order.addressLines ?? [])].filter(Boolean).map(esc).join("<br>")),
    button(adminUrl, "Open the order"),
    small(`Reply to this email to write to the customer directly.`),
  ].join("\n");
  return {
    subject: `New order ${order.orderNumber} — ${money(order.totalCents)}`,
    html: layout({
      siteUrl: order.siteUrl,
      preheader: `${order.name ?? "A customer"} paid ${money(order.totalCents)}.`,
      body,
      footerNote: "Sent to the shop owner whenever an order is paid.",
    }),
    text: [
      `New order ${order.orderNumber}`,
      `${order.name ?? "A customer"} <${order.email ?? "no email"}> just paid ${money(order.totalCents)}.`,
      "",
      itemsText(order.items),
      "",
      totalsText(order),
      "",
      pickup ? "Local pickup" : `Ship to:\n${[order.name ?? "", ...(order.addressLines ?? [])].filter(Boolean).join("\n")}`,
      "",
      `Open the order: ${adminUrl}`,
    ].join("\n"),
  };
}

// ---------- 3 & 4. Shipped, and a corrected tracking number ----------

function trackingPanel(order: OrderData): { html: string; text: string } {
  const url = trackingUrl(order.carrier, order.trackingNumber);
  if (!order.trackingNumber) {
    return { html: "", text: "" };
  }
  const label = order.carrier ? `${order.carrier} tracking` : "Tracking number";
  return {
    html:
      panel(label, `<strong>${esc(order.trackingNumber)}</strong>`) +
      (url ? button(url, "Track your package") : ""),
    text: `${label}: ${order.trackingNumber}${url ? `\nTrack it: ${url}` : ""}\n`,
  };
}

export function orderShipped(order: OrderData): Email {
  const tracking = trackingPanel(order);
  const body = [
    heading("Your order is on its way"),
    p(`Hi ${esc(firstName(order.name))},`),
    p(`Good news: order ${esc(order.orderNumber)} has been packed by hand and handed to the carrier.`),
    tracking.html,
    subheading("In this shipment"),
    orderTable(order, false),
    panel("Shipping to", (order.addressLines ?? []).map(esc).join("<br>")),
    p(`Handmade ceramics are sturdy but not indestructible. Please unpack carefully, and if anything arrives less than perfect, reply to this email with a photo and we will make it right.`),
    signOff,
  ].join("\n");
  return {
    subject: `Order ${order.orderNumber} is on its way`,
    html: layout({
      siteUrl: order.siteUrl,
      preheader: order.trackingNumber
        ? `Tracking: ${order.trackingNumber}`
        : "Your pieces have been packed and shipped.",
      body,
      footerNote: ORDER_NOTE,
    }),
    text: [
      `Hi ${firstName(order.name)},`,
      "",
      `Order ${order.orderNumber} has been packed by hand and handed to the carrier.`,
      "",
      tracking.text,
      itemsText(order.items),
      "",
      `Shipping to:\n${(order.addressLines ?? []).join("\n")}`,
      "",
      "Please unpack carefully. If anything arrives less than perfect, reply to this email with a photo and we will make it right.",
      "",
      signOffText,
    ].join("\n"),
  };
}

export function shippingUpdate(order: OrderData): Email {
  const tracking = trackingPanel(order);
  const body = [
    heading("Updated tracking for your order"),
    p(`Hi ${esc(firstName(order.name))},`),
    p(`The tracking details for order ${esc(order.orderNumber)} have changed. Please use the details below; any earlier tracking number no longer applies.`),
    tracking.html,
    p(`Nothing else about your order has changed. If you have any questions, just reply to this email.`),
    signOff,
  ].join("\n");
  return {
    subject: `Updated tracking for order ${order.orderNumber}`,
    html: layout({
      siteUrl: order.siteUrl,
      preheader: order.trackingNumber ? `New tracking: ${order.trackingNumber}` : "Your tracking details have changed.",
      body,
      footerNote: ORDER_NOTE,
    }),
    text: [
      `Hi ${firstName(order.name)},`,
      "",
      `The tracking details for order ${order.orderNumber} have changed. Please use the details below; any earlier tracking number no longer applies.`,
      "",
      tracking.text,
      "Nothing else about your order has changed.",
      "",
      signOffText,
    ].join("\n"),
  };
}

// ---------- 5. Ready for pickup ----------

export function pickupReady(order: OrderData): Email {
  const body = [
    heading("Your order is ready for pickup"),
    p(`Hi ${esc(firstName(order.name))},`),
    p(`Order ${esc(order.orderNumber)} is wrapped and ready for you to collect.`),
    panel(order.pickupLabel, esc(order.pickupInstructions)),
    p(`Reply to this email to arrange a time that suits you.`),
    subheading("Ready to collect"),
    orderTable(order, false),
    signOff,
  ].join("\n");
  return {
    subject: `Order ${order.orderNumber} is ready for pickup`,
    html: layout({
      siteUrl: order.siteUrl,
      preheader: "Reply to arrange a pickup time.",
      body,
      footerNote: ORDER_NOTE,
    }),
    text: [
      `Hi ${firstName(order.name)},`,
      "",
      `Order ${order.orderNumber} is wrapped and ready for you to collect.`,
      "",
      `${order.pickupLabel}\n${order.pickupInstructions}`,
      "",
      "Reply to this email to arrange a time that suits you.",
      "",
      itemsText(order.items),
      "",
      signOffText,
    ].join("\n"),
  };
}

// ---------- 6. Delivered / collected ----------

export function orderDelivered(order: OrderData): Email {
  const pickup = order.shippingMethod === "pickup";
  const careUrl = `${order.siteUrl}/care`;
  const opening = pickup
    ? `Thank you for collecting order ${order.orderNumber}. We hope your new piece has already found its place.`
    : `Order ${order.orderNumber} has been delivered. We hope it arrived safely and has already found its place.`;
  const body = [
    heading(pickup ? "Enjoy your new piece" : "Your order has arrived"),
    p(`Hi ${esc(firstName(order.name))},`),
    p(esc(opening)),
    p(`A little care keeps hand painted ceramics bright for decades. Our care guide covers washing, everyday use, and looking after pieces that live outdoors.`),
    button(careUrl, "Read the care guide"),
    p(`If anything is not right, reply to this email with a photo and we will sort it out.`),
    p(`Thank you for supporting handmade work.`),
    signOff,
  ].join("\n");
  return {
    subject: pickup ? `Enjoy your new piece` : `Order ${order.orderNumber} has been delivered`,
    html: layout({
      siteUrl: order.siteUrl,
      preheader: "A short guide to caring for your ceramics.",
      body,
      footerNote: ORDER_NOTE,
    }),
    text: [
      `Hi ${firstName(order.name)},`,
      "",
      opening,
      "",
      "A little care keeps hand painted ceramics bright for decades. Our care guide covers washing, everyday use, and looking after pieces that live outdoors:",
      careUrl,
      "",
      "If anything is not right, reply to this email with a photo and we will sort it out.",
      "",
      "Thank you for supporting handmade work.",
      "",
      signOffText,
    ].join("\n"),
  };
}

// ---------- 7. Refund ----------

export function orderRefunded(order: OrderData, refund: { amountCents: number; full: boolean }): Email {
  const amount = money(refund.amountCents);
  const lead = refund.full
    ? `We have refunded order ${order.orderNumber} in full: ${amount}.`
    : `We have refunded ${amount} of order ${order.orderNumber}.`;
  const body = [
    heading(refund.full ? "Your order has been refunded" : "A refund is on its way"),
    p(`Hi ${esc(firstName(order.name))},`),
    p(esc(lead)),
    panel("Refund", `<strong>${amount}</strong> to your original payment method`),
    p(`Refunds usually appear on your statement within 5 to 10 business days, depending on your bank.`),
    subheading(`Order ${order.orderNumber}`),
    orderTable(order, false),
    p(`If you have any questions, just reply to this email.`),
    signOff,
  ].join("\n");
  return {
    subject: refund.full
      ? `Order ${order.orderNumber} has been refunded`
      : `A ${amount} refund for order ${order.orderNumber}`,
    html: layout({
      siteUrl: order.siteUrl,
      preheader: `${amount} is going back to your original payment method.`,
      body,
      footerNote: ORDER_NOTE,
    }),
    text: [
      `Hi ${firstName(order.name)},`,
      "",
      lead,
      "The refund goes to your original payment method and usually appears within 5 to 10 business days, depending on your bank.",
      "",
      itemsText(order.items),
      "",
      "If you have any questions, just reply to this email.",
      "",
      signOffText,
    ].join("\n"),
  };
}

// ---------- 8. Abandoned checkout reminder ----------

export type ReminderData = {
  siteUrl: string;
  name: string | null;
  items: { title: string; priceCents: number; imageUrl: string | null; slug: string }[];
  /** 1 = the first nudge, 2 = the last one. */
  attempt: 1 | 2;
  unsubscribeUrl: string;
};

export function cartReminder(data: ReminderData): Email {
  const one = data.items.length === 1;
  const lead =
    data.attempt === 1
      ? `You started checking out but did not finish, so ${one ? "the piece" : "the pieces"} you chose ${one ? "has" : "have"} gone back on the shelf.`
      : `Just one last note: ${one ? "the piece" : "the pieces"} you had your eye on ${one ? "is" : "are"} still available.`;
  const scarcity = `Each one is handmade and most are one of a kind, so once ${one ? "it sells, it is" : "they sell, they are"} gone.`;
  const first = data.items[0];
  const cta = one ? `${data.siteUrl}/shop/${first.slug}` : `${data.siteUrl}/shop`;
  const rows = data.items
    .map(
      (item) =>
        `<tr><td width="108" valign="top" style="padding:12px 0;border-bottom:1px solid ${RULE};"><a href="${esc(`${data.siteUrl}/shop/${item.slug}`)}">${thumb(data.siteUrl, item.imageUrl, 96)}</a></td><td valign="middle" style="padding:12px 0;border-bottom:1px solid ${RULE};font-family:${SANS};font-size:16px;line-height:1.5;color:${INK};"><a href="${esc(`${data.siteUrl}/shop/${item.slug}`)}" style="color:${INK};text-decoration:none;">${esc(item.title)}</a><br><span style="color:${MUTED};">${money(item.priceCents)} &middot; free shipping</span></td></tr>`,
    )
    .join("");
  const body = [
    heading(data.attempt === 1 ? "Still thinking it over?" : "Still available, for now"),
    p(`Hi ${esc(firstName(data.name))},`),
    p(esc(lead)),
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;border-top:1px solid ${RULE};">${rows}</table>`,
    p(esc(scarcity)),
    button(cta, one ? "Take another look" : "Back to the shop"),
    p(`Have a question before you decide? Reply to this email and ${MAKER} will answer it herself.`),
    signOff,
  ].join("\n");
  return {
    subject:
      data.attempt === 1
        ? one
          ? `${first.title} is still available`
          : "Your pieces are still available"
        : one
          ? `Last note about ${first.title}`
          : "A last note about your pieces",
    html: layout({
      siteUrl: data.siteUrl,
      preheader: scarcity,
      body,
      footerNote:
        data.attempt === 1
          ? "You are receiving this because you started a checkout with us. We send at most two reminders."
          : "This is the last reminder we will send about this checkout.",
      unsubscribeUrl: data.unsubscribeUrl,
    }),
    text: [
      `Hi ${firstName(data.name)},`,
      "",
      lead,
      "",
      data.items.map((item) => `  - ${item.title} (${money(item.priceCents)}, free shipping)\n    ${data.siteUrl}/shop/${item.slug}`).join("\n"),
      "",
      scarcity,
      "",
      `Have a question before you decide? Reply to this email and ${MAKER} will answer it herself.`,
      "",
      signOffText,
      "",
      `Stop these reminders: ${data.unsubscribeUrl}`,
    ].join("\n"),
  };
}

// ---------- 9 & 10. Commission inquiry ----------

export type InquiryData = {
  siteUrl: string;
  name: string;
  email: string;
  type: string;
  budget: string;
  message: string;
  pieceTitle: string | null;
};

export function commissionReceived(inquiry: InquiryData): Email {
  const quoted = esc(inquiry.message).replace(/\n/g, "<br>");
  const body = [
    heading("We have your commission request"),
    p(`Hi ${esc(firstName(inquiry.name))},`),
    p(`Thank you for getting in touch about a custom piece. ${MAKER} reads every request herself and will reply within a few days to talk through ideas, timing and a quote.`),
    p(`There is nothing to pay until you have agreed a design and a price together.`),
    panel("What you sent us", quoted),
    p(`Thought of something to add? Just reply to this email.`),
    signOff,
  ].join("\n");
  return {
    subject: "We have your commission request",
    html: layout({
      siteUrl: inquiry.siteUrl,
      preheader: `${MAKER} will reply within a few days.`,
      body,
      footerNote: "You are receiving this email because you sent us a commission request.",
    }),
    text: [
      `Hi ${firstName(inquiry.name)},`,
      "",
      `Thank you for getting in touch about a custom piece. ${MAKER} reads every request herself and will reply within a few days to talk through ideas, timing and a quote.`,
      "There is nothing to pay until you have agreed a design and a price together.",
      "",
      "What you sent us:",
      inquiry.message,
      "",
      "Thought of something to add? Just reply to this email.",
      "",
      signOffText,
    ].join("\n"),
  };
}

export function commissionForOwner(inquiry: InquiryData): Email {
  const adminUrl = `${inquiry.siteUrl}/admin/inquiries`;
  const details = [
    `<strong>Name:</strong> ${esc(inquiry.name)}`,
    `<strong>Email:</strong> ${link(`mailto:${inquiry.email}`, inquiry.email)}`,
    `<strong>Looking for:</strong> ${esc(inquiry.type || "Not specified")}`,
    `<strong>Budget:</strong> ${esc(inquiry.budget || "Not specified")}`,
    inquiry.pieceTitle ? `<strong>Asked about:</strong> ${esc(inquiry.pieceTitle)}` : null,
  ]
    .filter((line) => line !== null)
    .join("<br>");
  const body = [
    heading(`New commission inquiry`),
    p(`<strong>${esc(inquiry.name)}</strong> sent a request through the commissions page.`),
    panel("Details", details),
    panel("Message", esc(inquiry.message).replace(/\n/g, "<br>")),
    button(adminUrl, "Open inquiries"),
    small(`Reply to this email to answer ${esc(firstName(inquiry.name))} directly.`),
  ].join("\n");
  return {
    subject: `New commission inquiry — ${inquiry.name}`,
    html: layout({
      siteUrl: inquiry.siteUrl,
      preheader: inquiry.message.slice(0, 120),
      body,
      footerNote: "Sent to the shop owner whenever someone submits the commission form.",
    }),
    text: [
      `Name: ${inquiry.name}`,
      `Email: ${inquiry.email}`,
      `Looking for: ${inquiry.type || "Not specified"}`,
      `Budget: ${inquiry.budget || "Not specified"}`,
      inquiry.pieceTitle ? `Asked about: ${inquiry.pieceTitle}` : null,
      "",
      "Message:",
      inquiry.message,
      "",
      `Open inquiries: ${adminUrl}`,
    ]
      .filter((line) => line !== null)
      .join("\n"),
  };
}

// ---------- 11. Newsletter welcome ----------

export function newsletterWelcome(data: { siteUrl: string; unsubscribeUrl: string }): Email {
  const body = [
    heading("You are on the list"),
    p(`Thank you for signing up. You will be the first to hear when new pieces come out of the kiln, when commissions open, and the occasional story from the studio.`),
    p(`We write only when there is something worth sharing.`),
    button(`${data.siteUrl}/shop`, "See what is in the shop"),
    signOff,
  ].join("\n");
  return {
    subject: `Welcome to ${BRAND}`,
    html: layout({
      siteUrl: data.siteUrl,
      preheader: "New pieces and studio news, only when there is something worth sharing.",
      body,
      footerNote: "You are receiving this because you signed up for news from GPM Ceramics.",
      unsubscribeUrl: data.unsubscribeUrl,
    }),
    text: [
      "Thank you for signing up. You will be the first to hear when new pieces come out of the kiln, when commissions open, and the occasional story from the studio.",
      "We write only when there is something worth sharing.",
      "",
      `See what is in the shop: ${data.siteUrl}/shop`,
      "",
      signOffText,
      "",
      `Unsubscribe: ${data.unsubscribeUrl}`,
    ].join("\n"),
  };
}

// ---------- 12. Dashboard sign-in code ----------

export function resetCode(data: { siteUrl: string; code: string }): Email {
  const body = [
    heading("Your dashboard reset code"),
    p(`Enter this code on the sign-in page to set a new password:`),
    `<p style="margin:0 0 20px;font-family:'Courier New', Courier, monospace;font-size:32px;letter-spacing:0.2em;color:${INK};">${esc(data.code)}</p>`,
    small(`The code expires shortly. If you did not ask for it, you can ignore this email; your password has not changed.`),
  ].join("\n");
  return {
    subject: "Your dashboard reset code",
    html: layout({
      siteUrl: data.siteUrl,
      preheader: "Use this code to set a new dashboard password.",
      body,
      footerNote: "Sent because someone asked to reset the dashboard password for this address.",
    }),
    text: [
      `Your password reset code is ${data.code}`,
      "",
      "It expires shortly. If you did not ask for this, you can ignore it.",
    ].join("\n"),
  };
}
