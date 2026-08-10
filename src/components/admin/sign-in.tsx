"use client";

import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignIn() {
  const { signIn } = useAuthActions();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (sent) {
    return (
      <p className="text-sm text-muted-foreground">
        Check your email for a sign-in link.
      </p>
    );
  }

  return (
    <form
      className="flex w-full max-w-sm flex-col gap-3"
      onSubmit={async (event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        setPending(true);
        setError(null);
        try {
          await signIn("resend", formData);
          setSent(true);
        } catch {
          // Most often a missing or invalid AUTH_RESEND_KEY on the deployment.
          // Without this branch the form silently claims the mail was sent.
          setError("Could not send the sign-in link. Try again.");
        } finally {
          setPending(false);
        }
      }}
    >
      <Label htmlFor="email">Email</Label>
      <Input id="email" name="email" type="email" required />
      <Button type="submit" className="rounded-full" disabled={pending}>
        {pending ? "Sending…" : "Send sign-in link"}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </form>
  );
}
