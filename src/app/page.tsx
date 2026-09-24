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
import { fetchVisibleTags } from "@/lib/tags";

// The collections section renders the live catalog, so the homepage is
// request-rendered like /shop instead of a build-time snapshot.
export const dynamic = "force-dynamic";

export default async function Home() {
  const [preloaded, tags] = await Promise.all([
    preloadQuery(api.pieces.listPublished, { now: nowForCatalog() }),
    fetchVisibleTags(),
  ]);
  const pieces = preloadedQueryResult(preloaded);
  const featured = tags.filter((tag) => tag.featured);

  return (
    <>
      <JsonLd pieces={pieces} tags={tags} />
      <SiteHeader />
      <main>
        <Hero />
        <Collections preloaded={preloaded} tags={featured} />
        <About />
        <Commission />
      </main>
      <SiteFooter />
    </>
  );
}
