import { getAuthUserId } from "@convex-dev/auth/server";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { isAdminEmail } from "./adminEmails";

/**
 * Rather than a role system, we compare the signed-in email against the
 * ADMIN_EMAIL allowlist. Anyone else who somehow gets an account has no
 * capabilities.
 */
export async function requireAdmin(ctx: QueryCtx | MutationCtx): Promise<void> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Not authorised");

  const user = await ctx.db.get("users", userId);
  if (!user || !isAdminEmail(user.email)) {
    throw new Error("Not authorised");
  }
}
