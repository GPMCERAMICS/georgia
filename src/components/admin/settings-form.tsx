"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "./admin-shell";
import { EmailTest } from "./email-test";

type Settings = NonNullable<ReturnType<typeof useQuery<typeof api.admin.settings.get>>>;

/** Loads once, then hands the settled values to the form as initial state. */
export function SettingsForm() {
  const settings = useQuery(api.admin.settings.get);
  if (settings === undefined) {
    return (
      <div>
        <PageHeader title="Settings" />
        <Skeleton className="h-64 w-full max-w-2xl rounded-2xl" />
      </div>
    );
  }
  return <SettingsFields initial={settings} />;
}

function SettingsFields({ initial }: { initial: Settings }) {
  const update = useMutation(api.admin.settings.update);

  const [storeName, setStoreName] = useState(initial.storeName);
  const [notifyEmail, setNotifyEmail] = useState(initial.notifyEmail);
  const [pickupEnabled, setPickupEnabled] = useState(initial.pickup.enabled);
  const [pickupLabel, setPickupLabel] = useState(initial.pickup.label);
  const [pickupInstructions, setPickupInstructions] = useState(initial.pickup.instructions);
  const [taxEnabled, setTaxEnabled] = useState(initial.taxEnabled);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await update({
        storeName: storeName.trim(),
        notifyEmail: notifyEmail.trim(),
        // Unused now that shipping is included; passed through unchanged.
        shipping: initial.shipping,
        pickup: {
          enabled: pickupEnabled,
          label: pickupLabel.trim() || "Local pickup",
          instructions: pickupInstructions.trim(),
        },
        taxEnabled,
      });
      toast.success("Settings saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader title="Settings" description="Pickup, tax, and where notifications go." />
      <form onSubmit={handleSubmit} className="flex max-w-2xl flex-col gap-6">
        <section className="grid gap-4 rounded-2xl border border-border bg-card p-5">
          <h2 className="font-display text-xl">Store</h2>
          <div className="grid gap-1.5">
            <Label htmlFor="storeName">Store name</Label>
            <Input id="storeName" value={storeName} onChange={(e) => setStoreName(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="notifyEmail">Send order and inquiry notifications to</Label>
            <Input
              id="notifyEmail"
              type="email"
              placeholder="Leave blank to use the admin sign-in email"
              value={notifyEmail}
              onChange={(e) => setNotifyEmail(e.target.value)}
            />
          </div>
        </section>

        <section className="grid gap-2 border border-border bg-card p-5">
          <h2 className="font-display text-xl">Shipping</h2>
          <p className="text-sm text-muted-foreground">
            Shipping is free on every order, so there are no rates to set.
            Orders ship within the continental US only (the lower 48 states and DC); the
            cart checks the address before checkout.
          </p>
        </section>

        <section className="grid gap-4 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl">Local pickup</h2>
            <Switch checked={pickupEnabled} onCheckedChange={setPickupEnabled} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="pickupLabel">Shown at checkout as</Label>
            <Input id="pickupLabel" value={pickupLabel} onChange={(e) => setPickupLabel(e.target.value)} disabled={!pickupEnabled} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="pickupInstructions">Instructions</Label>
            <Textarea id="pickupInstructions" rows={2} value={pickupInstructions} onChange={(e) => setPickupInstructions(e.target.value)} disabled={!pickupEnabled} />
          </div>
        </section>

        <section className="grid gap-2 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl">Sales tax</h2>
            <Switch checked={taxEnabled} onCheckedChange={setTaxEnabled} />
          </div>
          <p className="text-sm text-muted-foreground">
            When on, Stripe Tax calculates and collects tax at checkout. Requires a tax registration in your Stripe dashboard first.
          </p>
        </section>

        <Button type="submit" className="w-fit rounded-full" disabled={saving}>
          {saving ? "Saving…" : "Save settings"}
        </Button>
      </form>

      <div className="mt-10 max-w-2xl">
        <EmailTest />
      </div>
    </div>
  );
}
