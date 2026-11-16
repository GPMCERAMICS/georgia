import { query } from "../_generated/server";
import { requireAdmin } from "../lib/adminGuard";

/** Subscribers shown at once. Export and paginate well before this. */
const MAX_SUBSCRIBERS = 2000;

/** Everyone currently on the newsletter list, newest first. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const contacts = await ctx.db
      .query("contacts")
      .withIndex("by_newsletter", (q) => q.eq("newsletter", true))
      .order("desc")
      .take(MAX_SUBSCRIBERS);
    return contacts
      .map((contact) => ({
        _id: contact._id,
        email: contact.email,
        source: contact.source,
        subscribedAt: contact.subscribedAt ?? contact._creationTime,
      }))
      .sort((a, b) => b.subscribedAt - a.subscribedAt);
  },
});
