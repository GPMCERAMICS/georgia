"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAction, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "@convex/_generated/api";
import { HOLD_MINUTES } from "@convex/lib/hold";
import { computeShippingCents } from "@convex/lib/shipping";
import { Button } from "@/components/ui/button";
import { PlaceholderVessel } from "@/components/site/placeholder-vessel";
import { availabilityLine, formatPrice, placeholderShape } from "@/lib/shop";
import { cn } from "@/lib/utils";
import { useCart } from "./cart-provider";
import { useCartLines } from "./use-cart-lines";

type Method = "ship" | "pickup";

/**
 * The /cart page body: lines, shipping choice, and the hand-off to Stripe.
 * Totals here are advisory; the reserve mutation recomputes them with the
 * same pure function before anything is charged.
 */
export function CartCheckout() {
  const { remove, clear } = useCart();
  const lines = useCartLines();
  const options = useQuery(api.settings.shippingOptions);
  const start = useAction(api.checkout.start);
  const cancel = useAction(api.checkout.cancel);
  const [method, setMethod] = useState<Method>("ship");
  const [starting, setStarting] = useState(false);

  // Stripe's back link lands here with the abandoned order; free its pieces
  // now rather than at the end of the hold. Read from `window` rather than
  // useSearchParams so the page can stay static.
  useEffect(() => {
    const url = new URL(window.location.href);
    const orderId = url.searchParams.get("cancelled");
    if (!orderId) return;
    url.searchParams.delete("cancelled");
    window.history.replaceState(null, "", url);
    void cancel({ orderId }).catch(() => {
      // The scheduled release still frees the pieces at the hold deadline.
    });
  }, [cancel]);

  if (lines === undefined || options === undefined) {
    return <p className="text-muted-foreground">Loading your cart…</p>;
  }

  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-start">
        <p className="text-muted-foreground">Your cart is empty.</p>
        <Button asChild className="mt-6 rounded-full px-6">
          <Link href="/shop">Browse available work</Link>
        </Button>
      </div>
    );
  }

  const available = lines.filter((piece) => piece.availability.state === "available");
  const blocked = lines.length - available.length;
  const subtotal = available.reduce((sum, piece) => sum + piece.priceCents, 0);
  const pickupAllowed = options.pickup.enabled;
  const effectiveMethod: Method = pickupAllowed ? method : "ship";
  const shipping = computeShippingCents(available, effectiveMethod, subtotal, options.shipping);

  async function handleCheckout() {
    setStarting(true);
    try {
      const { url } = await start({
        pieceIds: available.map((piece) => piece._id),
        shippingMethod: effectiveMethod,
      });
      window.location.assign(url);
    } catch (error) {
      setStarting(false);
      toast.error(
        error instanceof Error && error.message
          ? error.message.replace(/^.*Uncaught Error: /, "").split("\n")[0]
          : "Could not start checkout. Please try again.",
      );
    }
  }

  return (
    <div className="grid gap-10 md:grid-cols-[1fr_360px]">
      <ul className="divide-y divide-border">
        {lines.map((piece) => {
          const sold = piece.availability.state !== "available";
          const held = piece.availability.state === "held";
          return (
            <li key={piece._id} className="flex gap-5 py-5">
              <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl border border-border bg-card">
                {piece.imageUrls[0] ? (
                  <Image src={piece.imageUrls[0]} alt="" fill sizes="112px" className="object-cover" />
                ) : (
                  <PlaceholderVessel shape={placeholderShape(piece.slug)} label={piece.title} className="h-full w-full" />
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-baseline justify-between gap-4">
                  <Link href={`/shop/${piece.slug}`} className="font-display text-xl leading-snug hover:underline">
                    {piece.title}
                  </Link>
                  <span className={cn("font-display text-lg", sold && "text-muted-foreground line-through")}>
                    {formatPrice(piece.priceCents)}
                  </span>
                </div>
                {piece.size && (
                  <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{piece.size}</p>
                )}
                <p className={cn("mt-2 text-sm", sold ? "text-destructive" : "text-muted-foreground")}>
                  {held
                    ? `Someone else is checking out with this piece. It comes back within ${HOLD_MINUTES} minutes if they don't buy it.`
                    : sold
                      ? "This piece just sold. Remove it to continue."
                      : availabilityLine(piece)}
                </p>
                <button
                  type="button"
                  onClick={() => remove(piece._id)}
                  className="mt-auto w-fit text-sm text-muted-foreground underline"
                >
                  Remove
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <aside className="h-fit rounded-2xl border border-border bg-card p-6">
        <h2 className="font-display text-2xl">Delivery</h2>
        <div className="mt-4 flex flex-col gap-2">
          <label
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors",
              effectiveMethod === "ship" ? "border-primary bg-primary/5" : "border-border",
            )}
          >
            <input
              type="radio"
              name="method"
              className="mt-1"
              checked={effectiveMethod === "ship"}
              onChange={() => setMethod("ship")}
            />
            <span className="flex flex-1 flex-col">
              <span className="text-sm font-medium">Ship it (US)</span>
              <span className="text-xs text-muted-foreground">
                Packed by hand, insured. Address collected at checkout.
              </span>
            </span>
            <span className="text-sm">
              {formatPrice(computeShippingCents(available, "ship", subtotal, options.shipping))}
            </span>
          </label>
          {pickupAllowed && (
            <label
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors",
                effectiveMethod === "pickup" ? "border-primary bg-primary/5" : "border-border",
              )}
            >
              <input
                type="radio"
                name="method"
                className="mt-1"
                checked={effectiveMethod === "pickup"}
                onChange={() => setMethod("pickup")}
              />
              <span className="flex flex-1 flex-col">
                <span className="text-sm font-medium">{options.pickup.label}</span>
                <span className="text-xs text-muted-foreground">{options.pickup.instructions}</span>
              </span>
              <span className="text-sm">Free</span>
            </label>
          )}
        </div>

        <dl className="mt-6 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd>{formatPrice(subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Shipping</dt>
            <dd>{shipping === 0 ? "Free" : formatPrice(shipping)}</dd>
          </div>
          <div className="flex justify-between border-t border-border pt-2 font-display text-lg">
            <dt>Total</dt>
            <dd>{formatPrice(subtotal + shipping)}</dd>
          </div>
        </dl>
        <p className="mt-2 text-xs text-muted-foreground">Any sales tax is added at checkout.</p>

        <Button
          className="mt-6 w-full rounded-full"
          disabled={starting || available.length === 0 || blocked > 0}
          onClick={() => void handleCheckout()}
        >
          {starting ? "Taking you to checkout…" : "Check out"}
        </Button>
        {blocked > 0 && (
          <p className="mt-2 text-xs text-destructive">
            Remove the unavailable piece{blocked === 1 ? "" : "s"} to continue.
          </p>
        )}
        <button
          type="button"
          onClick={clear}
          className="mt-4 w-full text-center text-xs text-muted-foreground underline"
        >
          Empty cart
        </button>
        <p className="mt-4 text-xs text-muted-foreground">
          Your pieces are held for {HOLD_MINUTES} minutes once you start checkout. Payment is handled securely by Stripe.
        </p>
      </aside>
    </div>
  );
}
