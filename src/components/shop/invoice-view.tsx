"use client";

import Link from "next/link";
import { useState } from "react";
import { useAction, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "@convex/_generated/api";
import { trackingUrl } from "@convex/lib/emailTemplates";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/shop";
import { site } from "@/lib/site";

const money = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

const day = (ms: number) =>
  new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(
    new Date(ms),
  );

/**
 * A custom order's invoice, as the customer sees it from the link in their
 * email. The same page serves the whole job: it asks for the deposit, then
 * the balance, and afterwards stands as the receipt. It is live, so a
 * payment shows up here without a refresh.
 */
export function InvoiceView({ token, justPaid }: { token: string; justPaid: boolean }) {
  const invoice = useQuery(api.customOrders.invoice, { token });

  if (invoice === undefined) {
    return <p className="text-muted-foreground">Loading your invoice…</p>;
  }
  if (invoice === null) {
    return (
      <div>
        <h1 className="font-display text-4xl">This invoice could not be found</h1>
        <p className="mt-4 text-lg leading-relaxed">
          The link may be incomplete. Reply to the email it came in, or write to {site.email}, and
          I will send it again.
        </p>
      </div>
    );
  }

  return <InvoiceBody invoice={invoice} token={token} justPaid={justPaid} />;
}

type Invoice = NonNullable<FunctionReturnType<typeof api.customOrders.invoice>>;

/** The invoice itself, once it has loaded. */
export function InvoiceBody({
  invoice,
  token,
  justPaid,
}: {
  invoice: Invoice;
  token: string;
  justPaid: boolean;
}) {
  const pay = useAction(api.customCheckout.pay);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { totals } = invoice;
  const cancelled = invoice.status === "cancelled";
  const depositPaid = invoice.depositPaidAt !== null;
  const balancePaid = invoice.balancePaidAt !== null;
  const dueNow =
    invoice.payable === "deposit"
      ? totals.depositCents
      : invoice.payable === "balance"
        ? totals.balanceCents
        : 0;
  const track = trackingUrl(invoice.carrier, invoice.trackingNumber);

  // What the page says at the top, in plain words.
  const state = cancelled
    ? "This order has been cancelled. If that is unexpected, please get in touch."
    : invoice.payable === "deposit"
      ? `A deposit of ${money(totals.depositCents)} gets your piece started.`
      : invoice.status === "inProgress"
        ? "Your deposit is paid and your piece is being made. The final invoice will follow when it is finished."
        : invoice.payable === "balance"
          ? `Your piece is finished. The balance of ${money(totals.balanceCents)} is due before it ${invoice.pickup ? "is collected" : "ships"}.`
          : invoice.status === "paid"
            ? invoice.pickup
              ? "Paid in full. I will be in touch to arrange a time for you to collect it."
              : "Paid in full. I will pack it by hand and email you the tracking details."
            : invoice.status === "shipped"
              ? invoice.pickup
                ? "Your piece is ready for you to collect."
                : "Your piece is on its way."
              : "Paid in full and delivered. Thank you.";

  async function handlePay() {
    setError(null);
    setStarting(true);
    try {
      const { url } = await pay({ token });
      window.location.assign(url);
    } catch (err) {
      setStarting(false);
      setError(
        err instanceof Error && err.message
          ? err.message.replace(/^.*Uncaught Error: /, "").split("\n")[0]
          : "Could not open the payment page. Please try again.",
      );
    }
  }

  // Back from Stripe before its confirmation has reached us.
  const confirming = justPaid && invoice.payable !== null;

  return (
    <article>
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Invoice</p>
          <h1 className="mt-1 text-balance font-display text-3xl leading-tight sm:text-4xl">
            {invoice.title}
          </h1>
        </div>
        <dl className="text-sm sm:text-right">
          <dt className="sr-only">Order number</dt>
          <dd className="font-medium">{invoice.number}</dd>
          <dt className="sr-only">Date</dt>
          <dd className="text-muted-foreground">{day(invoice.createdAt)}</dd>
          <dt className="sr-only">For</dt>
          <dd className="text-muted-foreground">For {invoice.name}</dd>
        </dl>
      </header>

      {justPaid && !confirming && (
        <p role="status" className="mt-6 bg-secondary px-5 py-4 text-lg">
          Payment received. Thank you. A receipt is on its way to your inbox.
        </p>
      )}
      {confirming && (
        <p role="status" className="mt-6 bg-secondary px-5 py-4 text-lg">
          Thank you. Your payment is being confirmed and this page will update in a moment.
        </p>
      )}

      <p className="mt-6 text-lg leading-relaxed">{state}</p>

      <table className="mt-8 w-full text-left">
        <thead>
          <tr className="border-b border-border text-sm text-muted-foreground">
            <th scope="col" className="py-2 font-normal">
              Item
            </th>
            <th scope="col" className="py-2 text-right font-normal">
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item, i) => (
            <tr key={i} className="border-b border-border align-top">
              <td className="py-3 pr-4">{item.description}</td>
              <td className="whitespace-nowrap py-3 text-right">{money(item.amountCents)}</td>
            </tr>
          ))}
          <tr className="border-b border-border align-top text-muted-foreground">
            <td className="py-3 pr-4">{invoice.pickup ? invoice.pickupLabel : "Shipping"}</td>
            <td className="py-3 text-right">
              {invoice.pickup
                ? "Free"
                : totals.shippingPending
                  ? "Quoted when your piece is ready"
                  : money(totals.shippingCents)}
            </td>
          </tr>
        </tbody>
      </table>

      <dl className="ml-auto mt-4 max-w-sm space-y-1.5">
        <div className="flex justify-between">
          <dt>{totals.shippingPending ? "Total before shipping" : "Total"}</dt>
          <dd>{money(totals.totalCents)}</dd>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <dt>Deposit{depositPaid ? ` paid ${day(invoice.depositPaidAt!)}` : ""}</dt>
          <dd>
            {depositPaid ? "−" : ""}
            {money(totals.depositCents)}
          </dd>
        </div>
        {balancePaid && (
          <div className="flex justify-between text-muted-foreground">
            <dt>Balance paid {day(invoice.balancePaidAt!)}</dt>
            <dd>−{money(totals.balanceCents)}</dd>
          </div>
        )}
        <div className="flex justify-between border-t border-border pt-3 font-display text-2xl">
          <dt>{invoice.payable ? "Due now" : balancePaid ? "Balance" : "Still to pay"}</dt>
          <dd>
            {invoice.payable
              ? money(dueNow)
              : balancePaid
                ? formatPrice(0)
                : `${money(totals.dueCents)}${totals.shippingPending ? " + shipping" : ""}`}
          </dd>
        </div>
      </dl>

      {invoice.customerNote.trim() !== "" && (
        <section className="mt-8 bg-secondary px-5 py-4">
          <h2 className="text-sm uppercase tracking-[0.15em] text-muted-foreground">A note from me</h2>
          <p className="mt-2 whitespace-pre-wrap leading-relaxed">{invoice.customerNote}</p>
        </section>
      )}

      {invoice.trackingNumber && (
        <p className="mt-8">
          {invoice.carrier ?? "Tracking"}: <span className="font-medium">{invoice.trackingNumber}</span>
          {track && (
            <>
              {" · "}
              <a href={track} target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:no-underline">
                Track your package
              </a>
            </>
          )}
        </p>
      )}

      {invoice.payable && !confirming && (
        <div className="mt-10">
          <Button size="lg" className="h-14 w-full px-8 sm:w-auto" disabled={starting} onClick={() => void handlePay()}>
            {starting
              ? "Opening secure payment…"
              : invoice.payable === "deposit"
                ? `Pay deposit ${money(dueNow)}`
                : `Pay balance ${money(dueNow)}`}
          </Button>
          {error && (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {error}
            </p>
          )}
          <p className="mt-3 text-sm text-muted-foreground">
            Payment is handled securely by Stripe.
            {invoice.payable === "balance" && !invoice.pickup
              ? " Your shipping address is taken on the next page."
              : ""}
          </p>
        </div>
      )}

      <p className="mt-12 border-t border-border pt-6 text-muted-foreground">
        Questions about this invoice? Reply to the email it came in, or write to {site.email}.{" "}
        <Link href="/" className="text-foreground underline underline-offset-4 hover:no-underline">
          {site.name}
        </Link>
      </p>
    </article>
  );
}
