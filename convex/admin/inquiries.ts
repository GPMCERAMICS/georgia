import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireAdmin } from "../lib/adminGuard";
import { inquiryStatus } from "../schema";

const MAX_INQUIRIES = 500;

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const inquiries = await ctx.db.query("inquiries").order("desc").take(MAX_INQUIRIES);
    return Promise.all(
      inquiries.map(async (inquiry) => {
        const piece = inquiry.pieceId ? await ctx.db.get("pieces", inquiry.pieceId) : null;
        return { ...inquiry, pieceTitle: piece?.title ?? null, pieceSlug: piece?.slug ?? null };
      }),
    );
  },
});

export const setStatus = mutation({
  args: { id: v.id("inquiries"), status: inquiryStatus },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch("inquiries", args.id, { status: args.status });
    return null;
  },
});

export const updateNotes = mutation({
  args: { id: v.id("inquiries"), notes: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch("inquiries", args.id, { notes: args.notes.slice(0, 5000) });
    return null;
  },
});

export const remove = mutation({
  args: { id: v.id("inquiries") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete("inquiries", args.id);
    return null;
  },
});
