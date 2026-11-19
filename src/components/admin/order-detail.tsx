"use client";

import Link from "next/link";
import { useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
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
              {(order.returnShippingCents ?? 0) > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <dt>Kept for return shipping</dt>
                  <dd>{money(order.returnShippingCents ?? 0)}</dd>
                </div>
              )}
              {(order.returnFeeCents ?? 0) > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <dt>Kept as restocking fee</dt>
                  <dd>{money(order.returnFeeCents ?? 0)}</dd>
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

          {(order.status === "paid" || order.status === "shipped" || order.status === "delivered") && (
            <RefundPanel order={order} />
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
    order.status === "cancelled"
      ? "Cancelled"
      : order.status === "refunded"
        ? (order.refundedCents ?? 0) < order.totalCents
          ? `Returned: refunded ${money(order.refundedCents ?? 0)} of ${money(order.totalCents)}`
          : "Refunded in full"
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


/** "12.50" → 1250. Blank counts as zero; anything unreadable is NaN. */
const toCents = (text: string) => (text.trim() === "" ? 0 : Math.round(Number(text) * 100));

/**
 * Refund the customer without leaving the dashboard.
 *
 * Two kinds. A plain refund sends back an amount: all of it closes the
 * order, less leaves it open. A return is for a piece that has come back:
 * the refund is what was paid less return shipping and a restocking fee,
 * the order closes, and the email shows the customer the sum.
 */
function RefundPanel({
  order,
}: {
  order: {
    _id: Id<"orders">;
    totalCents: number;
    refundedCents?: number;
    stripePaymentIntentId: string | null;
    items: { title: string }[];
  };
}) {
  const refund = useAction(api.admin.refunds.refund);
  const remainingCents = order.totalCents - (order.refundedCents ?? 0);
  const uncharged = order.stripePaymentIntentId === null || order.totalCents === 0;
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"refund" | "return">("refund");
  const [amount, setAmount] = useState<string | null>(null);
  const [returnShipping, setReturnShipping] = useState("");
  const [fee, setFee] = useState("");
  const [restock, setRestock] = useState(true);

  const isReturn = kind === "return" && !uncharged;
  const returnShippingCents = toCents(returnShipping);
  const feeCents = toCents(fee);
  const amountText = amount ?? (remainingCents / 100).toFixed(2);
  const amountCents = isReturn
    ? remainingCents - returnShippingCents - feeCents
    : Math.round(Number(amountText) * 100);
  const valid =
    uncharged ||
    (Number.isFinite(amountCents) &&
      amountCents > 0 &&
      amountCents <= remainingCents &&
      (!isReturn || (returnShippingCents >= 0 && feeCents >= 0)));
  const closesOrder = uncharged || isReturn || amountCents === remainingCents;
  const one = order.items.length === 1;
  const pieces = one ? "the piece" : "the pieces";
  const Pieces = one ? "The piece" : "The pieces";

  function reset() {
    setOpen(false);
    setKind("refund");
    setAmount(null);
    setReturnShipping("");
    setFee("");
    setRestock(true);
  }

  async function submit() {
    try {
      const result = await refund({
        id: order._id,
        amountCents: uncharged ? 0 : amountCents,
        restock: closesOrder ? restock : true,
        returned: isReturn ? { returnShippingCents, feeCents } : undefined,
      });
      toast.success(
        uncharged
          ? "Order cancelled"
          : isReturn
            ? `Return refunded: ${money(amountCents)} — customer emailed`
            : result.full
              ? "Refunded in full — customer emailed"
              : `Refunded ${money(amountCents)} — customer emailed`,
      );
      reset();
    } catch (error) {
      toast.error(errorMessage(error, "The refund did not go through"));
      // Rethrow so the confirm dialog stays open on a failure.
      throw error;
    }
  }

  if (!open) {
    return (
      <section className="border border-border bg-card p-5">
        <h2 className="font-display text-xl">{uncharged ? "Cancel order" : "Refund or return"}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {uncharged
            ? "Nothing was charged for this order, so there is no payment to refund. Cancelling it ends the order."
            : `${money(remainingCents)} can be refunded to the customer's original payment method.`}
        </p>
        <Button variant="outline" className="mt-4" onClick={() => setOpen(true)}>
          {uncharged ? "Cancel this order…" : "Refund this order…"}
        </Button>
      </section>
    );
  }

  const choice = (value: "refund" | "return", title: string, hint: string) => (
    <label
      className={`flex cursor-pointer items-start gap-3 border p-3 ${kind === value ? "border-primary bg-primary/5" : "border-border"}`}
    >
      <input
        type="radio"
        name="refundKind"
        className="mt-1"
        checked={kind === value}
        onChange={() => setKind(value)}
      />
      <span>
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
    </label>
  );

  return (
    <section className="border border-destructive/40 bg-card p-5">
      <h2 className="font-display text-xl">{uncharged ? "Cancel order" : "Refund or return"}</h2>

      {!uncharged && (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {choice("refund", "Refund", "Send money back. The customer keeps the order unless you refund all of it.")}
          {choice("return", "Return", `${Pieces} came back. Refund what was paid, less return shipping and a restocking fee.`)}
        </div>
      )}

      {!uncharged && !isReturn && (
        <div className="mt-4 grid max-w-xs gap-1.5">
          <Label htmlFor="refundAmount">Amount to refund (USD)</Label>
          <Input
            id="refundAmount"
            type="number"
            step="0.01"
            min="0.01"
            max={(remainingCents / 100).toFixed(2)}
            value={amountText}
            onChange={(e) => setAmount(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Up to {money(remainingCents)}. Less than that is a partial refund and leaves the order
            open.
          </p>
        </div>
      )}

      {isReturn && (
        <div className="mt-4 grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="returnShipping">Return shipping (USD)</Label>
              <Input
                id="returnShipping"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={returnShipping}
                onChange={(e) => setReturnShipping(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                The cost of the label, if you sent them one. Leave blank if they paid for it.
              </p>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="returnFee">Restocking fee (USD)</Label>
              <Input
                id="returnFee"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={fee}
                onChange={(e) => setFee(e.target.value)}
              />
            </div>
          </div>
          <dl className="max-w-sm space-y-1 border-t border-border pt-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Paid</dt>
              <dd>{money(remainingCents)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Return shipping</dt>
              <dd>-{money(Number.isFinite(returnShippingCents) ? returnShippingCents : 0)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Restocking fee</dt>
              <dd>-{money(Number.isFinite(feeCents) ? feeCents : 0)}</dd>
            </div>
            <div className="flex justify-between pt-1 font-display text-lg">
              <dt>Customer gets back</dt>
              <dd>{valid ? money(amountCents) : "—"}</dd>
            </div>
          </dl>
          {!valid && (
            <p role="alert" className="text-sm text-destructive">
              The amounts kept back must come to less than what was paid.
            </p>
          )}
        </div>
      )}

      {closesOrder ? (
        <label className="mt-4 flex items-start gap-2.5 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 size-4 accent-primary"
            checked={restock}
            onChange={(e) => setRestock(e.target.checked)}
          />
          <span>
            Put {pieces} back on sale
            <span className="block text-xs text-muted-foreground">
              Untick if {one ? "it is" : "they are"} damaged or not coming back.{" "}
              {one ? "It" : "They"} will show as sold instead.
            </span>
          </span>
        </label>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          A partial refund does not change what is for sale. The customer keeps {pieces}.
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        <ConfirmDialog
          trigger={<Button variant="destructive" disabled={!valid} />}
          title={
            uncharged
              ? "Cancel this order?"
              : `Refund ${money(valid ? amountCents : 0)} to the customer?`
          }
          description={
            uncharged
              ? `This ends the order. ${Pieces} will ${restock ? "go back on sale" : "stay off the shop"}.`
              : `The money goes back to their original payment method and they are emailed${isReturn ? " a breakdown of what was kept back" : ""}. This cannot be undone. ${
                  closesOrder
                    ? `The order closes and ${pieces} will ${restock ? "go back on sale" : "stay off the shop"}.`
                    : "The order stays open."
                }`
          }
          confirmLabel={uncharged ? "Cancel order" : "Refund"}
          onConfirm={submit}
        >
          {uncharged ? "Cancel order" : `Refund ${valid ? money(amountCents) : ""}`}
        </ConfirmDialog>
        <Button variant="outline" onClick={reset}>
          Never mind
        </Button>
      </div>
    </section>
  );
}
