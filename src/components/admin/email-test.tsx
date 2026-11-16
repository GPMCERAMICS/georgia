"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Sends one made-up example of every email the shop sends to a single address. */
export function EmailTest() {
  const sendSamples = useAction(api.admin.emailTest.sendSamples);
  const [sampleTo, setSampleTo] = useState("");
  const [sendingSamples, setSendingSamples] = useState(false);
  const [samples, setSamples] = useState<{
    from: string;
    sent: string[];
    failed: { label: string; error: string }[];
  } | null>(null);
  const [samplesFailure, setSamplesFailure] = useState<string | null>(null);

  async function handleSamples() {
    setSendingSamples(true);
    setSamples(null);
    setSamplesFailure(null);
    try {
      setSamples(await sendSamples({ to: sampleTo.trim() }));
    } catch (error) {
      setSamplesFailure(
        error instanceof Error && error.message
          ? error.message.replace(/^.*Uncaught Error: /, "").split("\n")[0]
          : "Could not send the samples.",
      );
    } finally {
      setSendingSamples(false);
    }
  }
  return (
    <section className="grid gap-4 border border-border bg-card p-5">
      <h2 className="font-display text-xl">Sample of every email</h2>
      <p className="-mt-2 text-sm text-muted-foreground">
        Sends one made-up example of each email the shop can send — confirmation, shipped,
        pickup, delivered, refund, reminders and the rest — numbered in order. It takes
        about fifteen seconds.
      </p>
      <div className="grid gap-1.5">
        <Label htmlFor="sampleTo">Send them to</Label>
        <Input
          id="sampleTo"
          type="email"
          placeholder="you@example.com"
          value={sampleTo}
          onChange={(e) => setSampleTo(e.target.value)}
        />
      </div>
      <Button
        type="button"
        variant="outline"
        className="w-fit"
        disabled={sendingSamples || sampleTo.trim() === ""}
        onClick={() => void handleSamples()}
      >
        {sendingSamples ? "Sending samples…" : "Send all samples"}
      </Button>
      {samplesFailure && (
        <p role="alert" className="text-sm text-destructive">
          {samplesFailure}
        </p>
      )}
      {samples && (
        <div className="grid gap-2 text-sm">
          <p>
            {samples.sent.length} sent from {samples.from}
            {samples.failed.length > 0 ? `, ${samples.failed.length} failed` : ""}.
          </p>
          {samples.failed.length > 0 && (
            <ul className="grid gap-1.5 text-destructive">
              {samples.failed.map((failure) => (
                <li key={failure.label}>
                  {failure.label}: {failure.error}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
