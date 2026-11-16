import { v } from "convex/values";
import { action, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";
import { fromAddress, send, siteUrl } from "../emails";
import { sampleEmails } from "../lib/emailSamples";
import { requireAdmin } from "../lib/adminGuard";

/** Actions have no database, so the admin check runs as a query. */
export const assertAdmin = internalQuery({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return null;
  },
});

/** Resend allows two requests a second; samples are spaced to stay under it. */
const SAMPLE_SPACING_MS = 650;

/**
 * Sends one made-up example of every email the shop can send to a single
 * address, numbered so they can be reviewed in order.
 */
export const sendSamples = action({
  args: { to: v.string() },
  handler: async (
    ctx,
    args,
  ): Promise<{ from: string; sent: string[]; failed: { label: string; error: string }[] }> => {
    await ctx.runQuery(internal.admin.emailTest.assertAdmin, {});
    const to = args.to.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      throw new Error(`"${to}" is not an email address.`);
    }
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not set on this deployment, so no email can be sent.");
    }

    const samples = sampleEmails(siteUrl());
    const sent: string[] = [];
    const failed: { label: string; error: string }[] = [];
    for (const [index, sample] of samples.entries()) {
      const number = `${index + 1}/${samples.length}`;
      try {
        await send({
          to: [to],
          subject: `[Sample ${number}] ${sample.email.subject}`,
          text: sample.email.text,
          html: sample.email.html,
        });
        sent.push(sample.label);
      } catch (error) {
        failed.push({
          label: sample.label,
          error: error instanceof Error ? error.message : "The email could not be sent.",
        });
      }
      await new Promise((resolve) => setTimeout(resolve, SAMPLE_SPACING_MS));
    }
    return { from: fromAddress(), sent, failed };
  },
});
