"use client";

import { useQuery, usePreloadedQuery, type Preloaded } from "convex/react";
import { api } from "@convex/_generated/api";
import type { PublicTag } from "@convex/tags";
import { useCatalogNow } from "@/components/shop/use-catalog-now";
import { CollectionSection } from "./collection-section";

/**
 * The homepage shopping sections: one per featured tag, populated from the
 * live shop catalog. Georgia picks which tags are featured in the dashboard.
 */
export function Collections({
  preloaded,
  tags,
}: {
  preloaded: Preloaded<typeof api.pieces.listPublished>;
  tags: PublicTag[];
}) {
  const initial = usePreloadedQuery(preloaded);
  const now = useCatalogNow();
  const live = useQuery(api.pieces.listPublished, now === null ? "skip" : { now });
  const pieces = live ?? initial;

  if (tags.length === 0) return null;

  return (
    <section id="work" className="scroll-mt-20">
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="space-y-20 md:space-y-28">
          {tags.map((tag) => (
            <CollectionSection
              key={tag.slug}
              tag={tag}
              pieces={pieces.filter((piece) => piece.tags.includes(tag.slug)).slice(0, 6)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
