import type { MetadataRoute } from "next";
import { unstable_rethrow } from "next/navigation";
import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { nowForCatalog } from "@/lib/catalog-time";
import { site } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    {
      url: site.url,
      lastModified: new Date("2026-07-08"),
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${site.url}/shop`,
      changeFrequency: "daily",
      priority: 0.8,
    },
  ];

  // The sitemap must never 500 over a transient backend hiccup; the static
  // pages above still get indexed.
  try {
    const pieces = await fetchQuery(api.pieces.listPublished, {
      now: nowForCatalog(),
    });
    for (const piece of pieces) {
      entries.push({
        url: `${site.url}/shop/${piece.slug}`,
        changeFrequency: "daily",
        priority: 0.7,
      });
    }
  } catch (error) {
    // Let Next's control errors (e.g. the bail-out to dynamic rendering
    // during build) propagate — swallowing them would freeze the sitemap
    // as a static snapshot without piece URLs.
    unstable_rethrow(error);
    console.error("sitemap: could not list published pieces", error);
  }

  return entries;
}
