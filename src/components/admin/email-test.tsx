"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";

/** Sends one made-up example of every email the shop sends to a single address. */
export function EmailTest() {
  const sendSamples = useAction(api.admin.emailTest.sendSamples);
  const [sampleTo, setSampleTo] = useState("");
  const [sendingSamples, setSendingSamples] = useState(false);
  const [which, setWhich] = useState<"all" | "customInvoice">("all");
  const [samples, setSamples] = useState<{
    from: string;
    to: string[];
    sent: string[];
    failed: { label: string; error: string }[];
  } | null>(null);
  const [samplesFailure, setSamplesFailure] = useState<string | null>(null);

  async function handleSamples() {
    setSendingSamples(true);
    setSamples(null);
    setSamplesFailure(null);
    try {
      setSamples(
        await sendSamples({
          to: sampleTo.trim(),
          only: which === "customInvoice" ? "customInvoice" : undefined,
        }),
      );
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
        <Label htmlFor="sampleWhich">What to send</Label>
        <NativeSelect
          id="sampleWhich"
          value={which}
          onChange={(e) => setWhich(e.target.value as "all" | "customInvoice")}
        >
          <option value="all">Every email</option>
          <option value="customInvoice">Custom order invoices only, with the PDF attached</option>
        </NativeSelect>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="sampleTo">Send to</Label>
        <Input
          id="sampleTo"
          placeholder="you@example.com, someone@example.com"
          value={sampleTo}
          onChange={(e) => setSampleTo(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Up to five addresses, separated by commas.
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        className="w-fit"
        disabled={sendingSamples || sampleTo.trim() === ""}
        onClick={() => void handleSamples()}
      >
        {sendingSamples ? "Sending…" : which === "all" ? "Send all samples" : "Send invoice samples"}
      </Button>
      {samplesFailure && (
        <p role="alert" className="text-sm text-destructive">
          {samplesFailure}
        </p>
      )}
      {samples && (
        <div className="grid gap-2 text-sm">
          <p>
            {samples.sent.length} sent to {samples.to.join(", ")} from {samples.from}
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
