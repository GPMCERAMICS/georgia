/**
 * Central content for the Georgia Perkins Pottery site.
 *
 * This is the ONE file Georgia edits to change copy, contact details, and the
 * pieces shown in the shop. Placeholders are marked with `PLACEHOLDER` — swap
 * them for real values (location, email, photos, Stripe links) when ready.
 */

export const site = {
  name: "Georgia Perkins Pottery",
  shortName: "Georgia Perkins",
  // Used in <title>, JSON-LD, and the hero.
  tagline: "Artisanal plates & garden pieces, thrown by hand.",
  description:
    "Handmade artisanal pottery by Georgia Perkins — one-of-a-kind plates, " +
    "garden pieces, and custom commissions, each thrown and glazed by hand.",

  // PLACEHOLDER — supply the real location; drives local SEO + LocalBusiness JSON-LD.
  location: {
    city: "PLACEHOLDER City",
    region: "PLACEHOLDER State",
    country: "US",
  },

  // PLACEHOLDER — where commission inquiries are emailed. Also shown in footer.
  email: "hello@georgiaperkinspottery.com",

  // PLACEHOLDER — canonical site URL (set NEXT_PUBLIC_SITE_URL in prod).
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://georgiaperkinspottery.com",

  // PLACEHOLDER social links (empty string hides the link).
  social: {
    instagram: "https://instagram.com/",
    pinterest: "",
  },

  about: {
    heading: "Made by hand, one piece at a time",
    body: [
      "Georgia Perkins has spent years at the wheel shaping clay into pieces " +
        "meant to be lived with — plates that hold a weeknight dinner, vessels " +
        "that anchor a garden bed, forms that feel quietly at home.",
      "Every piece is thrown, trimmed, and glazed by hand in small batches, so " +
        "no two are exactly alike. Slight variations in tone and texture are the " +
        "fingerprint of the maker, not a flaw.",
    ],
  },
} as const;

// A single commission piece. Photos are square (1:1) as provided.
export type Piece = {
  id: string;
  title: string;
  description: string;
  /** Display price, e.g. "$68". */
  price: string;
  /** Dimensions, e.g. '14" platter' or '8" × 8"'. */
  size?: string;
  /** Optional square photo in /public. When absent, an on-brand placeholder renders. */
  image?: string;
  /** PLACEHOLDER — paste a Stripe Payment Link here later to enable the Buy button. */
  stripeLink?: string;
  /** One of the placeholder vessel silhouettes: 0–3 (used until a real photo lands). */
  shape: 0 | 1 | 2 | 3;
};

// A themed group of commission pieces, fronted by a horizontal banner image.
export type Collection = {
  id: string;
  name: string;
  eyebrow: string;
  tagline: string;
  /** Horizontal banner image in /public. */
  image: string;
  pieces: Piece[];
};

// PLACEHOLDER pieces per collection — real titles, sizes, prices, and square
// photos get filled in next. Set `image` on a piece to replace its placeholder.
export const collections: Collection[] = [
  {
    id: "wildlife",
    name: "Wildlife",
    eyebrow: "Commission collection",
    tagline:
      "Birds, fish, and creatures hand-painted in bold, folk-geometric color — " +
      "statement platters and plates made to be hung as much as used.",
    image: "/wildlife.png",
    pieces: [
      {
        id: "wildlife-1",
        title: "Piece coming soon",
        description: "Details for this commission piece are on the way.",
        price: "—",
        size: "Square",
        shape: 0,
      },
      {
        id: "wildlife-2",
        title: "Piece coming soon",
        description: "Details for this commission piece are on the way.",
        price: "—",
        size: "Square",
        shape: 1,
      },
      {
        id: "wildlife-3",
        title: "Piece coming soon",
        description: "Details for this commission piece are on the way.",
        price: "—",
        size: "Square",
        shape: 3,
      },
    ],
  },
  {
    id: "heirloom",
    name: "Heirloom",
    eyebrow: "Commission collection",
    tagline:
      "Commemorative platters and keepsakes — houses, names, dates, and the small " +
      "details of a life, drawn in fine line work to be passed down.",
    image: "/heirloom.png",
    pieces: [
      {
        id: "heirloom-1",
        title: "Piece coming soon",
        description: "Details for this commission piece are on the way.",
        price: "—",
        size: "Square",
        shape: 2,
      },
      {
        id: "heirloom-2",
        title: "Piece coming soon",
        description: "Details for this commission piece are on the way.",
        price: "—",
        size: "Square",
        shape: 0,
      },
      {
        id: "heirloom-3",
        title: "Piece coming soon",
        description: "Details for this commission piece are on the way.",
        price: "—",
        size: "Square",
        shape: 1,
      },
    ],
  },
];

// Options offered in the commission form's "piece type" select.
export const commissionTypes = [
  "Wildlife piece",
  "Heirloom / commemorative piece",
  "A full set",
  "Something else",
] as const;
