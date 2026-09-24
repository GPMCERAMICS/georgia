import { internalMutation } from "../_generated/server";
import { ensureSettings } from "../settings";
import { MAX_TAGS } from "../tags";
import { MAX_PIECES } from "./pieces";

/**
 * Starter data. Both are safe to re-run: existing slugs are left alone.
 *
 *   npx convex run admin/seed:tags     — the three starter tags + settings
 *   npx convex run admin/seed:demo     — a dozen sample pieces for design work
 */

const TAGS = [
  {
    slug: "wildlife",
    name: "Coastal Living",
    description:
      "Georgia's Golden Isles set the backdrop for coastal themed wildlife pieces of art. Handmade, hand painted and totally unique.",
    featured: true,
  },
  {
    slug: "totems",
    name: "Garden and Floral",
    description:
      "Colorful pieces to brighten up your indoor and outdoor space. Totems, vases and flower pots sculpted and painted by hand.",
    featured: true,
  },
  {
    slug: "heirloom",
    name: "Heirloom",
    description: "Commemorative and custom pieces made to mark an occasion.",
    featured: false,
  },
  { slug: "plates", name: "Plates", description: "", featured: false },
  { slug: "platters", name: "Platters", description: "", featured: false },
  { slug: "mugs", name: "Mugs", description: "", featured: false },
];

export const tags = internalMutation({
  args: {},
  handler: async (ctx) => {
    await ensureSettings(ctx);
    const existing = await ctx.db.query("tags").take(MAX_TAGS);
    const known = new Set(existing.map((tag) => tag.slug));
    let sortOrder = existing.length;
    const created: string[] = [];
    for (const tag of TAGS) {
      if (known.has(tag.slug)) continue;
      await ctx.db.insert("tags", { ...tag, visible: true, sortOrder: sortOrder++ });
      created.push(tag.slug);
    }
    return { created };
  },
});

type DemoPiece = {
  title: string;
  slug: string;
  description: string;
  size: string;
  tags: string[];
  mode: "oneoff" | "madeToOrder";
  priceCents: number;
  shippingTier: "plate" | "platter";
  leadTimeWeeks?: number;
  sold?: boolean;
};

const DEMO: DemoPiece[] = [
  {
    title: "Kingfisher Plate",
    slug: "kingfisher-plate",
    description:
      "A belted kingfisher mid-dive, painted in cobalt and rust over a cream glaze.\n\nWheel-thrown stoneware, hand painted, fired to cone 6.",
    size: '10" plate',
    tags: ["wildlife", "plates"],
    mode: "oneoff",
    priceCents: 18000,
    shippingTier: "plate",
  },
  {
    title: "Snapper Platter",
    slug: "snapper-platter",
    description: "A red snapper stretched across a wide oval platter, scales picked out one by one.",
    size: '16" oval platter',
    tags: ["wildlife", "platters"],
    mode: "oneoff",
    priceCents: 32000,
    shippingTier: "platter",
  },
  {
    title: "Pufferfish Bowl",
    slug: "pufferfish-bowl",
    description: "A very pleased pufferfish on the inside of a serving bowl.",
    size: '9" bowl',
    tags: ["wildlife"],
    mode: "oneoff",
    priceCents: 14500,
    shippingTier: "plate",
    sold: true,
  },
  {
    title: "Marsh Owl Plate",
    slug: "marsh-owl-plate",
    description: "A barred owl watching over the marsh grass at dusk.",
    size: '10" plate',
    tags: ["wildlife", "plates"],
    mode: "oneoff",
    priceCents: 19000,
    shippingTier: "plate",
  },
  {
    title: "Blue Crab Mug",
    slug: "blue-crab-mug",
    description: "The crabbie. Made in small batches, each one hand painted, so no two match.",
    size: "12 oz",
    tags: ["wildlife", "mugs"],
    mode: "madeToOrder",
    priceCents: 5200,
    shippingTier: "plate",
    leadTimeWeeks: 3,
  },
  {
    title: "Fish Platter",
    slug: "fish-platter",
    description: "A shoal of small silver fish circling a deep platter.",
    size: '14" platter',
    tags: ["wildlife", "platters"],
    mode: "oneoff",
    priceCents: 28000,
    shippingTier: "platter",
  },
  {
    title: "Sunflower Totem",
    slug: "sunflower-totem",
    description: "A four-piece stacking garden totem topped with a sunflower head. Frost-safe glaze.",
    size: '38" tall, four stacking pieces',
    tags: ["totems"],
    mode: "oneoff",
    priceCents: 42000,
    shippingTier: "platter",
  },
  {
    title: "Hydrangea Vase",
    slug: "hydrangea-vase",
    description: "A tall vase wrapped in blue hydrangea heads.",
    size: '12" tall',
    tags: ["totems"],
    mode: "oneoff",
    priceCents: 16500,
    shippingTier: "plate",
  },
  {
    title: "Coral Flower Pot",
    slug: "coral-flower-pot",
    description: "A generous planter with a drainage hole, glazed in a coral fade.",
    size: '10" pot',
    tags: ["totems"],
    mode: "madeToOrder",
    priceCents: 9800,
    shippingTier: "platter",
    leadTimeWeeks: 4,
  },
  {
    title: "Heron Totem",
    slug: "heron-totem",
    description: "A great blue heron standing tall in three stacking sections.",
    size: '44" tall, three stacking pieces',
    tags: ["totems", "wildlife"],
    mode: "oneoff",
    priceCents: 48000,
    shippingTier: "platter",
    sold: true,
  },
  {
    title: "Wedding Platter",
    slug: "wedding-platter",
    description:
      "A commemorative platter with the couple's names, the date, and the church. Shown as an example of commission work.",
    size: '16" platter',
    tags: ["heirloom", "platters"],
    mode: "oneoff",
    priceCents: 38000,
    shippingTier: "platter",
    sold: true,
  },
  {
    title: "Hole-in-One Plate",
    slug: "hole-in-one-plate",
    description: "The course, the hole, the date. A plate for the mantle, not the table.",
    size: '10" plate',
    tags: ["heirloom", "plates"],
    mode: "oneoff",
    priceCents: 21000,
    shippingTier: "plate",
    sold: true,
  },
];

export const demo = internalMutation({
  args: {},
  handler: async (ctx) => {
    await ensureSettings(ctx);
    const existing = await ctx.db.query("pieces").take(MAX_PIECES);
    const known = new Set(existing.map((piece) => piece.slug));
    let sortOrder =
      existing.length === 0 ? 0 : Math.max(...existing.map((p) => p.sortOrder)) + 1;
    const created: string[] = [];
    for (const piece of DEMO) {
      if (known.has(piece.slug)) continue;
      const { sold, leadTimeWeeks, ...fields } = piece;
      await ctx.db.insert("pieces", {
        ...fields,
        stock: piece.mode === "madeToOrder" ? null : sold ? 0 : 1,
        leadTimeWeeks: leadTimeWeeks ?? null,
        dimensions: null,
        weightOz: null,
        foodSafe: piece.mode !== "oneoff" || !piece.tags.includes("totems"),
        dishwasherSafe: false,
        careNotes: "Hand wash. Avoid sudden temperature changes.",
        images: [],
        status: "published",
        sortOrder: sortOrder++,
      });
      created.push(piece.slug);
    }
    return { created };
  },
});
