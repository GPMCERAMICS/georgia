"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { longDate, money, orderStatusMeta } from "@/lib/admin";

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message
    ? error.message.replace(/^.*Uncaught Error: /, "").split("\n")[0]
    : fallback;
}

export function OrderDetail({ id }: { id: string }) {
  const order = useQuery(api.admin.orders.get, { id: id as Id<"orders"> });
  const markShipped = useMutation(api.admin.orders.markShipped);
  const markDelivered = useMutation(api.admin.orders.markDelivered);
  const cancel = useMutation(api.admin.orders.cancel);
  const updateNotes = useMutation(api.admin.orders.updateNotes);

  const [carrier, setCarrier] = useState("USPS");
  const [tracking, setTracking] = useState("");
  // A draft only exists while she is typing; otherwise the live value shows.
  const [notesDraft, setNotesDraft] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (order === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (order === null) {
    return <p className="text-muted-foreground">Order not found.</p>;
  }

  const meta = orderStatusMeta[order.status];
  const address = order.shippingAddress;
  const notes = notesDraft ?? order.notes;
  const notesDirty = notesDraft !== null && notesDraft !== order.notes;

  async function run(label: string, fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
      toast.success(label);
    } catch (error) {
      toast.error(errorMessage(error, "Something went wrong"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Link
        href="/admin/orders"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Orders
      </Link>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-3xl md:text-4xl">{order.orderNumber}</h1>
            <Badge variant={meta.variant}>{meta.label}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {order.paidAt ? `Paid ${longDate(order.paidAt)}` : `Started ${longDate(order._creationTime)}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {order.status === "shipped" && (
            <Button
              variant="outline"
              className="rounded-full"
              disabled={busy}
              onClick={() => run("Marked delivered", () => markDelivered({ id: order._id }))}
            >
              Mark delivered
            </Button>
          )}
          {order.status === "pending" && (
            <ConfirmDialog
              trigger={<Button variant="outline" className="rounded-full" />}
              title="Cancel this checkout?"
              description="The pieces go back on sale immediately. Nothing has been charged."
              confirmLabel="Cancel checkout"
              onConfirm={() => run("Checkout cancelled", () => cancel({ id: order._id }))}
            >
              Cancel checkout
            </ConfirmDialog>
          )}
          {order.stripePaymentIntentId && (
            <Button asChild variant="outline" className="rounded-full">
              <a
                href={`https://dashboard.stripe.com/payments/${order.stripePaymentIntentId}`}
                target="_blank"
                rel="noreferrer"
              >
                View in Stripe
              </a>
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-6">
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-display text-xl">Pieces</h2>
            <ul className="mt-3 divide-y divide-border">
              {order.items.map((item) => (
                <li key={item.pieceId} className="flex items-center justify-between py-3">
                  <Link href={`/admin/pieces/${item.pieceId}`} className="hover:underline">
                    {item.title}
                  </Link>
                  <span>{money(item.priceCents)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd>{money(order.subtotalCents)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Shipping</dt>
                <dd>{money(order.shippingCents)}</dd>
              </div>
              {order.taxCents > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Tax</dt>
                  <dd>{money(order.taxCents)}</dd>
                </div>
              )}
              <div className="flex justify-between pt-1 font-display text-lg">
                <dt>Total</dt>
                <dd>{money(order.totalCents)}</dd>
              </div>
            </dl>
          </section>

          {order.status === "paid" && (
            <section className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
              <h2 className="font-display text-xl">
                {order.shippingMethod === "pickup" ? "Hand it over" : "Ship it"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {order.shippingMethod === "pickup"
                  ? "Once the customer has collected it, mark it shipped so the record closes out."
                  : "Add the tracking number and the customer gets a shipping email."}
              </p>
              <form
                className="mt-4 grid gap-3 sm:grid-cols-[140px_1fr_auto]"
                onSubmit={(event) => {
                  event.preventDefault();
                  void run("Marked shipped", () =>
                    markShipped({ id: order._id, carrier, trackingNumber: tracking }),
                  );
                }}
              >
                <div className="grid gap-1.5">
                  <Label htmlFor="carrier">Carrier</Label>
                  <Input id="carrier" value={carrier} onChange={(e) => setCarrier(e.target.value)} />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="tracking">Tracking number</Label>
                  <Input
                    id="tracking"
                    value={tracking}
                    placeholder={order.shippingMethod === "pickup" ? "Optional" : "9400 …"}
                    onChange={(e) => setTracking(e.target.value)}
                  />
                </div>
                <Button type="submit" className="self-end rounded-full" disabled={busy}>
                  Mark shipped
                </Button>
              </form>
            </section>
          )}

          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-display text-xl">Notes</h2>
            <Textarea
              className="mt-3"
              rows={4}
              value={notes}
              placeholder="Anything worth remembering about this order."
              onChange={(e) => setNotesDraft(e.target.value)}
            />
            <Button
              variant="outline"
              className="mt-3 rounded-full"
              disabled={!notesDirty || busy}
              onClick={() =>
                run("Notes saved", async () => {
                  await updateNotes({ id: order._id, notes });
                  setNotesDraft(null);
                })
              }
            >
              Save notes
            </Button>
          </section>
        </div>

        <aside className="flex flex-col gap-6">
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-display text-xl">Customer</h2>
            <p className="mt-3">{order.name ?? "—"}</p>
            {order.email && (
              <a href={`mailto:${order.email}`} className="text-sm text-primary underline">
                {order.email}
              </a>
            )}
          </section>
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-display text-xl">Delivery</h2>
            {order.shippingMethod === "pickup" ? (
              <p className="mt-3 text-sm">Local pickup</p>
            ) : address ? (
              <address className="mt-3 text-sm not-italic leading-relaxed">
                {address.line1}
                <br />
                {address.line2 && (
                  <>
                    {address.line2}
                    <br />
                  </>
                )}
                {address.city}, {address.state} {address.postalCode}
                <br />
                {address.country}
              </address>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">Address arrives once paid.</p>
            )}
            {order.shippedAt && (
              <p className="mt-3 text-sm text-muted-foreground">
                Shipped {longDate(order.shippedAt)}
                {order.carrier ? ` via ${order.carrier}` : ""}
                {order.trackingNumber ? ` · ${order.trackingNumber}` : ""}
              </p>
            )}
            {order.deliveredAt && (
              <p className="mt-1 text-sm text-muted-foreground">Delivered {longDate(order.deliveredAt)}</p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
