import { v } from "convex/values";
import { action, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";
import { fromAddress, replyToAddress, send, siteUrl } from "../emails";
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
  ): Promise<{ from: string; replyTo: string; results: { to: string; ok: boolean; error: string | null }[] }> => {
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
    return { from: fromAddress(), replyTo: replyToAddress(), results };
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
