import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireAdmin } from "../lib/adminGuard";
import { settingsFields } from "../schema";
import { ensureSettings, getSettings } from "../settings";

/** Everything but the order-number sequence, which only checkout advances. */
const { nextOrderNumber, ...editable } = settingsFields;
void nextOrderNumber;

export const get = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return getSettings(ctx);
  },
});

export const update = mutation({
  args: v.object(editable).partial().fields,
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const rates = args.shipping;
    if (rates) {
      for (const cents of [rates.plateCents, rates.platterCents, rates.freeOverCents]) {
        if (cents !== null && (!Number.isInteger(cents) || cents < 0)) {
          throw new Error("Shipping rates must be whole cents, zero or more");
        }
      }
    }
    const settings = await ensureSettings(ctx);
    await ctx.db.patch("settings", settings._id, args);
    return null;
  },
});
