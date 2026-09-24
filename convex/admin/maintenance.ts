import { internalMutation } from "../_generated/server";
import { normalizeMode, pieceTags } from "../lib/pieceShape";
import { MAX_TAGS } from "../tags";
import { MAX_PIECES } from "./pieces";

/**
 * One-off operational helpers, runnable only via `npx convex run` (internal
 * functions are not exposed to clients, so no auth guard is needed).
 */
export const publishAllDrafts = internalMutation({
  args: {},
  handler: async (ctx) => {
    const pieces = await ctx.db.query("pieces").take(MAX_PIECES);
    const flipped: string[] = [];
    for (const piece of pieces) {
      if (piece.status === "draft") {
        await ctx.db.patch("pieces", piece._id, { status: "published" });
        flipped.push(piece.slug);
      }
    }
    return { published: flipped.length, slugs: flipped };
  },
});

/** Display names the old hardcoded collections carried. */
const LEGACY_COLLECTIONS: Record<string, { name: string; description: string }> = {
  wildlife: {
    name: "Coastal Living",
    description:
      "Georgia's Golden Isles set the backdrop for coastal themed wildlife " +
      "pieces of art. Handmade, hand painted and totally unique.",
  },
  totems: {
    name: "Garden and Floral",
    description:
      "Colorful pieces to brighten up your indoor and outdoor space. Totems, " +
      "vases and flower pots sculpted and painted by hand.",
  },
  heirloom: {
    name: "Heirloom",
    description: "Commemorative and custom pieces made to mark an occasion.",
  },
};

/**
 * Rewrites first-plan documents into the current shape:
 *   collection → tags, drop → oneoff, deposit → madeToOrder, releaseAt gone.
 * Creates a tag for each legacy collection that is still missing. Safe to run
 * more than once.
 *
 *   npx convex run admin/maintenance:migrateLegacyCatalog
 */
export const migrateLegacyCatalog = internalMutation({
  args: {},
  handler: async (ctx) => {
    const tags = await ctx.db.query("tags").take(MAX_TAGS);
    const known = new Set(tags.map((tag) => tag.slug));
    let nextSort = tags.length === 0 ? 0 : Math.max(...tags.map((t) => t.sortOrder)) + 1;
    const createdTags: string[] = [];

    for (const [slug, meta] of Object.entries(LEGACY_COLLECTIONS)) {
      if (known.has(slug)) continue;
      await ctx.db.insert("tags", {
        slug,
        name: meta.name,
        description: meta.description,
        sortOrder: nextSort++,
        featured: slug !== "heirloom",
        visible: true,
      });
      createdTags.push(slug);
    }

    const pieces = await ctx.db.query("pieces").take(MAX_PIECES);
    let migrated = 0;
    for (const piece of pieces) {
      const needs =
        piece.tags === undefined ||
        piece.collection !== undefined ||
        piece.releaseAt !== undefined ||
        piece.mode === "drop" ||
        piece.mode === "deposit";
      if (!needs) continue;
      await ctx.db.patch("pieces", piece._id, {
        tags: pieceTags(piece),
        mode: normalizeMode(piece.mode),
        collection: undefined,
        releaseAt: undefined,
      });
      migrated += 1;
    }
    return { migrated, createdTags };
  },
});
