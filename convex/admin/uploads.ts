import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireAdmin } from "../lib/adminGuard";

/**
 * The piece's photos paired with their storage ids.
 *
 * The public catalog only ever needs URLs, but the admin UI has to be able to
 * name a specific file to remove it, and a URL is not a stable handle.
 */
export const listImages = query({
  args: { pieceId: v.id("pieces") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const piece = await ctx.db.get("pieces", args.pieceId);
    if (!piece) return [];

    const images = await Promise.all(
      piece.images.map(async (storageId) => ({
        storageId,
        url: await ctx.storage.getUrl(storageId),
      })),
    );
    // A file can vanish from storage independently of the piece document.
    return images.filter(
      (image): image is { storageId: typeof image.storageId; url: string } =>
        image.url !== null,
    );
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return ctx.storage.generateUploadUrl();
  },
});

export const attachImage = mutation({
  args: { pieceId: v.id("pieces"), storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const piece = await ctx.db.get("pieces", args.pieceId);
    if (!piece) throw new Error("Piece not found");
    await ctx.db.patch("pieces", args.pieceId, {
      images: [...piece.images, args.storageId],
    });
    return null;
  },
});

export const removeImage = mutation({
  args: { pieceId: v.id("pieces"), storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const piece = await ctx.db.get("pieces", args.pieceId);
    if (!piece) throw new Error("Piece not found");

    // Only act if the piece still references this storage id. This makes the
    // mutation idempotent under retries/double-clicks: a second call for an
    // already-removed id is a pure no-op instead of re-issuing a storage
    // delete against a file that (as far as this piece is concerned) is
    // already gone.
    if (!piece.images.includes(args.storageId)) return null;

    // Drop the reference before deleting the underlying file. Both writes
    // land in the same mutation transaction, so they commit or roll back
    // together — but ordering them this way means that if anything were to
    // go wrong, the failure mode is an orphaned file still in storage, never
    // a piece document pointing at a file that no longer exists.
    await ctx.db.patch("pieces", args.pieceId, {
      images: piece.images.filter((id) => id !== args.storageId),
    });
    await ctx.storage.delete(args.storageId);
    return null;
  },
});
