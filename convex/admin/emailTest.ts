import { v } from "convex/values";
import { action, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";
import { fromAddress, invoiceAttachment, send, siteUrl } from "../emails";
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
/** Addresses one run of samples may go to. */
const MAX_SAMPLE_RECIPIENTS = 5;

/**
 * Sends one made-up example of every email the shop can send to a single
 * address, numbered so they can be reviewed in order.
 */
export const sendSamples = action({
  args: {
    // One address, or several separated by commas.
    to: v.string(),
    // Leave out for every email; "customInvoice" sends just the custom
    // order quote and final invoice, each with its PDF attached.
    only: v.optional(v.literal("customInvoice")),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ from: string; to: string[]; sent: string[]; failed: { label: string; error: string }[] }> => {
    await ctx.runQuery(internal.admin.emailTest.assertAdmin, {});
    const to = [...new Set(args.to.split(/[,;\s]+/).map((address) => address.trim()).filter(Boolean))];
    if (to.length === 0) throw new Error("Enter an email address.");
    if (to.length > MAX_SAMPLE_RECIPIENTS) {
      throw new Error(`Send to at most ${MAX_SAMPLE_RECIPIENTS} addresses at a time.`);
    }
    for (const address of to) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
        throw new Error(`"${address}" is not an email address.`);
      }
    }
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not set on this deployment, so no email can be sent.");
    }

    const all = sampleEmails(siteUrl());
    const samples =
      args.only === "customInvoice"
        ? all.filter((sample) => sample.id === "custom-deposit" || sample.id === "custom-final")
        : all;
    const sent: string[] = [];
    const failed: { label: string; error: string }[] = [];
    for (const [index, sample] of samples.entries()) {
      const number = `${index + 1}/${samples.length}`;
      try {
        await send({
          to,
          subject: `[Sample ${number}] ${sample.email.subject}`,
          text: sample.email.text,
          html: sample.email.html,
          attachments: sample.invoice
            ? await invoiceAttachment(ctx, sample.invoice.data, sample.invoice.stage)
            : undefined,
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
    return { from: fromAddress(), to, sent, failed };
  },
});
