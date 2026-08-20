import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export const pieceCollection = v.union(
  v.literal("wildlife"),
  v.literal("heirloom"),
  v.literal("totems"),
);

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

export const orderStatus = v.union(
  v.literal("pending"),
  v.literal("paid"),
  v.literal("expired"),
  v.literal("fulfilled"),
  v.literal("refunded"),
);

export default defineSchema({
  ...authTables,

  pieces: defineTable({
    title: v.string(),
    slug: v.string(),
    description: v.string(),
    size: v.union(v.string(), v.null()),
    collection: pieceCollection,
    mode: pieceMode,
    priceCents: v.number(),
    // null = unlimited (madeToOrder, deposit)
    stock: v.union(v.number(), v.null()),
    // drops only — epoch ms before which the piece is not purchasable
    releaseAt: v.union(v.number(), v.null()),
    // madeToOrder only
    leadTimeWeeks: v.union(v.number(), v.null()),
    shippingTier,
    images: v.array(v.id("_storage")),
    status: pieceStatus,
    sortOrder: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_status_and_sortOrder", ["status", "sortOrder"]),

  orders: defineTable({
    pieceId: v.id("pieces"),
    stripeSessionId: v.union(v.string(), v.null()),
    stripePaymentIntentId: v.union(v.string(), v.null()),
    status: orderStatus,
    // the reservation hold; only meaningful while status is "pending"
    expiresAt: v.number(),
    email: v.union(v.string(), v.null()),
    name: v.union(v.string(), v.null()),
    shippingAddress: v.union(v.string(), v.null()),
    amountCents: v.number(),
    shippingCents: v.number(),
    paidAt: v.union(v.number(), v.null()),
  })
    .index("by_pieceId_and_status", ["pieceId", "status"])
    .index("by_stripeSessionId", ["stripeSessionId"]),
});
