import { preloadQuery, preloadedQueryResult } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { About } from "@/components/site/about";
import { Commission } from "@/components/site/commission";
import { Hero, Intro } from "@/components/site/hero";
import { HomeCatalog } from "@/components/site/home-catalog";
import { JsonLd } from "@/components/site/json-ld";
import { SiteFooter } from "@/components/site/site-footer";
import { nowForCatalog } from "@/lib/catalog-time";
import { fetchVisibleTags } from "@/lib/tags";

// The shopping sections render the live catalog, so the homepage is
// request-rendered like /shop instead of a build-time snapshot.
export const dynamic = "force-dynamic";

export default async function Home() {
  const [preloaded, tags] = await Promise.all([
    preloadQuery(api.pieces.listPublished, { now: nowForCatalog() }),
    fetchVisibleTags(),
  ]);
  const pieces = preloadedQueryResult(preloaded);

  return (
    <>
      <JsonLd pieces={pieces} tags={tags} />
      <main>
        <Hero />
        <Intro />
        <HomeCatalog preloaded={preloaded} tags={tags} />
        <About />
        <Commission />
      </main>
      <SiteFooter />
    </>
  );
}
