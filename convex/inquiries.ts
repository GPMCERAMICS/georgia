import { v } from "convex/values";
import { internalQuery, mutation } from "./_generated/server";
import { internal } from "./_generated/api";

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

/**
 * The commission form. Public by design — anyone can inquire. Stored first,
 * emailed second, so a mail outage never loses a lead: it still shows up in
 * the dashboard.
 */
export const submit = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    type: v.string(),
    budget: v.string(),
    message: v.string(),
    pieceId: v.union(v.id("pieces"), v.null()),
  },
  handler: async (ctx, args) => {
    const name = args.name.trim().slice(0, 200);
    const email = args.email.trim().toLowerCase().slice(0, 200);
    const message = args.message.trim().slice(0, 5000);
    if (!name || !email || !message || !isEmail(email)) {
      throw new Error("Please add your name, a valid email, and a message.");
    }
    const id = await ctx.db.insert("inquiries", {
      name,
      email,
      type: args.type.trim().slice(0, 200),
      budget: args.budget.trim().slice(0, 200),
      message,
      status: "new",
      notes: "",
      pieceId: args.pieceId,
    });
    await ctx.scheduler.runAfter(0, internal.emails.inquiryReceived, { inquiryId: id });
    return null;
  },
});

export const getInternal = internalQuery({
  args: { id: v.id("inquiries") },
  handler: async (ctx, args) => ctx.db.get("inquiries", args.id),
});
