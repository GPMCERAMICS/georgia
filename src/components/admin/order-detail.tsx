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
import { longDate, money, orderStatusFor } from "@/lib/admin";

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message
    ? error.message.replace(/^.*Uncaught Error: /, "").split("\n")[0]
    : fallback;
}

export function OrderDetail({ id }: { id: string }) {
  const order = useQuery(api.admin.orders.get, { id: id as Id<"orders"> });
  const markShipped = useMutation(api.admin.orders.markShipped);
  const markDelivered = useMutation(api.admin.orders.markDelivered);
  const updateTracking = useMutation(api.admin.orders.updateTracking);
  const resendEmail = useMutation(api.admin.orders.resendEmail);
  const emailLog = useQuery(api.admin.orders.emails, { id: id as Id<"orders"> });
  const cancel = useMutation(api.admin.orders.cancel);
  const updateNotes = useMutation(api.admin.orders.updateNotes);

  const [carrier, setCarrier] = useState("USPS");
  const [tracking, setTracking] = useState("");
  // A draft only exists while she is typing; otherwise the live value shows.
  const [notesDraft, setNotesDraft] = useState<string | null>(null);
  // Same idea for a tracking correction on an order already shipped.
  const [carrierDraft, setCarrierDraft] = useState<string | null>(null);
  const [trackingDraft, setTrackingDraft] = useState<string | null>(null);
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

  const pickup = order.shippingMethod === "pickup";
  const meta = orderStatusFor(order);
  const newCarrier = carrierDraft ?? order.carrier ?? "";
  const newTracking = trackingDraft ?? order.trackingNumber ?? "";
  const trackingDirty =
    newCarrier.trim() !== (order.carrier ?? "") ||
    newTracking.trim() !== (order.trackingNumber ?? "");
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
        className="mb-3 inline-flex items-center gap-1 py-1.5 text-sm text-muted-foreground hover:text-foreground"
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
              onClick={() =>
                run(
                  pickup
                    ? "Marked picked up — thank-you email sent"
                    : "Marked delivered — care email sent",
                  () => markDelivered({ id: order._id }),
                )
              }
            >
              {pickup ? "Mark picked up" : "Mark delivered"}
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
              {(order.discountCents ?? 0) > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Discount</dt>
                  <dd>-{money(order.discountCents ?? 0)}</dd>
                </div>
              )}
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
              {(order.refundedCents ?? 0) > 0 && (
                <div className="flex justify-between text-destructive">
                  <dt>Refunded</dt>
                  <dd>-{money(order.refundedCents ?? 0)}</dd>
                </div>
              )}
            </dl>
          </section>

          {order.status === "paid" && pickup && (
            <section className="border border-primary/30 bg-primary/5 p-5">
              <h2 className="font-display text-xl">Ready for pickup?</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                When the order is wrapped and ready, mark it ready. The customer gets an email
                asking them to arrange a time.
              </p>
              <Button
                className="mt-4"
                disabled={busy}
                onClick={() =>
                  run("Marked ready — customer emailed", () =>
                    markShipped({ id: order._id, carrier: "", trackingNumber: "" }),
                  )
                }
              >
                Mark ready for pickup
              </Button>
            </section>
          )}

          {order.status === "paid" && !pickup && (
            <section className="border border-primary/30 bg-primary/5 p-5">
              <h2 className="font-display text-xl">Ship it</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Add the tracking number and the customer gets a shipping email.
              </p>
              <form
                className="mt-4 grid gap-3 sm:grid-cols-[140px_1fr_auto]"
                onSubmit={(event) => {
                  event.preventDefault();
                  void run("Marked shipped — customer emailed", () =>
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
                    placeholder="9400 …"
                    onChange={(e) => setTracking(e.target.value)}
                  />
                </div>
                <Button type="submit" className="self-end" disabled={busy}>
                  Mark shipped
                </Button>
              </form>
            </section>
          )}

          {order.status === "shipped" && !pickup && (
            <section className="border border-border bg-card p-5">
              <h2 className="font-display text-xl">Tracking</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Fix a wrong carrier or tracking number here. Saving a change emails the customer
                the new details.
              </p>
              <form
                className="mt-4 grid gap-3 sm:grid-cols-[140px_1fr_auto]"
                onSubmit={(event) => {
                  event.preventDefault();
                  void run("Tracking updated — customer emailed", async () => {
                    await updateTracking({
                      id: order._id,
                      carrier: newCarrier,
                      trackingNumber: newTracking,
                    });
                    setCarrierDraft(null);
                    setTrackingDraft(null);
                  });
                }}
              >
                <div className="grid gap-1.5">
                  <Label htmlFor="newCarrier">Carrier</Label>
                  <Input
                    id="newCarrier"
                    value={newCarrier}
                    onChange={(e) => setCarrierDraft(e.target.value)}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="newTracking">Tracking number</Label>
                  <Input
                    id="newTracking"
                    value={newTracking}
                    onChange={(e) => setTrackingDraft(e.target.value)}
                  />
                </div>
                <Button
                  type="submit"
                  variant="outline"
                  className="self-end"
                  disabled={busy || !trackingDirty || newTracking.trim() === ""}
                >
                  Update tracking
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
          <OrderActivity
            order={order}
            emails={emailLog}
            busy={busy}
            onResend={(email) =>
              run("Sending it again", () => resendEmail({ id: order._id, email }))
            }
          />
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


type Resendable = "confirmation" | "shipped" | "delivered";

const EMAIL_LABELS: Record<string, { label: string; resend?: Resendable }> = {
  confirmation: { label: "Order confirmation", resend: "confirmation" },
  ownerNotice: { label: "New order notice to you" },
  shipped: { label: "Shipped email", resend: "shipped" },
  trackingUpdated: { label: "Tracking update" },
  pickupReady: { label: "Ready for pickup email", resend: "shipped" },
  delivered: { label: "Delivered email", resend: "delivered" },
  collected: { label: "Thank-you after pickup", resend: "delivered" },
  refunded: { label: "Refund email" },
  reminder: { label: "Checkout reminder" },
};

type LoggedEmail = {
  _id: string;
  kind: string;
  to: string;
  sentAt: number;
  ok: boolean;
  error: string | null;
};

/**
 * What has happened to the order, oldest first: each step it has reached and
 * each email that went out because of it. A failed email says why and can be
 * sent again from here.
 */
function OrderActivity({
  order,
  emails,
  busy,
  onResend,
}: {
  order: {
    _creationTime: number;
    paidAt: number | null;
    shippedAt: number | null;
    deliveredAt: number | null;
    refundedAt?: number;
    refundedCents?: number;
    status: string;
    shippingMethod: "ship" | "pickup";
    totalCents: number;
  };
  emails: LoggedEmail[] | undefined;
  busy: boolean;
  onResend: (email: Resendable) => void;
}) {
  const pickup = order.shippingMethod === "pickup";
  type Entry = { at: number; key: string; node: React.ReactNode };
  const entries: Entry[] = [];
  const step = (at: number | null | undefined, key: string, text: string) => {
    if (at) entries.push({ at, key, node: <span className="font-medium">{text}</span> });
  };
  step(order._creationTime, "started", "Checkout started");
  step(order.paidAt, "paid", "Paid");
  step(order.shippedAt, "shipped", pickup ? "Marked ready for pickup" : "Marked shipped");
  step(order.deliveredAt, "delivered", pickup ? "Marked picked up" : "Marked delivered");
  step(
    order.refundedAt,
    "refunded",
    order.status === "refunded"
      ? "Refunded in full"
      : `Refunded ${money(order.refundedCents ?? 0)} of ${money(order.totalCents)}`,
  );

  for (const email of emails ?? []) {
    const meta = EMAIL_LABELS[email.kind] ?? { label: email.kind };
    entries.push({
      // Emails follow the step that caused them, even within the same second.
      at: email.sentAt + 1,
      key: email._id,
      node: (
        <span className={email.ok ? "text-muted-foreground" : "text-destructive"}>
          {meta.label} {email.ok ? "sent" : "failed"}
          <span className="block text-xs">to {email.to}</span>
          {!email.ok && email.error && <span className="block text-xs">{email.error}</span>}
          {meta.resend && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onResend(meta.resend!)}
              className="mt-0.5 block text-xs text-foreground underline underline-offset-2 hover:no-underline disabled:opacity-50"
            >
              Send again
            </button>
          )}
        </span>
      ),
    });
  }
  entries.sort((a, b) => a.at - b.at);

  return (
    <section className="border border-border bg-card p-5">
      <h2 className="font-display text-xl">Activity</h2>
      <ol className="mt-3 space-y-3 text-sm">
        {entries.map((entry) => (
          <li key={entry.key} className="grid grid-cols-[1fr_auto] gap-3">
            <span className="min-w-0 break-words">{entry.node}</span>
            <time className="whitespace-nowrap text-xs text-muted-foreground">
              {activityTime(entry.at)}
            </time>
          </li>
        ))}
      </ol>
      {emails !== undefined && emails.length === 0 && order.paidAt !== null && (
        <p className="mt-3 text-xs text-muted-foreground">
          No emails are recorded for this order. Orders from before email tracking was added
          show none.
        </p>
      )}
    </section>
  );
}

const activityTime = (ms: number) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(ms));
