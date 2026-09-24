import type { Metadata } from "next";
import Link from "next/link";
import { preloadQuery, preloadedQueryResult } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { ShopGrid } from "@/components/shop/shop-grid";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { nowForCatalog } from "@/lib/catalog-time";
import { fetchVisibleTags } from "@/lib/tags";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Shop",
  description: "Handmade pottery available to buy from Georgia Perkins.",
};

// Availability is time- and order-dependent; never serve a build-time snapshot.
export const dynamic = "force-dynamic";

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string; collection?: string }>;
}) {
  // `collection` is the old query param; old links keep working.
  const params = await searchParams;
  const requested = params.tag ?? params.collection;

  const [preloaded, tags] = await Promise.all([
    preloadQuery(api.pieces.listPublished, { now: nowForCatalog() }),
    fetchVisibleTags(),
  ]);
  const pieces = preloadedQueryResult(preloaded);
  const activeTag = tags.find((tag) => tag.slug === requested);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-start px-6 py-24">
        <p className="text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground">Shop</p>
        {pieces.length > 0 && (
          <h1 className="mt-5 text-balance font-display text-4xl leading-tight md:text-5xl">
            {activeTag ? activeTag.name : "Available work"}
          </h1>
        )}
        {activeTag?.description && (
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted-foreground">
            {activeTag.description}
          </p>
        )}
        {pieces.length > 0 && tags.length > 0 && (
          <nav className="mt-8 flex flex-wrap gap-2" aria-label="Filter by tag">
            {[{ slug: undefined, name: "All" }, ...tags].map((tag) => {
              const active = tag.slug === activeTag?.slug;
              return (
                <Link
                  key={tag.slug ?? "all"}
                  href={tag.slug ? `/shop?tag=${tag.slug}` : "/shop"}
                  className={cn(
                    "rounded-full border px-4 py-1.5 text-sm transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  {tag.name}
                </Link>
              );
            })}
          </nav>
        )}
        <div className="mt-10 w-full">
          <ShopGrid preloaded={preloaded} tag={activeTag?.slug} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
