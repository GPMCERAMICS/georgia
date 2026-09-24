"use client";

import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Flow = "signIn" | "signUp" | "reset" | "reset-verification";

const COPY: Record<Flow, { title: string; button: string }> = {
  signIn: { title: "Sign in", button: "Sign in" },
  signUp: { title: "Create your password", button: "Create account" },
  reset: { title: "Reset your password", button: "Email me a code" },
  "reset-verification": { title: "Enter the code", button: "Set new password" },
};

export function SignIn() {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const [flow, setFlow] = useState<Flow>("signIn");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("flow", flow);
    formData.set("email", email.trim().toLowerCase());
    setPending(true);
    setError(null);
    try {
      await signIn("password", formData);
      if (flow === "reset") {
        setFlow("reset-verification");
      } else {
        router.push("/admin");
      }
    } catch {
      setError(
        {
          signIn: "Could not sign in. Check the email and password, or reset it below.",
          signUp: "Could not create that account. Only the admin email is allowed.",
          reset: "Could not send a code. Check the email address.",
          "reset-verification": "That code did not work. Request a new one and try again.",
        }[flow],
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="flex w-full flex-col gap-3" onSubmit={handleSubmit}>
      <h1 className="mb-2 font-display text-2xl">{COPY[flow].title}</h1>

      <Label htmlFor="email">Email</Label>
      <Input
        id="email"
        name="email"
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        readOnly={flow === "reset-verification"}
      />

      {flow === "reset-verification" && (
        <>
          <Label htmlFor="code">Code from your email</Label>
          <Input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" required />
        </>
      )}

      {flow !== "reset" && (
        <>
          <Label htmlFor="password">{flow === "reset-verification" ? "New password" : "Password"}</Label>
          <Input
            id="password"
            name={flow === "reset-verification" ? "newPassword" : "password"}
            type="password"
            required
            minLength={8}
            autoComplete={flow === "signIn" ? "current-password" : "new-password"}
          />
        </>
      )}

      <Button type="submit" className="mt-2 rounded-full" disabled={pending}>
        {pending ? "Working…" : COPY[flow].button}
      </Button>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="mt-2 flex flex-col gap-1 text-sm text-muted-foreground">
        {flow === "signIn" && (
          <>
            <button type="button" className="w-fit underline" onClick={() => setFlow("reset")}>
              Forgot your password?
            </button>
            <button type="button" className="w-fit underline" onClick={() => setFlow("signUp")}>
              First time? Create your password
            </button>
          </>
        )}
        {flow !== "signIn" && (
          <button type="button" className="w-fit underline" onClick={() => setFlow("signIn")}>
            Back to sign in
          </button>
        )}
      </div>
    </form>
  );
}
