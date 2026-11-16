"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/button";

type Kind = "newsletter" | "reminders";

const COPY: Record<Kind, { question: string; confirm: string; done: string; undo: string }> = {
  newsletter: {
    question: "Stop receiving news from GPM Ceramics?",
    confirm: "Unsubscribe",
    done: "You have been unsubscribed. You will not receive any more news from us.",
    undo: "Subscribe again",
  },
  reminders: {
    question: "Stop receiving reminders about unfinished checkouts?",
    confirm: "Stop reminders",
    done: "Done. We will not send you any more checkout reminders.",
    undo: "Turn reminders back on",
  },
};

/**
 * Where the unsubscribe link in an email lands. It asks before changing
 * anything, because mail scanners follow links and a visit alone must not
 * unsubscribe anyone. Emails about an order you placed are not affected.
 */
export function Unsubscribe({ token, kind }: { token: string; kind: Kind }) {
  const preferences = useQuery(api.newsletter.preferences, token ? { token } : "skip");
  const unsubscribe = useMutation(api.newsletter.unsubscribe);
  const resubscribe = useMutation(api.newsletter.resubscribe);
  const [busy, setBusy] = useState(false);
  const copy = COPY[kind];

  if (!token || preferences === null) {
    return (
      <div>
        <h1 className="font-display text-4xl">This link has expired</h1>
        <p className="mt-4 text-lg leading-relaxed">
          We could not find your email preferences from this link. Reply to any email from us
          and we will take you off the list by hand.
        </p>
      </div>
    );
  }
  if (preferences === undefined) {
    return <p className="text-muted-foreground">Loading your preferences…</p>;
  }

  const off = kind === "newsletter" ? !preferences.newsletter : preferences.remindersOff;

  async function change(action: typeof unsubscribe) {
    setBusy(true);
    try {
      await action({ token, kind });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-4xl leading-tight">Email preferences</h1>
      <p className="mt-3 text-muted-foreground">{preferences.email}</p>

      {off ? (
        <>
          <p role="status" className="mt-8 text-lg leading-relaxed">
            {copy.done}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/shop">Back to the shop</Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              disabled={busy}
              onClick={() => void change(resubscribe)}
            >
              {copy.undo}
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="mt-8 text-lg leading-relaxed">{copy.question}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Emails about an order you have placed, such as confirmations and shipping updates,
            are not affected.
          </p>
          <Button className="mt-8" size="lg" disabled={busy} onClick={() => void change(unsubscribe)}>
            {busy ? "Saving…" : copy.confirm}
          </Button>
        </>
      )}
    </div>
  );
}
