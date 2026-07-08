"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { commissionTypes } from "@/lib/site";

type Status = "idle" | "submitting" | "success";

export function CommissionForm() {
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());

    setStatus("submitting");
    try {
      const res = await fetch("/api/commission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Request failed");
      }
      form.reset();
      setStatus("success");
      toast.success("Thanks! Your inquiry is on its way to Georgia.");
    } catch (err) {
      setStatus("idle");
      toast.error(
        err instanceof Error && err.message
          ? err.message
          : "Something went wrong. Please email us directly.",
      );
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/12 text-primary">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h3 className="font-display text-2xl">Message received</h3>
        <p className="mt-2 text-muted-foreground">
          Georgia reads every inquiry personally and will be in touch soon.
        </p>
        <Button
          variant="outline"
          className="mt-6 rounded-full border-primary/30 bg-transparent"
          onClick={() => setStatus("idle")}
        >
          Send another
        </Button>
      </div>
    );
  }

  const submitting = status === "submitting";

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8"
    >
      {/* Honeypot: hidden from users, catches bots. Leave empty. */}
      <div className="absolute left-[-9999px]" aria-hidden="true">
        <label htmlFor="company">Company</label>
        <input id="company" name="company" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" required autoComplete="name" placeholder="Your name" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="type">What are you after?</Label>
          <select
            id="type"
            name="type"
            defaultValue=""
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <option value="" disabled>
              Select a type…
            </option>
            {commissionTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="budget">Budget (optional)</Label>
          <Input id="budget" name="budget" placeholder="e.g. $150–$300" />
        </div>
      </div>

      <div className="mt-5 grid gap-2">
        <Label htmlFor="message">Tell Georgia about your piece</Label>
        <Textarea
          id="message"
          name="message"
          required
          rows={5}
          placeholder="Colors, size, how you'll use it, any timeline…"
        />
      </div>

      <Button
        type="submit"
        size="lg"
        disabled={submitting}
        className="mt-6 w-full rounded-full sm:w-auto sm:px-10"
      >
        {submitting ? "Sending…" : "Send inquiry"}
      </Button>
    </form>
  );
}
