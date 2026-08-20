/**
 * Central content for the Georgia Perkins Pottery site.
 *
 * This is the ONE file Georgia edits to change copy, contact details, and the
 * shop section headers. Placeholders are marked with `PLACEHOLDER` — swap
 * them for real values (location, email, photos) when ready.
 */

export const site = {
  name: "Georgia Perkins Pottery",
  shortName: "Georgia Perkins",
  // Used in <title>, JSON-LD, and the hero.
  tagline: "Whimsical hand painted ceramics.",
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

  // Canonical production URL — the apex 308s to www.
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.gpmceramics.com",

  // PLACEHOLDER social links (empty string hides the link).
  social: {
    instagram: "https://instagram.com/",
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
 * A shopping section on the homepage. The id matches the Convex piece
 * `collection` value, so each section renders the live catalog filtered to it
 * and its button links to the shop pre-filtered.
 */
export type Collection = {
  id: "wildlife" | "totems";
  name: string;
  tagline: string;
};

export const collections: Collection[] = [
  {
    id: "wildlife",
    name: "Coastal Living",
    tagline:
      "Georgia's Golden Aisle sets the backdrop for coastal themed wildlife " +
      "pieces of art. Handmade, hand painted and totally unique.",
  },
  {
    id: "totems",
    name: "Garden and Floral",
    tagline:
      "Colorful pieces to brighten up your indoor and outdoor space. Totems, " +
      "vases and flower pots sculptured and painted by hand inspired by " +
      "coastal wildlife.",
  },
];

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
