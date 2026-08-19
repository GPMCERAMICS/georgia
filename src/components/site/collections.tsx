"use client";

import {
  useQuery,
  usePreloadedQuery,
  type Preloaded,
} from "convex/react";
import { api } from "@convex/_generated/api";
import { useCatalogNow } from "@/components/shop/use-catalog-now";
import { collections } from "@/lib/site";
import { CollectionSection } from "./collection-section";

/**
 * The homepage collections, populated from the live shop catalog. Section
 * headers (banner, name, tagline) stay brand copy in site.ts; the cards are
 * the same live shop cards as /shop, linking to each piece's page.
 */
export function Collections({
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

  return (
    <section id="work" className="scroll-mt-20">
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <p className="text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground">
          Shop the collections
        </p>

        <div className="mt-12 space-y-20 md:space-y-28">
          {collections.map((collection) => (
            <CollectionSection
              key={collection.id}
              collection={collection}
              pieces={pieces.filter(
                (piece) => piece.collection === collection.id,
              )}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
