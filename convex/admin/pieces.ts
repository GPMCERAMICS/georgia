import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { requireAdmin } from "../lib/adminGuard";
import { computeAvailability, type Availability } from "../lib/availability";
import { countClaims } from "../lib/claims";
import { normalizeMode, pieceTags, type SaleMode } from "../lib/pieceShape";
import { dimensions, pieceStatus, shippingTier } from "../schema";

/** Convex forbids unbounded .collect(); the catalog is far below this. */
export const MAX_PIECES = 500;

/** Only the two live modes can be written. Legacy values are read-only. */
export const saleMode = v.union(v.literal("oneoff"), v.literal("madeToOrder"));

export const editableFields = {
  title: v.string(),
  slug: v.string(),
  description: v.string(),
  size: v.union(v.string(), v.null()),
  tags: v.array(v.string()),
  mode: saleMode,
  priceCents: v.number(),
  stock: v.union(v.number(), v.null()),
  leadTimeWeeks: v.union(v.number(), v.null()),
  shippingTier,
  dimensions: v.union(dimensions, v.null()),
  weightOz: v.union(v.number(), v.null()),
  foodSafe: v.boolean(),
  dishwasherSafe: v.boolean(),
  careNotes: v.union(v.string(), v.null()),
};

/** What the dashboard sees: the document, normalised, plus derived state. */
export type AdminPiece = Omit<
  Doc<"pieces">,
  "mode" | "tags" | "collection" | "releaseAt"
> & {
  mode: SaleMode;
  tags: string[];
  availability: Availability;
  thumbnailUrl: string | null;
};

async function toAdminPiece(
  ctx: QueryCtx,
  piece: Doc<"pieces">,
  now: number,
): Promise<AdminPiece> {
  const { paidCount, activeHoldCount } = await countClaims(ctx, piece._id, now);
  const { collection, releaseAt, ...rest } = piece;
  void collection;
  void releaseAt;
  return {
    ...rest,
    mode: normalizeMode(piece.mode),
    tags: pieceTags(piece),
    availability: computeAvailability({
      status: piece.status,
      stock: piece.stock,
      paidCount,
      activeHoldCount,
    }),
    thumbnailUrl: piece.images[0]
      ? await ctx.storage.getUrl(piece.images[0])
      : null,
  };
}

async function assertSlugFree(
  ctx: MutationCtx,
  slug: string,
  ignoreId?: string,
) {
  const existing = await ctx.db
    .query("pieces")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .unique();

  if (existing && existing._id !== ignoreId) {
    throw new Error(`A piece with the slug "${slug}" already exists`);
  }
}

function validate(fields: Partial<{ priceCents: number; stock: number | null; slug: string }>) {
  if (fields.priceCents !== undefined) {
    if (!Number.isInteger(fields.priceCents) || fields.priceCents < 0) {
      throw new Error("Price must be a whole number of cents, zero or more");
    }
  }
  if (fields.stock !== undefined && fields.stock !== null) {
    if (!Number.isInteger(fields.stock) || fields.stock < 0) {
      throw new Error("Stock must be a whole number, zero or more");
    }
  }
  if (fields.slug !== undefined && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(fields.slug)) {
    throw new Error("Slug may only contain lowercase letters, numbers, and hyphens");
  }
}

export const list = query({
  args: { now: v.number() },
  handler: async (ctx, args): Promise<AdminPiece[]> => {
    await requireAdmin(ctx);
    const pieces = await ctx.db
      .query("pieces")
      .withIndex("by_status_and_sortOrder")
      .take(MAX_PIECES);
    pieces.sort((a, b) => a.sortOrder - b.sortOrder);
    return Promise.all(pieces.map((piece) => toAdminPiece(ctx, piece, args.now)));
  },
});

export const get = query({
  args: { id: v.id("pieces"), now: v.number() },
  handler: async (ctx, args): Promise<AdminPiece | null> => {
    await requireAdmin(ctx);
    const piece = await ctx.db.get("pieces", args.id);
    return piece ? toAdminPiece(ctx, piece, args.now) : null;
  },
});

export const create = mutation({
  args: editableFields,
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    validate(args);
    await assertSlugFree(ctx, args.slug);

    const existing = await ctx.db.query("pieces").take(MAX_PIECES);
    const sortOrder =
      existing.length === 0
        ? 0
        : Math.max(...existing.map((p) => p.sortOrder)) + 1;

    return ctx.db.insert("pieces", {
      ...args,
      images: [],
      status: "draft",
      sortOrder,
    });
  },
});

export const update = mutation({
  // Derived from editableFields rather than retyped — Convex object validators
  // compose, and a hand-copied list drifts the moment a field is added.
  args: {
    id: v.id("pieces"),
    ...v.object(editableFields).partial().fields,
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const { id, ...patch } = args;
    validate(patch);
    if (patch.slug !== undefined) await assertSlugFree(ctx, patch.slug, id);
    // Any edit also retires the legacy fields on that document.
    await ctx.db.patch("pieces", id, {
      ...patch,
      collection: undefined,
      releaseAt: undefined,
    });
    return null;
  },
});

export const setStatus = mutation({
  args: { id: v.id("pieces"), status: pieceStatus },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch("pieces", args.id, { status: args.status });
    return null;
  },
});

/**
 * For pieces sold in person at a market. Sets stock to zero so the derived
 * availability reports "sold" without touching the editorial status.
 */
export const markSold = mutation({
  args: { id: v.id("pieces") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch("pieces", args.id, { stock: 0 });
    return null;
  },
});

/** Undo of markSold for a one-off that came back from the market unsold. */
export const markAvailable = mutation({
  args: { id: v.id("pieces") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const piece = await ctx.db.get("pieces", args.id);
    if (!piece) throw new Error("Piece not found");
    await ctx.db.patch("pieces", args.id, {
      stock: normalizeMode(piece.mode) === "madeToOrder" ? null : 1,
    });
    return null;
  },
});

export const reorder = mutation({
  args: { orderedIds: v.array(v.id("pieces")) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await Promise.all(
      args.orderedIds.map((id, index) =>
        ctx.db.patch("pieces", id, { sortOrder: index }),
      ),
    );
    return null;
  },
});

/** Permanent. Refused while any order references the piece. */
export const remove = mutation({
  args: { id: v.id("pieces") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const piece = await ctx.db.get("pieces", args.id);
    if (!piece) return null;
    const referenced = await ctx.db
      .query("orderItems")
      .withIndex("by_pieceId", (q) => q.eq("pieceId", args.id))
      .take(1);
    if (referenced.length > 0) {
      throw new Error("This piece has orders. Archive it instead of deleting.");
    }
    await ctx.db.delete("pieces", args.id);
    await Promise.all(piece.images.map((imageId) => ctx.storage.delete(imageId)));
    return null;
  },
});
