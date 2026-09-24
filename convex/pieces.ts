import { v } from "convex/values";
import { query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { computeAvailability, type Availability } from "./lib/availability";
import { countClaims } from "./lib/claims";
import { normalizeMode, pieceTags, type SaleMode } from "./lib/pieceShape";

export type PublicPiece = {
  _id: Id<"pieces">;
  title: string;
  slug: string;
  description: string;
  size: string | null;
  tags: string[];
  mode: SaleMode;
  priceCents: number;
  leadTimeWeeks: number | null;
  shippingTier: "plate" | "platter";
  dimensions: { widthIn: number; heightIn: number; depthIn: number } | null;
  weightOz: number | null;
  foodSafe: boolean;
  dishwasherSafe: boolean;
  careNotes: string | null;
  imageUrls: string[];
  availability: Availability;
};

/** Pieces shown on the shop at once. Georgia's catalog is nowhere near this. */
const MAX_PUBLISHED_PIECES = 200;

/** The most pieces a cart may ask about at once. */
const MAX_CART_LINES = 20;

export async function toPublicPiece(
  ctx: QueryCtx,
  piece: Doc<"pieces">,
  now: number,
): Promise<PublicPiece> {
  const { paidCount, activeHoldCount } = await countClaims(ctx, piece._id, now);
  const imageUrls = (
    await Promise.all(piece.images.map((id) => ctx.storage.getUrl(id)))
  ).filter((url): url is string => url !== null);

  return {
    _id: piece._id,
    title: piece.title,
    slug: piece.slug,
    description: piece.description,
    size: piece.size,
    tags: pieceTags(piece),
    mode: normalizeMode(piece.mode),
    priceCents: piece.priceCents,
    leadTimeWeeks: piece.leadTimeWeeks,
    shippingTier: piece.shippingTier,
    dimensions: piece.dimensions ?? null,
    weightOz: piece.weightOz ?? null,
    foodSafe: piece.foodSafe ?? false,
    dishwasherSafe: piece.dishwasherSafe ?? false,
    careNotes: piece.careNotes ?? null,
    imageUrls,
    availability: computeAvailability({
      status: piece.status,
      stock: piece.stock,
      paidCount,
      activeHoldCount,
    }),
  };
}

/**
 * Sold pieces stay on the grid as portfolio, but sink beneath everything
 * still for sale. Within each group Georgia's sortOrder holds.
 */
function soldLast(pieces: PublicPiece[]): PublicPiece[] {
  const rank = (p: PublicPiece) => (p.availability.state === "sold" ? 1 : 0);
  return [...pieces].sort((a, b) => rank(a) - rank(b));
}

/**
 * `now` is an argument, never `Date.now()`.
 *
 * Convex queries do not re-run as the clock advances, so a query that read the
 * wall clock would serve a stale "available" long after a hold expired, and
 * every read would miss the query cache. The caller passes the time, quantised
 * to the minute (see `nowForCatalog`), which keeps cache reuse high while
 * staying well inside the 30-minute hold window.
 *
 * This makes displayed availability advisory. That is correct: the authoritative
 * check happens in the reserve mutation, where `Date.now()` is allowed.
 */
export const listPublished = query({
  args: { now: v.number() },
  handler: async (ctx, args) => {
    const pieces = await ctx.db
      .query("pieces")
      .withIndex("by_status_and_sortOrder", (q) => q.eq("status", "published"))
      .order("asc")
      .take(MAX_PUBLISHED_PIECES);

    return soldLast(
      await Promise.all(pieces.map((piece) => toPublicPiece(ctx, piece, args.now))),
    );
  },
});

export const getBySlug = query({
  args: { slug: v.string(), now: v.number() },
  handler: async (ctx, args) => {
    const piece = await ctx.db
      .query("pieces")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    if (piece === null || piece.status !== "published") return null;
    return toPublicPiece(ctx, piece, args.now);
  },
});

/**
 * Hydrates a cart. Ids that no longer resolve to a published piece are
 * dropped rather than erroring, so a stale cart heals itself on load.
 */
export const listByIds = query({
  args: { ids: v.array(v.id("pieces")), now: v.number() },
  handler: async (ctx, args) => {
    const ids = args.ids.slice(0, MAX_CART_LINES);
    const pieces = await Promise.all(ids.map((id) => ctx.db.get("pieces", id)));
    const live = pieces.filter(
      (piece): piece is Doc<"pieces"> =>
        piece !== null && piece.status === "published",
    );
    return Promise.all(live.map((piece) => toPublicPiece(ctx, piece, args.now)));
  },
});
