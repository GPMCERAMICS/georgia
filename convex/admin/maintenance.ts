import { internalMutation } from "../_generated/server";

const MAX_PIECES = 500;

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
