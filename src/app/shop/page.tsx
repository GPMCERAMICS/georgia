import type { Metadata } from "next";
import { preloadQuery, preloadedQueryResult } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { ShopGrid } from "@/components/shop/shop-grid";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { nowForCatalog } from "@/lib/catalog-time";

export const metadata: Metadata = {
  title: "Shop",
  description: "Handmade pottery available to buy from Georgia Perkins.",
};

// Availability is time- and order-dependent; never serve a build-time snapshot.
export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const preloaded = await preloadQuery(api.pieces.listPublished, {
    now: nowForCatalog(),
  });
  const pieces = preloadedQueryResult(preloaded);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-start px-6 py-24">
        <p className="text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground">
          Shop
        </p>
        {pieces.length > 0 && (
          <h1 className="mt-5 text-balance font-display text-4xl leading-tight md:text-5xl">
            Available work
          </h1>
        )}
        <div className="mt-10 w-full">
          <ShopGrid preloaded={preloaded} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
