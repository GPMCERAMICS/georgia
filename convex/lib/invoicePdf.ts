"use node";

/**
 * A custom order's invoice as a one-page PDF, attached to the quote, the
 * final invoice and both receipts. It shows the same lines and the same
 * sums as the email and the invoice page, because it is built from the same
 * `CustomInvoiceData`.
 *
 * pdf-lib's built-in typefaces are used rather than an embedded font, which
 * keeps the file small; the wordmark is the site's own logo image.
 *
 * Marked "use node" because only the Node action in `invoicePdf.ts` uses it,
 * and that is the runtime the PDF library is certain to run in.
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { CustomInvoiceData } from "./emailTemplates";
import { LOGO_PNG_BASE64 } from "./logoPng";

export type InvoiceStage = "deposit" | "balance" | "receipt";

const NAVY = rgb(0.086, 0.133, 0.227);
const INK = rgb(0.11, 0.114, 0.133);
const MUTED = rgb(0.42, 0.43, 0.46);
const RULE = rgb(0.87, 0.875, 0.89);
const BAND = rgb(0.94, 0.945, 0.953);

const PAGE = { width: 612, height: 792 }; // US Letter, in points
const MARGIN = 54;
const RIGHT = PAGE.width - MARGIN;

const money = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

/**
 * The built-in PDF typefaces only cover Western (WinAnsi) characters; one
 * outside that set would make the whole PDF fail. Swap anything unsupported
 * for a plain stand-in instead.
 */
export function pdfSafe(text: string): string {
  return text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/−/g, "-")
    .replace(/\s+/g, " ")
    .replace(/[^\x20-\x7E\xA0-\xFF–—…•]/g, "?");
}

