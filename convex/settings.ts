import { query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

/**
 * Defaults used until Georgia saves the Settings screen for the first time.
 * Launch rates: $25 flat for a small item, $35 for a large one.
 */
export const DEFAULT_SETTINGS: Omit<Doc<"settings">, "_id" | "_creationTime"> =
  {
    storeName: "GPM Ceramics",
    notifyEmail: "",
    shipping: {
      plateCents: 2500,
      platterCents: 3500,
      freeOverCents: null,
    },
    pickup: {
      enabled: true,
      label: "Local pickup (St. Marys, GA)",
      instructions:
        "Georgia will email you to arrange a pickup time once your order is ready.",
    },
    taxEnabled: false,
    nextOrderNumber: 1001,
  };

export type Settings = typeof DEFAULT_SETTINGS;

/** Reads the singleton, or the defaults when nothing has been saved yet. */
export async function readSettings(ctx: QueryCtx | MutationCtx) {
  const doc = await ctx.db.query("settings").take(1);
  return doc[0] ?? null;
}

export async function getSettings(ctx: QueryCtx | MutationCtx): Promise<Settings> {
  const doc = await readSettings(ctx);
  if (doc === null) return DEFAULT_SETTINGS;
  const { _id, _creationTime, ...rest } = doc;
  void _id;
  void _creationTime;
  return rest;
}

/** Creates the singleton on first write so later patches have a target. */
export async function ensureSettings(ctx: MutationCtx): Promise<Doc<"settings">> {
  const existing = await readSettings(ctx);
  if (existing) return existing;
  const id = await ctx.db.insert("settings", DEFAULT_SETTINGS);
  const created = await ctx.db.get("settings", id);
  if (!created) throw new Error("Could not create settings");
  return created;
}

/** The subset of settings the storefront needs to price a cart. */
export const shippingOptions = query({
  args: {},
  handler: async (ctx) => {
    const settings = await getSettings(ctx);
    return {
      shipping: settings.shipping,
      pickup: settings.pickup,
    };
  },
});
