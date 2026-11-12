import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchQuery, preloadQuery, preloadedQueryResult } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { PieceGallery } from "@/components/shop/piece-gallery";
import { PiecePurchasePanel } from "@/components/shop/piece-purchase-panel";
import { PlaceholderVessel } from "@/components/site/placeholder-vessel";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { nowForCatalog } from "@/lib/catalog-time";
import { fetchVisibleTags } from "@/lib/tags";
import { formatDimensions, placeholderShape } from "@/lib/shop";
import { site } from "@/lib/site";

// Availability is time- and order-dependent; never serve a build-time snapshot.
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const piece = await fetchQuery(api.pieces.getBySlug, { slug, now: nowForCatalog() });
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
  held: "https://schema.org/LimitedAvailability",
  hidden: "https://schema.org/OutOfStock",
} as const;

export default async function PiecePage({ params }: Params) {
  const { slug } = await params;
  const [preloaded, tags] = await Promise.all([
    preloadQuery(api.pieces.getBySlug, { slug, now: nowForCatalog() }),
    fetchVisibleTags(),
  ]);
  const piece = preloadedQueryResult(preloaded);
  if (!piece) notFound();

  const pieceTags = tags.filter((tag) => piece.tags.includes(tag.slug));

  const details: { label: string; value: string }[] = [];
  if (piece.size) details.push({ label: "Size", value: piece.size });
  if (piece.dimensions) details.push({ label: "Dimensions", value: formatDimensions(piece.dimensions) });
  if (piece.foodSafe) details.push({ label: "Food safe", value: "Yes" });
  if (piece.dishwasherSafe) details.push({ label: "Dishwasher", value: "Safe" });
  if (piece.careNotes) details.push({ label: "Care", value: piece.careNotes });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: piece.title,
    description: piece.description,
    image: piece.imageUrls,
    brand: { "@type": "Brand", name: site.name },
    category: pieceTags.map((tag) => tag.name).join(", ") || undefined,
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
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-6 pb-24 pt-6 md:px-10 md:pt-10">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <nav aria-label="Breadcrumb" className="text-lg">
          <Link href="/shop" className="hover:underline hover:underline-offset-4">
            Shop
          </Link>
          <span aria-hidden className="mx-2 font-[system-ui]">
            ›
          </span>
          <span>{piece.title}</span>
        </nav>

        <div className="mt-8 grid gap-12 md:grid-cols-2 md:gap-16">
          <div className="md:order-2">
            {piece.imageUrls.length > 0 ? (
              <PieceGallery images={piece.imageUrls} title={piece.title} />
            ) : (
              <div className="aspect-square bg-muted">
                <PlaceholderVessel
                  shape={placeholderShape(piece.slug)}
                  label={piece.title}
                  className="h-full w-full"
                />
              </div>
            )}
          </div>

          <div className="flex flex-col items-center justify-center text-center md:order-1">
            <h1 className="max-w-xl text-balance font-display text-4xl leading-tight md:text-5xl">
              {piece.title}
            </h1>
            {piece.size && <p className="mt-3 text-muted-foreground">{piece.size}</p>}

            <PiecePurchasePanel preloaded={preloaded}>
              <div className="mx-auto mt-6 max-w-xl space-y-4 text-lg leading-relaxed">
                {piece.description.split("\n\n").map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </PiecePurchasePanel>

            {details.length > 0 && (
              <dl className="mt-12 w-full max-w-md divide-y divide-border border-y border-border text-left">
                {details.map((detail) => (
                  <div key={detail.label} className="grid grid-cols-[120px_1fr] gap-4 py-3">
                    <dt className="text-muted-foreground">{detail.label}</dt>
                    <dd>{detail.value}</dd>
                  </div>
                ))}
              </dl>
            )}

            {pieceTags.length > 0 && (
              <p className="mt-8 text-muted-foreground">
                More in{" "}
                {pieceTags.map((tag, i) => (
                  <span key={tag.slug}>
                    {i > 0 && ", "}
                    <Link
                      href={`/shop?tag=${tag.slug}`}
                      className="text-foreground underline underline-offset-4 hover:no-underline"
                    >
                      {tag.name}
                    </Link>
                  </span>
                ))}
              </p>
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
