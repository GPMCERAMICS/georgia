// Named export, despite the package's own docstring showing a default import.
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import type { DataModel } from "./_generated/dataModel";

/**
 * Email + password, not a magic link.
 *
 * There is exactly one operator, so a password avoids depending on an email
 * service being configured and correctly domain-verified just to log in.
 *
 * The ADMIN_EMAIL check here gates ACCOUNT CREATION, which is separate from
 * requireAdmin's gating of data access. Without it the sign-up form is open to
 * the world: strangers could not read anything, but they could fill the users
 * table, and with a magic-link provider they could also make the site send
 * mail from the owner's account to arbitrary addresses.
 */
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password<DataModel>({
      profile(params) {
        const email = String(params.email ?? "")
          .trim()
          .toLowerCase();
        const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();

        if (!adminEmail) {
          throw new Error("ADMIN_EMAIL is not configured on this deployment");
        }
        if (email !== adminEmail) {
          throw new Error("That email address cannot sign in here.");
        }
        return { email };
      },
    }),
  ],
});
