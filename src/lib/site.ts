/**
 * Central content for the GPM Ceramics site.
 *
 * This is the ONE file Georgia edits to change copy, contact details, and the
 * shop section headers. Placeholders are marked with `PLACEHOLDER` — swap
 * them for real values (location, email, photos) when ready.
 */

export const site = {
  // The brand. The maker, Georgia Perkins-Miller, is named where it's about her.
  name: "GPM Ceramics",
  shortName: "GPM Ceramics",
  maker: "Georgia Perkins-Miller",
  // Used in <title>, JSON-LD, and the hero.
  tagline: "Whimsical hand painted ceramics.",
  description:
    "Handmade artisanal pottery by Georgia Perkins-Miller — one-of-a-kind plates, " +
    "garden pieces, and custom commissions, each thrown and glazed by hand.",

  // Studio location; drives local SEO via the LocalBusiness JSON-LD. The
  // street line is published only when `publishStreet` is true — city, state
  // and ZIP always are.
  location: {
    street: "214 Angler's Ln",
    publishStreet: false,
    city: "St. Marys",
    region: "GA",
    postalCode: "31558",
    country: "US",
  },

  // Public contact address, shown in the footer and on contact pages.
  email: "info@gpmceramics.com",

  // Canonical production URL — the apex 308s to www.
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.gpmceramics.com",

  // Social links (empty string hides the link). Instagram is blank until the
  // account is ready.
  social: {
    facebook: "https://www.facebook.com/georgia.perkinsmiller",
    instagram: "",
    pinterest: "",
  },

  about: {
    heading: "Meet Georgia Perkins-Miller",
    body: [
      "Inspired by the Marshes and Coastline of the Golden Aisle, Georgia's " +
        "connection to sea creates a visual story told through color, whimsy " +
        "and joy of nature.",
    ],
  },
} as const;

/**
 * The numbers behind the Shipping & Returns policy. The policy page, the
 * one-line summaries around the site and the dashboard's return refund all
 * read these, so changing a number here changes it everywhere.
 */
export const returnsPolicy = {
  /** Days after delivery a piece can be sent back. */
  windowDays: 14,
  /** Days after delivery to report damage in transit. */
  damageWindowDays: 7,
  /** The restocking fee, as a percentage of the piece's price… */
  restockingPercent: 15,
  /** …with this floor, in cents. */
  restockingMinimumCents: 1500,
  /** The floor as shown to customers. */
  restockingMinimum: "$15",
} as const;

/** The restocking fee on a return of pieces that sold for this much. */
export function restockingFeeCents(priceCents: number): number {
  return Math.min(
    priceCents,
    Math.max(
      returnsPolicy.restockingMinimumCents,
      Math.round((priceCents * returnsPolicy.restockingPercent) / 100),
    ),
  );
}

// The commissions section of the homepage and the /commissions page.
export const commission = {
  eyebrow: "Heirloom & custom",
  heading:
    "Commission handmade ceramics to preserve your family history or " +
    "celebrate milestones",
  body: "Unique and Custom art pieces unique to you, your family or accomplishments",
  occasions: [
    "Weddings",
    "New and old homes / homesteads",
    "Hole in one",
    "Anniversaries",
    "Birthdays",
  ],
  /** Example commission pieces shown alongside the copy. */
  gallery: [
    { src: "/heirloom-wedding.png", alt: "Wedding commemorative platter" },
    { src: "/heirloom-hole-in-one.png", alt: "Hole-in-one commemorative plate" },
    { src: "/heirloom-norma-harry.png", alt: "Anniversary portrait platter" },
    { src: "/heirloom-mendacity.png", alt: "Custom home platter" },
  ],
} as const;

// Options offered in the commission form's "piece type" select.
export const commissionTypes = [
  "Wildlife piece",
  "Heirloom / commemorative piece",
  "A full set",
  "Something else",
] as const;
