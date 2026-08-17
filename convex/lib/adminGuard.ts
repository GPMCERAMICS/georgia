import { getAuthUserId } from "@convex-dev/auth/server";
import type { MutationCtx, QueryCtx } from "../_generated/server";

/**
 * Georgia is the only user. Rather than a role system, we compare the signed-in
 * email against ADMIN_EMAIL. Anyone else who completes a magic link gets an
 * account with no capabilities.
 */
export async function requireAdmin(ctx: QueryCtx | MutationCtx): Promise<void> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Not authorised");

  const user = await ctx.db.get("users", userId);
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!adminEmail) {
    throw new Error("ADMIN_EMAIL is not configured on the Convex deployment");
  }
  if (!user || user.email?.toLowerCase() !== adminEmail.toLowerCase()) {
    throw new Error("Not authorised");
  }
}
