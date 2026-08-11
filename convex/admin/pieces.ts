import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import type { MutationCtx } from "../_generated/server";
import { requireAdmin } from "../lib/adminGuard";
import {
  pieceCollection,
  pieceMode,
  pieceStatus,
  shippingTier,
} from "../schema";

/** Convex forbids unbounded .collect(); the catalog is far below this. */
const MAX_PIECES = 500;

const editableFields = {
  title: v.string(),
  slug: v.string(),
  description: v.string(),
  size: v.union(v.string(), v.null()),
  collection: pieceCollection,
  mode: pieceMode,
  priceCents: v.number(),
  stock: v.union(v.number(), v.null()),
  releaseAt: v.union(v.number(), v.null()),
  leadTimeWeeks: v.union(v.number(), v.null()),
  shippingTier,
};

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

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const pieces = await ctx.db
      .query("pieces")
      .withIndex("by_status_and_sortOrder")
      .take(MAX_PIECES);
    return pieces.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

export const create = mutation({
  args: editableFields,
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
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
    if (patch.slug !== undefined) await assertSlugFree(ctx, patch.slug, id);
    await ctx.db.patch("pieces", id, patch);
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
