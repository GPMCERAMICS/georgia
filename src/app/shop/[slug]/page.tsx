import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { fetchQuery, preloadQuery, preloadedQueryResult } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { PiecePurchasePanel } from "@/components/shop/piece-purchase-panel";
import { PlaceholderVessel } from "@/components/site/placeholder-vessel";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { nowForCatalog } from "@/lib/catalog-time";
import { collectionLabel, placeholderShape } from "@/lib/shop";
import { site } from "@/lib/site";

// Availability is time- and order-dependent; never serve a build-time snapshot.
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const piece = await fetchQuery(api.pieces.getBySlug, {
    slug,
    now: nowForCatalog(),
  });
  if (!piece) return { title: "Piece not found" };

  return {
    title: piece.title,
    description: piece.description,
    openGraph: {
      title: `${piece.title} — ${site.name}`,
      description: piece.description,
      images: piece.imageUrls.slice(0, 1),
    },
  };
}

const schemaAvailability = {
  available: "https://schema.org/InStock",
  sold: "https://schema.org/SoldOut",
  unreleased: "https://schema.org/PreOrder",
  hidden: "https://schema.org/OutOfStock",
} as const;

export default async function PiecePage({ params }: Params) {
  const { slug } = await params;
  const preloaded = await preloadQuery(api.pieces.getBySlug, {
    slug,
    now: nowForCatalog(),
  });
  const piece = preloadedQueryResult(preloaded);
  if (!piece) notFound();

  const [mainImage, ...restImages] = piece.imageUrls;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: piece.title,
    description: piece.description,
    image: piece.imageUrls,
    brand: { "@type": "Brand", name: site.name },
    offers: {
      "@type": "Offer",
      url: `${site.url}/shop/${piece.slug}`,
      priceCurrency: "USD",
      price: (piece.priceCents / 100).toFixed(2),
      availability: schemaAvailability[piece.availability.state],
    },
  };

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-16 md:py-24">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <div className="grid gap-10 md:grid-cols-2 md:gap-14">
          <div className="flex flex-col gap-4">
            <div className="relative aspect-square overflow-hidden rounded-2xl border border-border bg-card">
              {mainImage ? (
                <Image
                  src={mainImage}
                  alt={piece.title}
                  fill
                  priority
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="object-cover"
                />
              ) : (
                <PlaceholderVessel
                  shape={placeholderShape(piece.slug)}
                  label={piece.title}
                  className="h-full w-full"
                />
              )}
            </div>
            {restImages.length > 0 && (
              <div className="grid grid-cols-3 gap-4">
                {restImages.map((url) => (
                  <div
                    key={url}
                    className="relative aspect-square overflow-hidden rounded-xl border border-border bg-card"
                  >
                    <Image
                      src={url}
                      alt={piece.title}
                      fill
                      sizes="(min-width: 768px) 16vw, 33vw"
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col items-start">
            <p className="text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground">
              {collectionLabel[piece.collection]}
            </p>
            <h1 className="mt-4 text-balance font-display text-4xl leading-tight md:text-5xl">
              {piece.title}
            </h1>
            {piece.size && (
              <p className="mt-3 text-sm uppercase tracking-wider text-muted-foreground">
                {piece.size}
              </p>
            )}

            <PiecePurchasePanel preloaded={preloaded} />

            <div className="mt-10 max-w-prose space-y-4 text-muted-foreground">
              {piece.description.split("\n\n").map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
