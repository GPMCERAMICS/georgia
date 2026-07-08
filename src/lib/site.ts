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

export type Piece = {
  id: string;
  title: string;
  description: string;
  /** Display price, e.g. "$68". */
  price: string;
  /** Which piece type this belongs to (used for the gallery + SEO). */
  category: "Plates" | "Garden" | "Vessels";
  /** Optional real photo in /public. When absent, an on-brand placeholder renders. */
  image?: string;
  /** PLACEHOLDER — paste a Stripe Payment Link here later to enable the Buy button. */
  stripeLink?: string;
  /** One of the placeholder vessel silhouettes: 0–3. */
  shape: 0 | 1 | 2 | 3;
};

// PLACEHOLDER pieces — replace titles, prices, photos, and Stripe links with real ones.
export const pieces: Piece[] = [
  {
    id: "terracotta-dinner-plate",
    title: "Terracotta Dinner Plate",
    description: "Wheel-thrown stoneware with a warm matte glaze and raw clay rim.",
    price: "$68",
    category: "Plates",
    shape: 0,
  },
  {
    id: "speckled-salad-plates",
    title: "Speckled Salad Plates",
    description: "A pair of speckled everyday plates, glazed in soft oat.",
    price: "$95",
    category: "Plates",
    shape: 1,
  },
  {
    id: "glazed-garden-planter",
    title: "Glazed Garden Planter",
    description: "Frost-tolerant planter finished in a river-green reactive glaze.",
    price: "$120",
    category: "Garden",
    shape: 2,
  },
  {
    id: "stoneware-serving-platter",
    title: "Stoneware Serving Platter",
    description: "Generous hand-built platter for the center of the table.",
    price: "$145",
    category: "Plates",
    shape: 3,
  },
  {
    id: "hanging-garden-orb",
    title: "Hanging Garden Orb",
    description: "Sculptural hanging vessel for trailing plants and cut stems.",
    price: "$85",
    category: "Garden",
    shape: 1,
  },
  {
    id: "rimmed-ceramic-bowl",
    title: "Rimmed Ceramic Bowl",
    description: "Deep bowl with a rolled rim, glazed in ash and ochre.",
    price: "$54",
    category: "Vessels",
    shape: 0,
  },
];

// Options offered in the commission form's "piece type" select.
export const commissionTypes = [
  "Plates & tableware",
  "Garden piece",
  "Vessel / vase",
  "A full set",
  "Something else",
] as const;
