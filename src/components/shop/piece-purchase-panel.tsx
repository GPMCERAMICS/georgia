"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  useQuery,
  usePreloadedQuery,
  type Preloaded,
} from "convex/react";
import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/button";
import { nowForCatalog } from "@/lib/catalog-time";
import { availabilityLine, formatPrice } from "@/lib/shop";

/**
 * Price, live availability, and the call to action.
 *
 * Live for the same reasons as the grid: order writes flip "Sold" instantly
 * via the subscription, and a minute tick releases drops on schedule.
 *
 * Until checkout lands (plan 2), the CTA routes buyers to the commission
 * form — the Buy button will take this component's place.
 */
export function PiecePurchasePanel({
  preloaded,
}: {
  preloaded: Preloaded<typeof api.pieces.getBySlug>;
}) {
  const initial = usePreloadedQuery(preloaded);

  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(nowForCatalog());
    const tick = setInterval(() => setNow(nowForCatalog()), 60_000);
    return () => clearInterval(tick);
  }, []);
  const slug = initial?.slug;
  const live = useQuery(
    api.pieces.getBySlug,
    now === null || slug === undefined ? "skip" : { slug, now },
  );

  const piece = live === undefined ? initial : live;
  if (!piece) return null;

  const sold = piece.availability.state === "sold";
  const line = availabilityLine(piece);

  return (
    <div className="mt-8">
      <p className="font-display text-3xl text-primary">
        {formatPrice(piece.priceCents)}
      </p>
      {line && (
        <p className="mt-2 text-sm font-medium text-muted-foreground">{line}</p>
      )}

      <div className="mt-6 flex flex-col items-start gap-3">
        {sold ? (
          <>
            <Button asChild className="rounded-full px-6">
              <Link href="/#commission">Commission something similar</Link>
            </Button>
            <p className="text-sm text-muted-foreground">
              This piece has found a home, but Georgia takes commissions.
            </p>
          </>
        ) : (
          <>
            <Button asChild className="rounded-full px-6">
              <Link href="/#commission">Inquire to purchase</Link>
            </Button>
            <p className="text-sm text-muted-foreground">
              Online checkout is opening soon — for now, send a note and
              Georgia will reserve it for you.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
