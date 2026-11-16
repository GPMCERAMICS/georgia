import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { isEmail, normalizeEmail, subscribe as subscribeContact } from "./lib/contacts";

/**
 * The site's newsletter sign-up. Public by design. Signing up twice is
 * harmless, and the welcome email is sent once per address ever — so the form
 * cannot be used to send someone a stream of mail.
 */
export const subscribe = mutation({
  args: { email: v.string(), source: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const email = normalizeEmail(args.email);
    if (!isEmail(email)) throw new Error("Enter a valid email address.");
    const source = (args.source ?? "footer").slice(0, 40);
    const { contact, welcome } = await subscribeContact(ctx, email, source);
    if (welcome) {
      await ctx.scheduler.runAfter(0, internal.emails.newsletterWelcome, {
        email: contact.email,
        token: contact.token,
      });
    }
    return null;
  },
});

const kind = v.union(v.literal("newsletter"), v.literal("reminders"));

/** What an unsubscribe link's page shows before anything is changed. */
export const preferences = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const contact = await ctx.db
      .query("contacts")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!contact) return null;
    // Enough to recognise the address without printing it in full.
    const [local, domain] = contact.email.split("@");
    const masked = `${local.slice(0, 2)}${"•".repeat(Math.max(1, local.length - 2))}@${domain}`;
    return { email: masked, newsletter: contact.newsletter, remindersOff: contact.remindersOff };
  },
});

/** The link in an email's footer. The token is the proof of ownership. */
export const unsubscribe = mutation({
  args: { token: v.string(), kind },
  handler: async (ctx, args) => {
    const contact = await ctx.db
      .query("contacts")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!contact) return { ok: false };
    await ctx.db.patch(
      "contacts",
      contact._id,
      args.kind === "newsletter" ? { newsletter: false } : { remindersOff: true },
    );
    return { ok: true };
  },
});

/** Changed your mind: back on the list, from the same page. */
export const resubscribe = mutation({
  args: { token: v.string(), kind },
  handler: async (ctx, args) => {
    const contact = await ctx.db
      .query("contacts")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!contact) return { ok: false };
    await ctx.db.patch(
      "contacts",
      contact._id,
      args.kind === "newsletter"
        ? { newsletter: true, subscribedAt: Date.now() }
        : { remindersOff: false },
    );
    return { ok: true };
  },
});
