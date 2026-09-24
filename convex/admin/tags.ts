import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import type { MutationCtx } from "../_generated/server";
import { requireAdmin } from "../lib/adminGuard";
import { pieceTags } from "../lib/pieceShape";
import { MAX_TAGS } from "../tags";
import { MAX_PIECES } from "./pieces";

const editableFields = {
  name: v.string(),
  slug: v.string(),
  description: v.string(),
  featured: v.boolean(),
  visible: v.boolean(),
};

async function assertSlugFree(ctx: MutationCtx, slug: string, ignoreId?: string) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error("Slug may only contain lowercase letters, numbers, and hyphens");
  }
  const existing = await ctx.db
    .query("tags")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .unique();
  if (existing && existing._id !== ignoreId) {
    throw new Error(`A tag with the slug "${slug}" already exists`);
  }
}

/** Every tag, hidden ones included, with how many pieces carry each. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const [tags, pieces] = await Promise.all([
      ctx.db.query("tags").withIndex("by_sortOrder").order("asc").take(MAX_TAGS),
      ctx.db.query("pieces").take(MAX_PIECES),
    ]);
    const counts = new Map<string, number>();
    for (const piece of pieces) {
      for (const slug of pieceTags(piece)) {
        counts.set(slug, (counts.get(slug) ?? 0) + 1);
      }
    }
    return tags.map((tag) => ({ ...tag, pieceCount: counts.get(tag.slug) ?? 0 }));
  },
});

export const create = mutation({
  args: editableFields,
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await assertSlugFree(ctx, args.slug);
    const existing = await ctx.db.query("tags").take(MAX_TAGS);
    const sortOrder =
      existing.length === 0 ? 0 : Math.max(...existing.map((t) => t.sortOrder)) + 1;
    return ctx.db.insert("tags", { ...args, sortOrder });
  },
});

export const update = mutation({
  args: { id: v.id("tags"), ...v.object(editableFields).partial().fields },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const { id, ...patch } = args;
    const tag = await ctx.db.get("tags", id);
    if (!tag) throw new Error("Tag not found");
    if (patch.slug !== undefined && patch.slug !== tag.slug) {
      await assertSlugFree(ctx, patch.slug, id);
      // Pieces reference tags by slug, so a rename has to follow through.
      const pieces = await ctx.db.query("pieces").take(MAX_PIECES);
      for (const piece of pieces) {
        const tags = pieceTags(piece);
        if (tags.includes(tag.slug)) {
          await ctx.db.patch("pieces", piece._id, {
            tags: tags.map((slug) => (slug === tag.slug ? patch.slug! : slug)),
            collection: undefined,
          });
        }
      }
    }
    await ctx.db.patch("tags", id, patch);
    return null;
  },
});

export const reorder = mutation({
  args: { orderedIds: v.array(v.id("tags")) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await Promise.all(
      args.orderedIds.map((id, index) => ctx.db.patch("tags", id, { sortOrder: index })),
    );
    return null;
  },
});

/** Deletes the tag and strips it from every piece. */
export const remove = mutation({
  args: { id: v.id("tags") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const tag = await ctx.db.get("tags", args.id);
    if (!tag) return null;
    const pieces = await ctx.db.query("pieces").take(MAX_PIECES);
    for (const piece of pieces) {
      const tags = pieceTags(piece);
      if (tags.includes(tag.slug)) {
        await ctx.db.patch("pieces", piece._id, {
          tags: tags.filter((slug) => slug !== tag.slug),
          collection: undefined,
        });
      }
    }
    await ctx.db.delete("tags", args.id);
    return null;
  },
});
