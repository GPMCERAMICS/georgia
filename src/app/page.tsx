import { preloadQuery, preloadedQueryResult } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { About } from "@/components/site/about";
import { Collections } from "@/components/site/collections";
import { Commission } from "@/components/site/commission";
import { Hero } from "@/components/site/hero";
import { JsonLd } from "@/components/site/json-ld";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { nowForCatalog } from "@/lib/catalog-time";

// The collections section renders the live catalog, so the homepage is
// request-rendered like /shop instead of a build-time snapshot.
export const dynamic = "force-dynamic";

export default async function Home() {
  const preloaded = await preloadQuery(api.pieces.listPublished, {
    now: nowForCatalog(),
  });
  const pieces = preloadedQueryResult(preloaded);

  return (
    <>
      <JsonLd pieces={pieces} />
      <SiteHeader />
      <main>
        <Hero />
        <Collections preloaded={preloaded} />
        <About />
        <Commission />
      </main>
      <SiteFooter />
    </>
  );
}
