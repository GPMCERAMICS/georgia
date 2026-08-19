"use client";

import Link from "next/link";
import {
  useQuery,
  usePreloadedQuery,
  type Preloaded,
} from "convex/react";
import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/button";
import { ShopPieceCard } from "./shop-piece-card";
import { useCatalogNow } from "./use-catalog-now";

/**
 * The catalog grid. Server-rendered from the preloaded query for real HTML,
 * then live: the preloaded subscription flips cards the moment an order lands,
 * and a minute tick re-queries with fresh `now` so drops release on time
 * without a refresh.
 */
export function ShopGrid({
  preloaded,
}: {
  preloaded: Preloaded<typeof api.pieces.listPublished>;
}) {
  const initial = usePreloadedQuery(preloaded);
  const now = useCatalogNow();
  const live = useQuery(
    api.pieces.listPublished,
    now === null ? "skip" : { now },
  );

  const pieces = live ?? initial;

  if (pieces.length === 0) {
    return (
      <div className="flex flex-col items-start">
        <h1 className="text-balance font-display text-4xl leading-tight md:text-5xl">
          Pieces are on their way
        </h1>
        <p className="mt-4 max-w-prose text-muted-foreground">
          Georgia is photographing and listing her available work now. In the
          meantime, commissions are open.
        </p>
        <Button asChild className="mt-8 rounded-full px-5">
          <Link href="/#commission">Commission a piece</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid w-full gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {pieces.map((piece) => (
        <ShopPieceCard key={piece._id} piece={piece} />
      ))}
    </div>
  );
}
