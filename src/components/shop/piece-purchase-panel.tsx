"use client";

import Link from "next/link";
import { useQuery, usePreloadedQuery, type Preloaded } from "convex/react";
import { Check } from "lucide-react";
import { api } from "@convex/_generated/api";
import { HOLD_MINUTES } from "@convex/lib/hold";
import { Button } from "@/components/ui/button";
import { availabilityLine, formatPrice } from "@/lib/shop";
import { useCart } from "./cart-provider";
import { useCatalogNow } from "./use-catalog-now";

/**
 * Price, live availability, and the call to action.
 *
 * Live for the same reasons as the grid: order writes flip "Sold" instantly
 * via the subscription. A sold one-off becomes a commission reference — the
 * piece stays, the button changes. A held one shows that it may come back.
 */
export function PiecePurchasePanel({
  preloaded,
}: {
  preloaded: Preloaded<typeof api.pieces.getBySlug>;
}) {
  const initial = usePreloadedQuery(preloaded);
  const now = useCatalogNow();
  const slug = initial?.slug;
  const live = useQuery(
    api.pieces.getBySlug,
    now === null || slug === undefined ? "skip" : { slug, now },
  );
  const cart = useCart();

  const piece = live === undefined ? initial : live;
  if (!piece) return null;

  const sold = piece.availability.state === "sold";
  const held = piece.availability.state === "held";
  const inCart = cart.has(piece._id);
  const line = availabilityLine(piece);

  return (
    <div className="mt-8">
      <p className="font-display text-3xl text-primary">{formatPrice(piece.priceCents)}</p>
      {line && !held && <p className="mt-2 text-sm font-medium text-muted-foreground">{line}</p>}

      <div className="mt-6 flex flex-col items-start gap-3">
        {sold ? (
          <>
            <Button asChild className="rounded-full px-6">
              <Link href={`/commissions?piece=${piece.slug}`}>Commission something like this</Link>
            </Button>
            <p className="text-sm text-muted-foreground">
              This piece has found a home. Georgia can make something in the same spirit, made just for you.
            </p>
          </>
        ) : held ? (
          <>
            <div className="flex flex-wrap gap-3">
              <Button disabled className="rounded-full px-6">
                On hold
              </Button>
              <Button asChild variant="outline" className="rounded-full px-6">
                <Link href={`/commissions?piece=${piece.slug}`}>Ask about a custom version</Link>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Someone is checking out with this piece. If they don&apos;t finish within {HOLD_MINUTES} minutes, it goes back on sale here.
            </p>
          </>
        ) : inCart ? (
          <>
            <div className="flex flex-wrap gap-3">
              <Button asChild className="rounded-full px-6">
                <Link href="/cart">Check out</Link>
              </Button>
              <Button variant="outline" className="rounded-full px-6" onClick={cart.open}>
                <Check /> In your cart
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-wrap gap-3">
              <Button
                className="rounded-full px-6"
                onClick={() => {
                  cart.add(piece._id);
                  cart.open();
                }}
              >
                Add to cart
              </Button>
              <Button asChild variant="outline" className="rounded-full px-6">
                <Link href={`/commissions?piece=${piece.slug}`}>Ask about a custom version</Link>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {piece.mode === "madeToOrder"
                ? "Made for you after you order. Every one is hand painted, so yours will be its own."
                : "One of a kind. Once it sells, it's gone."}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
