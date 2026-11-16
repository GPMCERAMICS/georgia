import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

export const normalizeEmail = (value: string) => value.trim().toLowerCase();

export const isEmail = (value: string) =>
  value.length <= 200 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

/** An unguessable handle for unsubscribe links. */
function newToken(): string {
  let token = "";
  while (token.length < 40) token += Math.random().toString(36).slice(2);
  return token.slice(0, 40);
}

export async function findContact(
  ctx: QueryCtx | MutationCtx,
  email: string,
): Promise<Doc<"contacts"> | null> {
  return ctx.db
    .query("contacts")
    .withIndex("by_email", (q) => q.eq("email", normalizeEmail(email)))
    .unique();
}

/** The contact row for an address, created (subscribed to nothing) if new. */
export async function ensureContact(ctx: MutationCtx, email: string): Promise<Doc<"contacts">> {
  const existing = await findContact(ctx, email);
  if (existing) return existing;
  const id = await ctx.db.insert("contacts", {
    email: normalizeEmail(email),
    token: newToken(),
    newsletter: false,
    source: null,
    subscribedAt: null,
    remindersOff: false,
    welcomedAt: null,
  });
  const created = await ctx.db.get("contacts", id);
  if (!created) throw new Error("Could not create contact");
  return created;
}

/**
 * Adds an address to the newsletter. Returns whether a welcome email is due:
 * only the first time an address ever joins, so re-subscribing (or someone
 * re-submitting the form with another person's address) never sends twice.
 */
export async function subscribe(
  ctx: MutationCtx,
  email: string,
  source: string,
): Promise<{ contact: Doc<"contacts">; welcome: boolean }> {
  const contact = await ensureContact(ctx, email);
  const welcome = contact.welcomedAt === null;
  const now = Date.now();
  await ctx.db.patch("contacts", contact._id, {
    newsletter: true,
    source: contact.source ?? source,
    subscribedAt: contact.newsletter ? contact.subscribedAt : now,
    welcomedAt: contact.welcomedAt ?? now,
  });
  return { contact, welcome };
}
