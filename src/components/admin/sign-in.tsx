"use client";

import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignIn() {
  const { signIn } = useAuthActions();
  const router = useRouter();
  // First visit has no account yet, so the form has to be able to create one.
  // Only ADMIN_EMAIL can sign up at all — see convex/auth.ts.
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="flex w-full max-w-sm flex-col gap-3"
      onSubmit={async (event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        formData.set("flow", flow);
        setPending(true);
        setError(null);
        try {
          await signIn("password", formData);
          router.push("/admin");
        } catch {
          setError(
            flow === "signIn"
              ? "Could not sign in. Check the email and password, or create the account first."
              : "Could not create that account. Only the admin email is allowed.",
          );
        } finally {
          setPending(false);
        }
      }}
    >
      <Label htmlFor="email">Email</Label>
      <Input id="email" name="email" type="email" required />

      <Label htmlFor="password">Password</Label>
      <Input
        id="password"
        name="password"
        type="password"
        required
        minLength={8}
        autoComplete={flow === "signUp" ? "new-password" : "current-password"}
      />

      <Button type="submit" className="rounded-full" disabled={pending}>
        {pending
          ? "Working…"
          : flow === "signIn"
            ? "Sign in"
            : "Create account"}
      </Button>

      <button
        type="button"
        className="text-left text-sm text-muted-foreground underline"
        onClick={() => {
          setFlow(flow === "signIn" ? "signUp" : "signIn");
          setError(null);
        }}
      >
        {flow === "signIn"
          ? "First time? Create your password"
          : "Already have an account? Sign in"}
      </button>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </form>
  );
}
