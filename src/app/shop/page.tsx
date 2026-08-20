import type { Metadata } from "next";
import Link from "next/link";
import { preloadQuery, preloadedQueryResult } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import type { PublicPiece } from "@convex/pieces";
import { ShopGrid } from "@/components/shop/shop-grid";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { nowForCatalog } from "@/lib/catalog-time";
import { collectionLabel } from "@/lib/shop";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Shop",
  description: "Handmade pottery available to buy from Georgia Perkins.",
};

// Availability is time- and order-dependent; never serve a build-time snapshot.
export const dynamic = "force-dynamic";

const COLLECTIONS = ["wildlife", "totems", "heirloom"] as const;

function parseCollection(raw: string | undefined) {
  return COLLECTIONS.find((id) => id === raw);
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ collection?: string }>;
}) {
  const { collection: rawCollection } = await searchParams;
  const collection = parseCollection(rawCollection);

  const preloaded = await preloadQuery(api.pieces.listPublished, {
    now: nowForCatalog(),
  });
  const pieces = preloadedQueryResult(preloaded);

  const filters: { id?: PublicPiece["collection"]; label: string }[] = [
    { label: "All" },
    ...COLLECTIONS.map((id) => ({ id, label: collectionLabel[id] })),
  ];

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-start px-6 py-24">
        <p className="text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground">
          Shop
        </p>
        {pieces.length > 0 && (
          <h1 className="mt-5 text-balance font-display text-4xl leading-tight md:text-5xl">
            {collection ? collectionLabel[collection] : "Available work"}
          </h1>
        )}
        {pieces.length > 0 && (
          <nav className="mt-8 flex flex-wrap gap-2">
            {filters.map((filter) => {
              const active = filter.id === collection;
              return (
                <Link
                  key={filter.label}
                  href={filter.id ? `/shop?collection=${filter.id}` : "/shop"}
                  className={cn(
                    "rounded-full border px-4 py-1.5 text-sm transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  {filter.label}
                </Link>
              );
            })}
          </nav>
        )}
        <div className="mt-10 w-full">
          <ShopGrid preloaded={preloaded} collection={collection} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
