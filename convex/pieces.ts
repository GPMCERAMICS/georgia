import { v } from "convex/values";
import { query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { computeAvailability, type Availability } from "./lib/availability";

export type PublicPiece = {
  _id: Id<"pieces">;
  title: string;
  slug: string;
  description: string;
  size: string | null;
  collection: "wildlife" | "heirloom" | "totems";
  mode: "oneoff" | "madeToOrder" | "deposit" | "drop";
  priceCents: number;
  leadTimeWeeks: number | null;
  imageUrls: string[];
  availability: Availability;
};

/**
 * Convex forbids unbounded `.collect()`. A single piece can never legitimately
 * accumulate more claims than a generous batch, so we bound the read and treat
 * exceeding it as sold out rather than silently undercounting.
 */
const MAX_CLAIMS_PER_PIECE = 256;

/** Pieces shown on the shop at once. Georgia's catalog is nowhere near this. */
const MAX_PUBLISHED_PIECES = 200;

/**
 * Counts the orders that consume stock: settled sales, plus checkouts that are
 * still live. An expired pending order holds nothing.
 */
async function countClaims(ctx: QueryCtx, pieceId: Id<"pieces">, now: number) {
  const orders = await ctx.db
    .query("orders")
    .withIndex("by_pieceId_and_status", (q) => q.eq("pieceId", pieceId))
    .take(MAX_CLAIMS_PER_PIECE);

  let paidCount = 0;
  let activeHoldCount = 0;
  for (const order of orders) {
    if (order.status === "paid" || order.status === "fulfilled") {
      paidCount += 1;
    } else if (order.status === "pending" && order.expiresAt > now) {
      activeHoldCount += 1;
    }
  }
  return { paidCount, activeHoldCount };
}

async function toPublicPiece(
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
    collection: piece.collection,
    mode: piece.mode,
    priceCents: piece.priceCents,
    leadTimeWeeks: piece.leadTimeWeeks,
    imageUrls,
    availability: computeAvailability({
      status: piece.status,
      stock: piece.stock,
      releaseAt: piece.releaseAt,
      paidCount,
      activeHoldCount,
      now,
    }),
  };
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
 * check happens in the reserve mutation (Plan 2), where `Date.now()` is allowed.
 */
export const listPublished = query({
  args: { now: v.number() },
  handler: async (ctx, args) => {
    const pieces = await ctx.db
      .query("pieces")
      .withIndex("by_status_and_sortOrder", (q) => q.eq("status", "published"))
      .order("asc")
      .take(MAX_PUBLISHED_PIECES);

    return Promise.all(
      pieces.map((piece) => toPublicPiece(ctx, piece, args.now)),
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