/** Breaks text into lines no wider than `width` at the given size. */
function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split(/\n/)) {
    let line = "";
    for (const word of pdfSafe(paragraph).split(" ")) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && font.widthOfTextAtSize(candidate, size) > width) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    lines.push(line);
  }
  return lines;
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function buildInvoicePdf(
  data: CustomInvoiceData,
  stage: InvoiceStage,
  issuedAt: number,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Invoice ${data.number}`);
  pdf.setAuthor("GPM Ceramics");
  const page: PDFPage = pdf.addPage([PAGE.width, PAGE.height]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const serif = await pdf.embedFont(StandardFonts.TimesRoman);

  const text = (
    value: string,
    x: number,
    y: number,
    options: { font?: PDFFont; size?: number; color?: ReturnType<typeof rgb> } = {},
  ) => {
    const { font = regular, size = 10.5, color = INK } = options;
    page.drawText(pdfSafe(value), { x, y, size, font, color });
  };
  const textRight = (
    value: string,
    y: number,
    options: { font?: PDFFont; size?: number; color?: ReturnType<typeof rgb> } = {},
  ) => {
    const { font = regular, size = 10.5 } = options;
    const safe = pdfSafe(value);
    text(safe, RIGHT - font.widthOfTextAtSize(safe, size), y, options);
  };
  const rule = (y: number, color = RULE) =>
    page.drawLine({ start: { x: MARGIN, y }, end: { x: RIGHT, y }, thickness: 0.75, color });

  // ---- Header: wordmark left, document title right.
  const logo = await pdf.embedPng(base64ToBytes(LOGO_PNG_BASE64));
  const logoHeight = 30;
  page.drawImage(logo, {
    x: MARGIN,
    y: PAGE.height - MARGIN - logoHeight,
    width: (logo.width / logo.height) * logoHeight,
    height: logoHeight,
  });
  const titleY = PAGE.height - MARGIN - 20;
  textRight(stage === "receipt" ? "RECEIPT" : "INVOICE", titleY, { font: bold, size: 12, color: NAVY });
  textRight(data.number, titleY - 16, { color: MUTED });
  textRight(
    new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(
      new Date(issuedAt),
    ),
    titleY - 30,
    { color: MUTED },
  );

  let y = PAGE.height - MARGIN - 64;
  rule(y);

  // ---- Who it is for, and what is being made.
  y -= 26;
  text("BILL TO", MARGIN, y, { size: 8, color: MUTED });
  text("FROM", 330, y, { size: 8, color: MUTED });
  y -= 15;
  text(data.name, MARGIN, y, { font: bold });
  text("GPM Ceramics", 330, y, { font: bold });
  y -= 14;
  text(data.email, MARGIN, y, { color: MUTED });
  text("St. Marys, Georgia", 330, y, { color: MUTED });
  y -= 14;
  text("info@gpmceramics.com", 330, y, { color: MUTED });

  y -= 34;
  for (const line of wrap(data.title, serif, 20, RIGHT - MARGIN)) {
    text(line, MARGIN, y, { font: serif, size: 20 });
    y -= 24;
  }

  // ---- The lines.
  y -= 8;
  text("ITEM", MARGIN, y, { size: 8, color: MUTED });
  textRight("AMOUNT", y, { size: 8, color: MUTED });
  y -= 8;
  rule(y);
  const amountColumn = 110;
  for (const item of data.items) {
    y -= 18;
    const lines = wrap(item.description, regular, 10.5, RIGHT - MARGIN - amountColumn);
    textRight(money(item.amountCents), y);
    for (const [i, line] of lines.entries()) {
      if (i > 0) y -= 14;
      text(line, MARGIN, y);
    }
    y -= 10;
    rule(y);
  }
  y -= 18;
  text(data.pickup ? "Local pickup" : "Shipping", MARGIN, y, { color: MUTED });
  textRight(
    data.pickup
      ? "Free"
      : data.shippingPending
        ? "Quoted when your piece is ready"
        : money(data.shippingCents),
    y,
    { color: MUTED },
  );
  y -= 10;
  rule(y);

  // ---- The sum, right-aligned under the amounts.
  const sumLeft = 330;
  const sumRow = (label: string, value: string, strong = false) => {
    y -= strong ? 24 : 18;
    text(label, sumLeft, y, { font: strong ? bold : regular, size: strong ? 12 : 10.5, color: strong ? INK : MUTED });
    textRight(value, y, { font: strong ? bold : regular, size: strong ? 12 : 10.5 });
  };
  y -= 4;
  sumRow(data.shippingPending ? "Total before shipping" : "Total", money(data.totalCents));
  if (data.depositPaid) sumRow("Deposit paid", `-${money(data.depositCents)}`);
  if (stage === "receipt" && data.balancePaid) sumRow("Balance paid", `-${money(data.balanceCents)}`);
  y -= 8;
  page.drawLine({ start: { x: sumLeft, y }, end: { x: RIGHT, y }, thickness: 0.75, color: RULE });
  if (stage === "deposit") {
    sumRow("Deposit due now", money(data.depositCents), true);
    y -= 16;
    text(
      data.shippingPending
        ? `Balance of ${money(data.balanceCents)} plus shipping due on completion`
        : `Balance of ${money(data.balanceCents)} due on completion`,
      sumLeft,
      y,
      { size: 9, color: MUTED },
    );
  } else if (stage === "balance") {
    sumRow("Balance due", money(data.balanceCents), true);
  } else {
    sumRow(
      data.balancePaid ? "Paid in full" : "Still to pay",
      data.balancePaid
        ? money(0)
        : `${money(data.balanceCents)}${data.shippingPending ? " + shipping" : ""}`,
      true,
    );
  }

  // ---- The note agreed with the customer, if there is one.
  const note = data.customerNote.trim();
  if (note) {
    y -= 36;
    const lines = wrap(note, regular, 10, RIGHT - MARGIN - 28).slice(0, 12);
    const height = lines.length * 14 + 34;
    page.drawRectangle({ x: MARGIN, y: y - height + 14, width: RIGHT - MARGIN, height, color: BAND });
    text("NOTE", MARGIN + 14, y - 4, { size: 8, color: MUTED });
    let noteY = y - 20;
    for (const line of lines) {
      text(line, MARGIN + 14, noteY, { size: 10 });
      noteY -= 14;
    }
    y -= height;
  }

  // ---- How to pay.
  if (stage !== "receipt") {
    y -= 30;
    text("Pay securely online:", MARGIN, y, { font: bold });
    y -= 15;
    text(data.invoiceUrl, MARGIN, y, { color: NAVY });
  }

  // ---- Footer.
  rule(MARGIN + 22);
  text(
    "GPM Ceramics  ·  Handmade, hand painted ceramics from St. Marys, Georgia  ·  gpmceramics.com",
    MARGIN,
    MARGIN + 8,
    { size: 8.5, color: MUTED },
  );

  return pdf.save();
}

/** The same bytes, in the base64 form an email attachment wants. */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}
