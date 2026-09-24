import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

/**
 * Two ways a piece can be sold.
 *
 * `oneoff`      a single physical object; stock is 1 and it sells once.
 * `madeToOrder` a design Georgia remakes on demand; unlimited stock, lead time.
 *
 * `deposit` and `drop` are LEGACY values from the first catalog plan. They are
 * still accepted by the schema so a deployment holding old documents can be
 * pushed, but every read normalises them (see `lib/pieceShape.ts`) and
 * `admin/maintenance:migrateLegacyCatalog` rewrites them for good.
 */
export const pieceMode = v.union(
  v.literal("oneoff"),
  v.literal("madeToOrder"),
  v.literal("deposit"),
  v.literal("drop"),
);

export const pieceStatus = v.union(
  v.literal("draft"),
  v.literal("published"),
  v.literal("archived"),
);

export const shippingTier = v.union(v.literal("plate"), v.literal("platter"));

export const shippingMethod = v.union(v.literal("ship"), v.literal("pickup"));

export const orderStatus = v.union(
  v.literal("pending"),
  v.literal("paid"),
  v.literal("shipped"),
  v.literal("delivered"),
  v.literal("expired"),
  v.literal("cancelled"),
  v.literal("refunded"),
);

export const inquiryStatus = v.union(
  v.literal("new"),
  v.literal("replied"),
  v.literal("quoted"),
  v.literal("inProgress"),
  v.literal("done"),
  v.literal("declined"),
);

export const dimensions = v.object({
  widthIn: v.number(),
  heightIn: v.number(),
  depthIn: v.number(),
});

export const shippingAddress = v.object({
  line1: v.string(),
  line2: v.union(v.string(), v.null()),
  city: v.string(),
  state: v.string(),
  postalCode: v.string(),
  country: v.string(),
});

/** The one settings document. Created lazily with these defaults. */
export const settingsFields = {
  storeName: v.string(),
  // Where owner notifications go. Falls back to ADMIN_EMAIL when empty.
  notifyEmail: v.string(),
  shipping: v.object({
    // Flat rate by piece size tier, integer cents.
    plateCents: v.number(),
    platterCents: v.number(),
    // A cart with any platter ships at the platter rate.
    freeOverCents: v.union(v.number(), v.null()),
  }),
  pickup: v.object({
    enabled: v.boolean(),
    label: v.string(),
    instructions: v.string(),
  }),
  taxEnabled: v.boolean(),
  // Sequence for human-readable order numbers, e.g. GP-1001.
  nextOrderNumber: v.number(),
};

export default defineSchema({
  ...authTables,

  tags: defineTable({
    name: v.string(),
    slug: v.string(),
    description: v.string(),
    sortOrder: v.number(),
    // Featured tags get their own section on the homepage.
    featured: v.boolean(),
    visible: v.boolean(),
  })
    .index("by_slug", ["slug"])
    .index("by_sortOrder", ["sortOrder"]),

  pieces: defineTable({
    title: v.string(),
    slug: v.string(),
    description: v.string(),
    size: v.union(v.string(), v.null()),
    // Tag slugs. Optional only so legacy documents validate; reads treat a
    // missing value as [] (or the legacy `collection`, below).
    tags: v.optional(v.array(v.string())),
    // LEGACY — replaced by `tags`. Migrated by migrateLegacyCatalog.
    collection: v.optional(
      v.union(
        v.literal("wildlife"),
        v.literal("heirloom"),
        v.literal("totems"),
      ),
    ),
    mode: pieceMode,
    priceCents: v.number(),
    // null = unlimited (madeToOrder)
    stock: v.union(v.number(), v.null()),
    // LEGACY — drops only. Ignored by availability; cleared by migration.
    releaseAt: v.optional(v.union(v.number(), v.null())),
    // madeToOrder only
    leadTimeWeeks: v.union(v.number(), v.null()),
    shippingTier,
    dimensions: v.optional(v.union(dimensions, v.null())),
    weightOz: v.optional(v.union(v.number(), v.null())),
    foodSafe: v.optional(v.boolean()),
    dishwasherSafe: v.optional(v.boolean()),
    careNotes: v.optional(v.union(v.string(), v.null())),
    images: v.array(v.id("_storage")),
    status: pieceStatus,
    sortOrder: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_status_and_sortOrder", ["status", "sortOrder"]),

  orders: defineTable({
    orderNumber: v.string(),
    status: orderStatus,
    email: v.union(v.string(), v.null()),
    name: v.union(v.string(), v.null()),
    shippingMethod,
    shippingAddress: v.union(shippingAddress, v.null()),
    subtotalCents: v.number(),
    shippingCents: v.number(),
    taxCents: v.number(),
    totalCents: v.number(),
    stripeSessionId: v.union(v.string(), v.null()),
    stripePaymentIntentId: v.union(v.string(), v.null()),
    // The reservation hold; only meaningful while status is "pending".
    expiresAt: v.number(),
    paidAt: v.union(v.number(), v.null()),
    shippedAt: v.union(v.number(), v.null()),
    deliveredAt: v.union(v.number(), v.null()),
    carrier: v.union(v.string(), v.null()),
    trackingNumber: v.union(v.string(), v.null()),
    notes: v.string(),
  })
    .index("by_status", ["status"])
    .index("by_email", ["email"])
    .index("by_orderNumber", ["orderNumber"])
    .index("by_stripeSessionId", ["stripeSessionId"])
    .index("by_stripePaymentIntentId", ["stripePaymentIntentId"]),

  /**
   * One row per piece in an order. Holds live here: a piece's availability is
   * `stock - items on paid/shipped/delivered orders - items on live pending
   * orders`. A one-off is just the stock = 1 case of the same rule.
   */
  orderItems: defineTable({
    orderId: v.id("orders"),
    pieceId: v.id("pieces"),
    // Snapshots, so an order still reads correctly after the piece is edited.
    titleSnapshot: v.string(),
    priceCents: v.number(),
    // Denormalised from the order so availability can be counted with one
    // index read per piece. Kept in sync by the order mutations only.
    orderStatus,
    expiresAt: v.number(),
  })
    .index("by_orderId", ["orderId"])
    .index("by_pieceId", ["pieceId"]),

  settings: defineTable(settingsFields),

  inquiries: defineTable({
    name: v.string(),
    email: v.string(),
    type: v.string(),
    budget: v.string(),
    message: v.string(),
    status: inquiryStatus,
    notes: v.string(),
    // Set when the inquiry came from a specific piece's page.
    pieceId: v.union(v.id("pieces"), v.null()),
  }).index("by_status", ["status"]),
});
