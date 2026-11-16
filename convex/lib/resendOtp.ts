import Resend from "@auth/core/providers/resend";
import { resetCode } from "./emailTemplates";

/**
 * Emails an 8-digit code for the password reset flow.
 *
 * Uses Resend's HTTP API directly (same as `emails.ts`) so nothing extra is
 * bundled into the auth module. RESEND_API_KEY and RESEND_FROM_EMAIL are the
 * same variables the order emails use.
 */
export const ResendOTPPasswordReset = Resend({
  id: "resend-otp",
  apiKey: process.env.RESEND_API_KEY,
  async generateVerificationToken() {
    const bytes = new Uint32Array(1);
    crypto.getRandomValues(bytes);
    return String(bytes[0] % 100_000_000).padStart(8, "0");
  },
  async sendVerificationRequest({ identifier: email, provider, token }) {
    if (!provider.apiKey) {
      throw new Error("RESEND_API_KEY is not set; cannot send a reset code");
    }
    const from =
      process.env.RESEND_FROM_EMAIL ?? "GPM Ceramics <info@sales.gpmceramics.com>";
    const message = resetCode({
      siteUrl: (process.env.SITE_URL ?? "https://www.gpmceramics.com").replace(/\/$/, ""),
      code: token,
    });
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${provider.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject: message.subject,
        text: message.text,
        html: message.html,
      }),
    });
    if (!response.ok) {
      throw new Error(`Resend ${response.status}: ${await response.text()}`);
    }
  },
});
