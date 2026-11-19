"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { AdminCustomOrder } from "@convex/admin/customOrders";
import { customOrderTotals } from "@convex/lib/customOrder";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { customOrderStatusFor, longDate, money } from "@/lib/admin";
import { useSettled } from "@/lib/use-settled";

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message
    ? error.message.replace(/^.*Uncaught Error: /, "").split("\n")[0]
    : fallback;
}

const dollars = (cents: number) => (cents / 100).toFixed(2);
/** "12.50" → 1250. Blank is zero; anything unreadable is NaN. */
const toCents = (text: string) => (text.trim() === "" ? 0 : Math.round(Number(text) * 100));

/**
 * One custom order: the invoice on the left, what to do next on the right.
 * The order is loaded once and kept on screen, so live updates (a customer
 * paying while the page is open) never wipe out what is being typed.
 */
export function CustomOrderEditor({ id }: { id: string }) {
  const order = useSettled(useQuery(api.admin.customOrders.get, { id: id as Id<"customOrders"> }));

  if (order === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full max-w-2xl" />
      </div>
    );
  }
  if (order === null) {
    return <p className="text-muted-foreground">Custom order not found.</p>;
  }
  return <Editor order={order} />;
}

type Line = { key: number; description: string; amount: string };

function Editor({ order }: { order: AdminCustomOrder }) {
  const router = useRouter();
  const update = useMutation(api.admin.customOrders.update);
  const sendDeposit = useMutation(api.admin.customOrders.sendDepositInvoice);
  const sendFinal = useMutation(api.admin.customOrders.sendFinalInvoice);
  const recordPayment = useMutation(api.admin.customOrders.recordPayment);
  const markShipped = useMutation(api.admin.customOrders.markShipped);
  const markDelivered = useMutation(api.admin.customOrders.markDelivered);
  const cancel = useMutation(api.admin.customOrders.cancel);
  const remove = useMutation(api.admin.customOrders.remove);

  const [name, setName] = useState(order.name);
  const [email, setEmail] = useState(order.email);
  const [title, setTitle] = useState(order.title);
  const [lines, setLines] = useState<Line[]>(() =>
    (order.items.length > 0 ? order.items : [{ description: "", amountCents: 0 }]).map((item, i) => ({
      key: i,
      description: item.description,
      amount: item.amountCents === 0 ? "" : dollars(item.amountCents),
    })),
  );
  const [nextKey, setNextKey] = useState(order.items.length + 1);
  const [pickup, setPickup] = useState(order.pickup);
  const [shipping, setShipping] = useState(
    order.shippingCents === null ? "" : dollars(order.shippingCents),
  );
  const [deposit, setDeposit] = useState(order.depositCents === 0 ? "" : dollars(order.depositCents));
  const [customerNote, setCustomerNote] = useState(order.customerNote);
  const [notes, setNotes] = useState(order.notes);
  const [carrier, setCarrier] = useState("USPS");
  const [tracking, setTracking] = useState("");
  const [busy, setBusy] = useState(false);

  // Money already in narrows what can change; see `update` on the server.
  const closed = order.balancePaidAt !== null || order.status === "cancelled";
  const depositLocked = order.depositPaidAt !== null;

  const items = lines.map((line) => ({
    description: line.description,
    amountCents: toCents(line.amount),
  }));
  const shippingCents = shipping.trim() === "" ? null : toCents(shipping);
  const draftTotals = customOrderTotals({
    items: items.filter((item) => Number.isFinite(item.amountCents)),
    shippingCents: shippingCents !== null && Number.isFinite(shippingCents) ? shippingCents : null,
    pickup,
    depositCents: Number.isFinite(toCents(deposit)) ? toCents(deposit) : 0,
    depositPaidAt: order.depositPaidAt,
    balancePaidAt: order.balancePaidAt,
  });
  const meta = customOrderStatusFor(order);

  async function save() {
    await update({
      id: order._id,
      name,
      email,
      title,
      items,
      shippingCents: pickup ? null : shippingCents,
      pickup,
      depositCents: toCents(deposit),
      customerNote,
      notes,
    });
  }

  /** Runs one action, saving what is on screen first unless told not to. */
  async function run(label: string, fn: () => Promise<unknown>, saveFirst = true) {
    setBusy(true);
    try {
      if (saveFirst) await save();
      await fn();
      toast.success(label);
    } catch (error) {
      toast.error(errorMessage(error, "Something went wrong"));
    } finally {
      setBusy(false);
    }
  }

  const invoiceUrl =
    typeof window === "undefined"
      ? `/invoice/${order.token}`
      : `${window.location.origin}/invoice/${order.token}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(invoiceUrl);
      toast.success("Invoice link copied");
    } catch {
      toast.error("Could not copy. Select the link and copy it by hand.");
    }
  }

  const setLine = (key: number, patch: Partial<Line>) =>
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));

  return (
    <div>
      <Link
        href="/admin/custom"
        className="mb-3 inline-flex items-center gap-1 py-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Custom orders
      </Link>
      <div className="mb-8 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl md:text-4xl">{order.number}</h1>
        <Badge variant={meta.variant}>{meta.label}</Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <form
          className="flex min-w-0 flex-col gap-6"
          onSubmit={(event) => {
            event.preventDefault();
            void run("Saved", async () => {});
          }}
        >
          <section className="grid gap-4 border border-border bg-card p-5">
            <h2 className="font-display text-xl">Customer</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="coName">Name</Label>
                <Input id="coName" value={name} disabled={closed} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="coEmail">Email</Label>
                <Input
                  id="coEmail"
                  type="email"
                  value={email}
                  disabled={closed}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="coTitle">What is being made</Label>
              <Input
                id="coTitle"
                value={title}
                disabled={closed}
                placeholder="e.g. Garden totem, five pieces"
                onChange={(e) => setTitle(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Shown as the heading of the invoice and in the email subject.
              </p>
            </div>
          </section>

          <section className="grid gap-4 border border-border bg-card p-5">
            <h2 className="font-display text-xl">Invoice</h2>

            <div className="grid gap-2">
              <div className="hidden grid-cols-[minmax(0,1fr)_8rem_2.5rem] gap-2 text-xs text-muted-foreground sm:grid">
                <span>Item</span>
                <span>Amount (USD)</span>
              </div>
              {lines.map((line, i) => (
                <div key={line.key} className="grid grid-cols-[minmax(0,1fr)_2.5rem] gap-2 sm:grid-cols-[minmax(0,1fr)_8rem_2.5rem]">
                  <Input
                    aria-label={`Item ${i + 1} description`}
                    value={line.description}
                    disabled={closed}
                    placeholder="Description"
                    className="col-span-2 sm:col-span-1"
                    onChange={(e) => setLine(line.key, { description: e.target.value })}
                  />
                  <Input
                    aria-label={`Item ${i + 1} amount`}
                    type="number"
                    step="0.01"
                    min="0"
                    value={line.amount}
                    disabled={closed}
                    placeholder="0.00"
                    onChange={(e) => setLine(line.key, { amount: e.target.value })}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove item ${i + 1}`}
                    disabled={closed || lines.length === 1}
                    onClick={() => setLines((current) => current.filter((l) => l.key !== line.key))}
                  >
                    <X />
                  </Button>
                </div>
              ))}
              {!closed && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-fit"
                  onClick={() => {
                    setLines((current) => [...current, { key: nextKey, description: "", amount: "" }]);
                    setNextKey((key) => key + 1);
                  }}
                >
                  <Plus /> Add a line
                </Button>
              )}
            </div>

            <div className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="coShipping">Shipping (USD)</Label>
                <Input
                  id="coShipping"
                  type="number"
                  step="0.01"
                  min="0"
                  value={pickup ? "" : shipping}
                  disabled={closed || pickup}
                  placeholder={pickup ? "Local pickup" : "Quote later"}
                  onChange={(e) => setShipping(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Leave blank until you know it. It is needed before the final invoice.
                </p>
              </div>
              <label className="flex h-12 items-center justify-between self-start border border-border px-3 text-sm sm:mt-[1.4rem]">
                Local pickup, no shipping
                <Switch checked={pickup} disabled={closed} onCheckedChange={setPickup} />
              </label>
            </div>

            <div className="grid gap-1.5 border-t border-border pt-4">
              <Label htmlFor="coDeposit">Deposit (USD)</Label>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  id="coDeposit"
                  type="number"
                  step="0.01"
                  min="0"
                  className="max-w-[10rem]"
                  value={deposit}
                  disabled={closed || depositLocked}
                  placeholder="0.00"
                  onChange={(e) => setDeposit(e.target.value)}
                />
                {!closed &&
                  !depositLocked &&
                  [25, 50].map((percent) => (
                    <Button
                      key={percent}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setDeposit(dollars(Math.round((draftTotals.subtotalCents * percent) / 100)))
                      }
                    >
                      {percent}%
                    </Button>
                  ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {depositLocked
                  ? "The deposit has been paid, so its amount is fixed."
                  : "Paid before work starts. A percentage is worked out from the items, not shipping."}
              </p>
            </div>

            <dl className="space-y-1 border-t border-border pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Items</dt>
                <dd>{money(draftTotals.subtotalCents)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Shipping</dt>
                <dd>
                  {pickup
                    ? "Local pickup"
                    : draftTotals.shippingPending
                      ? "To be quoted"
                      : money(draftTotals.shippingCents)}
                </dd>
              </div>
              <div className="flex justify-between font-display text-lg">
                <dt>Total</dt>
                <dd>{money(draftTotals.totalCents)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">
                  Deposit{order.depositPaidAt !== null ? " (paid)" : ""}
                </dt>
                <dd>{money(draftTotals.depositCents)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">
                  Balance{order.balancePaidAt !== null ? " (paid)" : ""}
                </dt>
                <dd>
                  {money(draftTotals.balanceCents)}
                  {draftTotals.shippingPending ? " + shipping" : ""}
                </dd>
              </div>
            </dl>
          </section>

          <section className="grid gap-4 border border-border bg-card p-5">
            <div className="grid gap-1.5">
              <Label htmlFor="coCustomerNote">Note to the customer</Label>
              <Textarea
                id="coCustomerNote"
                rows={3}
                value={customerNote}
                disabled={closed}
                placeholder="Timing, what was agreed, deposit terms. Shown on the invoice and in the email."
                onChange={(e) => setCustomerNote(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="coNotes">Private notes</Label>
              <Textarea
                id="coNotes"
                rows={4}
                value={notes}
                placeholder="Only you see these."
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </section>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" variant="outline" disabled={busy}>
              {busy ? "Saving…" : closed ? "Save notes" : "Save"}
            </Button>
            {closed && order.status !== "cancelled" && (
              <p className="text-sm text-muted-foreground">
                This order is paid in full, so the invoice can no longer change.
              </p>
            )}
          </div>
        </form>

        <aside className="flex flex-col gap-6">
          <section className="border border-primary/30 bg-primary/5 p-5">
            <h2 className="font-display text-xl">Next step</h2>

            {order.status === "draft" && (
              <>
                <p className="mt-1 text-sm text-muted-foreground">
                  Fill in the invoice, then send the quote. The customer gets an email with a link
                  to pay the deposit.
                </p>
                <Button
                  className="mt-4 w-full"
                  disabled={busy}
                  onClick={() =>
                    run(
                      toCents(deposit) > 0 ? "Quote sent — customer emailed" : "Started with no deposit",
                      () => sendDeposit({ id: order._id }),
                    )
                  }
                >
                  {toCents(deposit) > 0 ? "Send quote and deposit invoice" : "Start with no deposit"}
                </Button>
              </>
            )}

            {order.status === "depositDue" && (
              <>
                <p className="mt-1 text-sm text-muted-foreground">
                  Waiting for the deposit of {money(order.totals.depositCents)}. This page updates
                  by itself when it is paid.
                </p>
                <Button
                  variant="outline"
                  className="mt-4 w-full"
                  disabled={busy}
                  onClick={() => run("Quote sent again", () => sendDeposit({ id: order._id }))}
                >
                  Send the quote again
                </Button>
              </>
            )}

            {order.status === "inProgress" && (
              <>
                <p className="mt-1 text-sm text-muted-foreground">
                  The deposit is in. When the piece is finished, {pickup ? "" : "add the shipping cost and "}
                  send the final invoice for the balance.
                </p>
                <Button
                  className="mt-4 w-full"
                  disabled={busy}
                  onClick={() =>
                    run("Final invoice sent — customer emailed", () => sendFinal({ id: order._id }))
                  }
                >
                  Send final invoice
                </Button>
              </>
            )}

            {order.status === "balanceDue" && (
              <>
                <p className="mt-1 text-sm text-muted-foreground">
                  Waiting for the final payment of {money(order.totals.balanceCents)}. Hold the piece
                  until it is paid.
                </p>
                <Button
                  variant="outline"
                  className="mt-4 w-full"
                  disabled={busy}
                  onClick={() => run("Final invoice sent again", () => sendFinal({ id: order._id }))}
                >
                  Send the final invoice again
                </Button>
              </>
            )}

            {order.status === "paid" && order.pickup && (
              <>
                <p className="mt-1 text-sm text-muted-foreground">
                  Paid in full. When it is wrapped and ready, tell the customer.
                </p>
                <Button
                  className="mt-4 w-full"
                  disabled={busy}
                  onClick={() =>
                    run(
                      "Marked ready — customer emailed",
                      () => markShipped({ id: order._id, carrier: "", trackingNumber: "" }),
                      false,
                    )
                  }
                >
                  Mark ready for pickup
                </Button>
              </>
            )}

            {order.status === "paid" && !order.pickup && (
              <form
                className="mt-3 grid gap-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  void run(
                    "Marked shipped — customer emailed",
                    () => markShipped({ id: order._id, carrier, trackingNumber: tracking }),
                    false,
                  );
                }}
              >
                <p className="text-sm text-muted-foreground">Paid in full. It can ship now.</p>
                <div className="grid gap-1.5">
                  <Label htmlFor="coCarrier">Carrier</Label>
                  <Input id="coCarrier" value={carrier} onChange={(e) => setCarrier(e.target.value)} />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="coTracking">Tracking number</Label>
                  <Input id="coTracking" value={tracking} onChange={(e) => setTracking(e.target.value)} />
                </div>
                <Button type="submit" disabled={busy}>
                  Mark shipped
                </Button>
              </form>
            )}

            {order.status === "shipped" && (
              <>
                <p className="mt-1 text-sm text-muted-foreground">
                  {order.pickup ? "Ready and waiting to be collected." : "On its way."}
                </p>
                <Button
                  variant="outline"
                  className="mt-4 w-full"
                  disabled={busy}
                  onClick={() =>
                    run(
                      order.pickup ? "Marked picked up — thank-you sent" : "Marked delivered — care email sent",
                      () => markDelivered({ id: order._id }),
                      false,
                    )
                  }
                >
                  {order.pickup ? "Mark picked up" : "Mark delivered"}
                </Button>
              </>
            )}

            {order.status === "delivered" && (
              <p className="mt-1 text-sm text-muted-foreground">Finished. Nothing more to do.</p>
            )}
            {order.status === "cancelled" && (
              <p className="mt-1 text-sm text-muted-foreground">
                Cancelled. The invoice link no longer takes payment.
              </p>
            )}

            {(order.status === "draft" || order.status === "depositDue") && (
              <button
                type="button"
                disabled={busy}
                className="mt-3 block text-sm text-muted-foreground underline underline-offset-4 hover:no-underline disabled:opacity-50"
                onClick={() =>
                  run("Deposit recorded", () => recordPayment({ id: order._id, stage: "deposit" }))
                }
              >
                Deposit was paid another way
              </button>
            )}
            {(order.status === "inProgress" || order.status === "balanceDue") && (
              <button
                type="button"
                disabled={busy}
                className="mt-3 block text-sm text-muted-foreground underline underline-offset-4 hover:no-underline disabled:opacity-50"
                onClick={() =>
                  run("Final payment recorded", () => recordPayment({ id: order._id, stage: "balance" }))
                }
              >
                Balance was paid another way
              </button>
            )}
          </section>

          {order.status !== "draft" && (
            <section className="border border-border bg-card p-5">
              <h2 className="font-display text-xl">Customer&apos;s invoice link</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                The same link for the deposit and the final payment. It always shows the latest
                invoice.
              </p>
              <p className="mt-3 break-all text-sm">{invoiceUrl}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => void copyLink()}>
                  Copy link
                </Button>
                <Button asChild variant="outline" size="sm">
                  <a href={invoiceUrl} target="_blank" rel="noreferrer">
                    Open
                  </a>
                </Button>
              </div>
            </section>
          )}

          <section className="border border-border bg-card p-5">
            <h2 className="font-display text-xl">Payments</h2>
            <dl className="mt-3 space-y-3 text-sm">
              <PaymentRow
                label="Deposit"
                amountCents={order.totals.depositCents}
                paidAt={order.depositPaidAt}
                paidCents={order.depositPaidCents}
                paymentIntentId={order.depositPaymentIntentId}
              />
              <PaymentRow
                label="Balance"
                amountCents={order.totals.balanceCents}
                paidAt={order.balancePaidAt}
                paidCents={order.balancePaidCents}
                paymentIntentId={order.balancePaymentIntentId}
              />
            </dl>
            {order.shippingAddress && (
              <address className="mt-4 border-t border-border pt-3 text-sm not-italic leading-relaxed">
                <span className="block text-xs text-muted-foreground">Ship to</span>
                {order.name}
                <br />
                {order.shippingAddress.line1}
                <br />
                {order.shippingAddress.line2 && (
                  <>
                    {order.shippingAddress.line2}
                    <br />
                  </>
                )}
                {order.shippingAddress.city}, {order.shippingAddress.state}{" "}
                {order.shippingAddress.postalCode}
              </address>
            )}
            {order.trackingNumber && (
              <p className="mt-3 text-sm">
                {order.carrier ?? "Tracking"}: {order.trackingNumber}
              </p>
            )}
          </section>

          {order.status === "draft" ? (
            <ConfirmDialog
              trigger={<Button variant="ghost" className="w-fit text-destructive" />}
              title="Delete this draft?"
              description="Nothing has been sent to the customer, so nothing is lost."
              confirmLabel="Delete"
              onConfirm={async () => {
                await remove({ id: order._id });
                router.push("/admin/custom");
              }}
            >
              Delete draft
            </ConfirmDialog>
          ) : (
            order.status !== "cancelled" &&
            order.status !== "shipped" &&
            order.status !== "delivered" && (
              <ConfirmDialog
                trigger={<Button variant="ghost" className="w-fit text-destructive" />}
                title="Cancel this custom order?"
                description="The invoice link stops taking payment. Money already paid is not returned by this: refund it in Stripe."
                confirmLabel="Cancel order"
                onConfirm={() => run("Order cancelled", () => cancel({ id: order._id }), false)}
              >
                Cancel order
              </ConfirmDialog>
            )
          )}
        </aside>
      </div>
    </div>
  );
}

function PaymentRow({
  label,
  amountCents,
  paidAt,
  paidCents,
  paymentIntentId,
}: {
  label: string;
  amountCents: number;
  paidAt: number | null;
  paidCents: number | null;
  paymentIntentId: string | null;
}) {
  return (
    <div>
      <div className="flex justify-between">
        <dt className="font-medium">{label}</dt>
        <dd>{money(paidCents ?? amountCents)}</dd>
      </div>
      <dd className="text-xs text-muted-foreground">
        {paidAt === null ? (
          "Not paid yet"
        ) : (
          <>
            Paid {longDate(paidAt)}
            {paymentIntentId ? (
              <>
                {" · "}
                <a
                  href={`https://dashboard.stripe.com/payments/${paymentIntentId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-2"
                >
                  View in Stripe
                </a>
              </>
            ) : (
              " · recorded by hand"
            )}
          </>
        )}
      </dd>
    </div>
  );
}
