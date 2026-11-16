"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/button";

/**
 * The newsletter band that sits above the footer on every page. One field,
 * one button; the list it fills is under Newsletter in the dashboard.
 */
export function NewsletterSignup() {
  const subscribe = useMutation(api.newsletter.subscribe);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setState("sending");
    try {
      await subscribe({ email, source: "footer" });
      setState("done");
    } catch (err) {
      setState("idle");
      setError(
        err instanceof Error && err.message
          ? err.message.replace(/^.*Uncaught Error: /, "").split("\n")[0]
          : "Could not sign you up. Please try again.",
      );
    }
  }

  return (
    <section aria-labelledby="newsletter-heading" className="border-t border-border bg-background">
      <div className="mx-auto grid max-w-[1400px] items-center gap-8 px-6 py-16 md:grid-cols-2 md:gap-16 md:px-10 md:py-20">
        <div>
          <h2 id="newsletter-heading" className="font-display text-3xl leading-tight md:text-4xl">
            New pieces, first
          </h2>
          <p className="mt-3 max-w-md text-lg leading-relaxed">
            Most pieces are one of a kind and go quickly. Join the list to hear when new work
            comes out of the kiln.
          </p>
        </div>

        {state === "done" ? (
          <p role="status" className="font-display text-2xl">
            You are on the list. Thank you.
          </p>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <div className="flex flex-col gap-3 sm:flex-row">
              <label htmlFor="newsletter-email" className="sr-only">
                Email address
              </label>
              <input
                id="newsletter-email"
                type="email"
                required
                autoComplete="email"
                placeholder="Email address"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-14 w-full min-w-0 flex-1 border border-input bg-background px-4 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
              <Button type="submit" size="lg" className="h-14 px-8" disabled={state === "sending"}>
                {state === "sending" ? "Signing up…" : "Sign up"}
              </Button>
            </div>
            {error ? (
              <p role="alert" className="mt-3 text-sm text-destructive">
                {error}
              </p>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                Occasional emails only. Unsubscribe any time.
              </p>
            )}
          </form>
        )}
      </div>
    </section>
  );
}
