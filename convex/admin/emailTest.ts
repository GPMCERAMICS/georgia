import { v } from "convex/values";
import { action, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";
import { fromAddress, send } from "../emails";
import { requireAdmin } from "../lib/adminGuard";

/** Actions have no database, so the admin check runs as a query. */
export const assertAdmin = internalQuery({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return null;
  },
});

const MAX_TEST_RECIPIENTS = 5;

/**
 * Sends a short test message through the same path order emails take, and
 * reports back what the mail provider said for each address — so a domain
 * that is not verified yet shows up as a reason, not a silent nothing.
 */
export const sendTest = action({
  args: { to: v.array(v.string()) },
  handler: async (
    ctx,
    args,
  ): Promise<{ from: string; results: { to: string; ok: boolean; error: string | null }[] }> => {
    await ctx.runQuery(internal.admin.emailTest.assertAdmin, {});

    const recipients = [...new Set(args.to.map((address) => address.trim()).filter(Boolean))];
    if (recipients.length === 0) throw new Error("Enter at least one email address.");
    if (recipients.length > MAX_TEST_RECIPIENTS) {
      throw new Error(`Send to at most ${MAX_TEST_RECIPIENTS} addresses at a time.`);
    }
    for (const address of recipients) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
        throw new Error(`"${address}" is not an email address.`);
      }
    }
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not set on this deployment, so no email can be sent.");
    }

    const results = [];
    for (const to of recipients) {
      try {
        await send({
          to: [to],
          subject: "Test email from GPM Ceramics",
          text: [
            "This is a test from the GPM Ceramics dashboard.",
            "",
            "If you are reading it, the shop can send email to this address:",
            "order confirmations, shipping notices and sign-in codes will arrive the same way.",
          ].join("\n"),
        });
        results.push({ to, ok: true, error: null });
      } catch (error) {
        results.push({
          to,
          ok: false,
          error: error instanceof Error ? error.message : "The email could not be sent.",
        });
      }
    }
    return { from: fromAddress(), results };
  },
});
