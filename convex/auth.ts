// Named export, despite the package's own docstring showing a default import.
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import type { DataModel } from "./_generated/dataModel";
import { isAdminEmail } from "./lib/adminEmails";
import { ResendOTPPasswordReset } from "./lib/resendOtp";

/**
 * Email + password, with an emailed code for resets.
 *
 * There is exactly one operator, so a password avoids depending on an email
 * service just to log in; the reset flow is the one place email is needed.
 *
 * The ADMIN_EMAIL check here gates ACCOUNT CREATION, which is separate from
 * requireAdmin's gating of data access. Without it the sign-up form is open to
 * the world: strangers could not read anything, but they could fill the users
 * table.
 */
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password<DataModel>({
      reset: ResendOTPPasswordReset,
      profile(params) {
        const email = String(params.email ?? "")
          .trim()
          .toLowerCase();

        if (!isAdminEmail(email)) {
          throw new Error("That email address cannot sign in here.");
        }
        return { email };
      },
    }),
  ],
});
