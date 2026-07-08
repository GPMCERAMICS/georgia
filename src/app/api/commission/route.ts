import { NextResponse } from "next/server";
import { Resend } from "resend";
import { site } from "@/lib/site";

export const runtime = "nodejs";

type Payload = {
  name?: string;
  email?: string;
  type?: string;
  budget?: string;
  message?: string;
  company?: string; // honeypot — must be empty
};

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

export async function POST(req: Request) {
  let body: Payload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Bot caught by the honeypot — pretend success, send nothing.
  if (body.company) {
    return NextResponse.json({ ok: true });
  }

  const name = body.name?.trim();
  const email = body.email?.trim();
  const message = body.message?.trim();

  if (!name || !email || !message || !isEmail(email)) {
    return NextResponse.json(
      { error: "Please add your name, a valid email, and a message." },
      { status: 400 },
    );
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL ?? site.email;
  const from =
    process.env.CONTACT_FROM_EMAIL ?? "Commissions <onboarding@resend.dev>";

  if (!apiKey) {
    // Not configured yet — fail loudly in logs, gently to the visitor.
    console.error("RESEND_API_KEY is not set; cannot send commission email.");
    return NextResponse.json(
      { error: "The form isn't quite ready. Please email us directly." },
      { status: 503 },
    );
  }

  const resend = new Resend(apiKey);
  const type = body.type?.trim() || "Not specified";
  const budget = body.budget?.trim() || "Not specified";

  try {
    const { error } = await resend.emails.send({
      from,
      to,
      replyTo: email,
      subject: `New commission inquiry — ${name}`,
      text: [
        `Name: ${name}`,
        `Email: ${email}`,
        `Type: ${type}`,
        `Budget: ${budget}`,
        "",
        "Message:",
        message,
      ].join("\n"),
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json(
        { error: "Could not send right now. Please email us directly." },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Unexpected error sending commission email:", err);
    return NextResponse.json(
      { error: "Could not send right now. Please email us directly." },
      { status: 500 },
    );
  }
}
