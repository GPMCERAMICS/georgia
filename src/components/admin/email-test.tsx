"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Result = { to: string; ok: boolean; error: string | null };

/** Sends a test message and shows what the mail provider said for each address. */
export function EmailTest() {
  const sendTest = useAction(api.admin.emailTest.sendTest);
  const [to, setTo] = useState("");
  const [sending, setSending] = useState(false);
  const [outcome, setOutcome] = useState<{ from: string; results: Result[] } | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  async function handleSend() {
    setSending(true);
    setOutcome(null);
    setFailure(null);
    try {
      setOutcome(await sendTest({ to: to.split(/[,\s]+/).filter(Boolean) }));
    } catch (error) {
      setFailure(
        error instanceof Error && error.message
          ? error.message.replace(/^.*Uncaught Error: /, "").split("\n")[0]
          : "Could not send the test email.",
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="grid gap-4 border border-border bg-card p-5">
      <h2 className="font-display text-xl">Test email</h2>
      <p className="-mt-2 text-sm text-muted-foreground">
        Sends a short message the same way order emails go out, so you can check delivery.
      </p>
      <div className="grid gap-1.5">
        <Label htmlFor="testTo">Send to</Label>
        <Input
          id="testTo"
          placeholder="one@example.com, two@example.com"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
      </div>
      <Button
        type="button"
        variant="outline"
        className="w-fit"
        disabled={sending || to.trim() === ""}
        onClick={() => void handleSend()}
      >
        {sending ? "Sending…" : "Send test email"}
      </Button>

      {failure && (
        <p role="alert" className="text-sm text-destructive">
          {failure}
        </p>
      )}
      {outcome && (
        <div className="grid gap-2 text-sm">
          <p className="text-muted-foreground">Sent from: {outcome.from}</p>
          <ul className="grid gap-1.5">
            {outcome.results.map((result) => (
              <li key={result.to} className={result.ok ? "" : "text-destructive"}>
                {result.ok
                  ? `${result.to}: accepted for delivery`
                  : `${result.to}: failed. ${result.error}`}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
