"use client";

import Link from "next/link";
import { useQuery, usePreloadedQuery, type Preloaded } from "convex/react";
import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/button";
import { ShopPieceCard } from "./shop-piece-card";
import { useCatalogNow } from "./use-catalog-now";

/**
 * The catalog grid. Server-rendered from the preloaded query for real HTML,
 * then live: the preloaded subscription flips cards the moment an order lands,
 * and a minute tick re-queries with fresh `now` so expired holds release on
 * time without a refresh.
 */
export function ShopGrid({
  preloaded,
  tag,
}: {
  preloaded: Preloaded<typeof api.pieces.listPublished>;
  tag?: string;
}) {
  const initial = usePreloadedQuery(preloaded);
  const now = useCatalogNow();
  const live = useQuery(api.pieces.listPublished, now === null ? "skip" : { now });

  const pieces = (live ?? initial).filter(
    (piece) => tag === undefined || piece.tags.includes(tag),
  );

  if (pieces.length === 0 && tag !== undefined) {
    return (
      <p className="text-center text-lg">
        Nothing under this tag yet — new work is on the way.
      </p>
    );
  }

  if (pieces.length === 0) {
    return (
      <div className="flex flex-col items-center text-center">
        <h2 className="text-balance font-display text-3xl leading-tight md:text-4xl">
          Pieces are on their way
        </h2>
        <p className="mt-4 max-w-prose text-lg">
          Georgia is photographing and listing her available work now. In the
          meantime, commissions are open.
        </p>
        <Button asChild size="lg" className="mt-8 px-8">
          <Link href="/#commission">Commission a piece</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid w-full gap-x-8 gap-y-16 sm:grid-cols-2">
      {pieces.map((piece) => (
        <ShopPieceCard key={piece._id} piece={piece} />
      ))}
    </div>
  );
}
