"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/shop";
import { useCart } from "./cart-provider";

/**
 * Stripe sends the buyer here before the webhook has necessarily landed, so
 * the page subscribes and flips from "confirming" to the receipt live.
 */
export function OrderConfirmation({ sessionId }: { sessionId: string | null }) {
  const { clear } = useCart();
  const order = useQuery(
    api.orders.confirmation,
    sessionId ? { stripeSessionId: sessionId } : "skip",
  );
  const paid = order !== undefined && order !== null && order.status !== "pending";

  useEffect(() => {
    if (paid) clear();
  }, [paid, clear]);

  if (!sessionId || order === null) {
    return (
      <div>
        <h1 className="font-display text-4xl">We couldn&apos;t find that order</h1>
        <p className="mt-4 text-muted-foreground">
          If you were charged, your receipt from Stripe has the details. Email Georgia and she will sort it out.
        </p>
        <Button asChild className="mt-8 rounded-full px-6">
          <Link href="/shop">Back to the shop</Link>
        </Button>
      </div>
    );
  }

  if (order === undefined || order.status === "pending") {
    return (
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground">One moment</p>
        <h1 className="mt-5 font-display text-4xl">Confirming your payment…</h1>
        <p className="mt-4 text-muted-foreground">This usually takes a few seconds.</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground">
        Order {order.orderNumber}
      </p>
      <h1 className="mt-5 font-display text-4xl md:text-5xl">Thank you!</h1>
      <p className="mt-4 max-w-prose text-muted-foreground">
        {order.email ? `A confirmation is on its way to ${order.email}. ` : ""}
        {order.shippingMethod === "pickup"
          ? "Georgia will be in touch to arrange your pickup."
          : "Georgia will pack your pieces by hand and email you when they ship."}
      </p>

      <div className="mt-10 rounded-2xl border border-border bg-card p-6">
        <ul className="divide-y divide-border">
          {order.items.map((item, index) => (
            <li key={index} className="flex justify-between py-3">
              <span className="font-display text-lg">{item.title}</span>
              <span>{formatPrice(item.priceCents)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-1 border-t border-border pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd>{formatPrice(order.subtotalCents)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Shipping</dt>
            <dd>{order.shippingCents === 0 ? "Free" : formatPrice(order.shippingCents)}</dd>
          </div>
          {order.taxCents > 0 && (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Tax</dt>
              <dd>{formatPrice(order.taxCents)}</dd>
            </div>
          )}
          <div className="flex justify-between pt-2 font-display text-lg">
            <dt>Total</dt>
            <dd>{formatPrice(order.totalCents)}</dd>
          </div>
        </dl>
      </div>

      <Button asChild variant="outline" className="mt-8 rounded-full px-6">
        <Link href="/shop">Keep browsing</Link>
      </Button>
    </div>
  );
}
