import type { Metadata } from "next";
import Link from "next/link";
import { preloadQuery, preloadedQueryResult } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { ShopGrid } from "@/components/shop/shop-grid";
import { SiteFooter } from "@/components/site/site-footer";
import { BannerStatement, PageBanner } from "@/components/site/page-banner";
import { nowForCatalog } from "@/lib/catalog-time";
import { site } from "@/lib/site";
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
      <PageBanner image="/banner-shop.webp">
        <BannerStatement>
          {activeTag?.description || site.description}
        </BannerStatement>
      </PageBanner>
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-6 pb-24 pt-14 md:px-10">
        <h1 className="text-center font-display text-4xl md:text-5xl">
          {activeTag ? activeTag.name : "Shop"}
        </h1>
        {pieces.length > 0 && tags.length > 0 && (
          <nav
            className="mt-6 flex flex-wrap items-center justify-center gap-y-2 text-lg"
            aria-label="Filter by tag"
          >
            {[{ slug: undefined, name: "All" }, ...tags].map((tag, i) => {
              const active = tag.slug === activeTag?.slug;
              return (
                <span key={tag.slug ?? "all"} className="flex items-center">
                  {i > 0 && <span aria-hidden className="mx-4 h-4 w-px bg-border" />}
                  <Link
                    href={tag.slug ? `/shop?tag=${tag.slug}` : "/shop"}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "border-b pb-0.5 transition-colors",
                      active
                        ? "border-current font-medium"
                        : "border-transparent hover:border-current",
                    )}
                  >
                    {tag.name}
                  </Link>
                </span>
              );
            })}
          </nav>
        )}
        <div className="mt-12 w-full">
          <ShopGrid preloaded={preloaded} tag={activeTag?.slug} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
