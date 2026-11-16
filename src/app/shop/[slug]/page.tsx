import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchQuery, preloadQuery, preloadedQueryResult } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { PIECE_PHOTO_FIT, PieceGallery } from "@/components/shop/piece-gallery";
import { PiecePurchasePanel } from "@/components/shop/piece-purchase-panel";
import { ShopPieceCard } from "@/components/shop/shop-piece-card";
import { PlaceholderVessel } from "@/components/site/placeholder-vessel";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { nowForCatalog } from "@/lib/catalog-time";
import { fetchVisibleTags } from "@/lib/tags";
import { formatDimensions, placeholderShape } from "@/lib/shop";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";

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
  const now = nowForCatalog();
  const [preloaded, tags, catalog] = await Promise.all([
    preloadQuery(api.pieces.getBySlug, { slug, now }),
    fetchVisibleTags(),
    fetchQuery(api.pieces.listPublished, { now }),
  ]);
  const piece = preloadedQueryResult(preloaded);
  if (!piece) notFound();

  const pieceTags = tags.filter((tag) => piece.tags.includes(tag.slug));

  // "More from this collection": pieces sharing this one's main tag first,
  // then ones sharing any other tag, with pieces still for sale ahead of sold.
  const collection = pieceTags.find((tag) => tag.featured) ?? pieceTags[0];
  const others = catalog.filter((other) => other._id !== piece._id);
  const forSaleFirst = (list: typeof others) => [
    ...list.filter((other) => other.availability.state === "available"),
    ...list.filter((other) => other.availability.state !== "available"),
  ];
  const sameCollection = collection
    ? others.filter((other) => other.tags.includes(collection.slug))
    : [];
  const sharedTag = others.filter(
    (other) =>
      !sameCollection.includes(other) && other.tags.some((tag) => piece.tags.includes(tag)),
  );
  const related = [...forSaleFirst(sameCollection), ...forSaleFirst(sharedTag)].slice(0, 4);

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
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-6 pb-24 md:px-10">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <div className="grid items-start gap-10 md:grid-cols-2 md:gap-16">
          {/*
            Breadcrumb, photo and thumbnails pin together while a longer
            details column scrolls beside them. The photo is capped by the
            window's height (see PIECE_PHOTO_FIT) so the whole block, thumbnails
            included, is always on screen while pinned.
          */}
          <div className="min-w-0 md:sticky md:top-24 md:py-4">
            <nav aria-label="Breadcrumb" className="mb-3 truncate py-1 text-lg">
              <Link href="/shop" className="inline-block py-1 hover:underline hover:underline-offset-4">
                Shop
              </Link>
              <span aria-hidden className="mx-2 font-[system-ui]">
                ›
              </span>
              <span>{piece.title}</span>
            </nav>
            {piece.imageUrls.length > 0 ? (
              <PieceGallery images={piece.imageUrls} title={piece.title} />
            ) : (
              <div className={cn("aspect-square bg-muted", PIECE_PHOTO_FIT)}>
                <PlaceholderVessel
                  shape={placeholderShape(piece.slug)}
                  label={piece.title}
                  className="h-full w-full"
                />
              </div>
            )}
          </div>

          <div className="flex min-w-0 flex-col items-start text-left md:pt-14">
            <h1 className="max-w-xl text-balance font-display text-3xl leading-tight sm:text-4xl lg:text-5xl">
              {piece.title}
            </h1>
            {piece.size && <p className="mt-3 text-muted-foreground">{piece.size}</p>}

            <PiecePurchasePanel preloaded={preloaded}>
              <div className="mt-6 max-w-xl space-y-4 text-lg leading-relaxed">
                {piece.description.split("\n\n").map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </PiecePurchasePanel>

            {details.length > 0 && (
              <dl className="mt-12 w-full max-w-xl divide-y divide-border border-y border-border">
                {details.map((detail) => (
                  <div key={detail.label} className="flex items-baseline justify-between gap-8 py-3">
                    <dt className="shrink-0 text-muted-foreground">{detail.label}</dt>
                    <dd className="text-right">{detail.value}</dd>
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

        {related.length > 0 && (
          <section className="mt-20 border-t border-border pt-14 md:mt-28">
            <div className="flex items-baseline justify-between gap-6">
              <h2 className="font-display text-3xl md:text-4xl">
                {collection ? `More from ${collection.name}` : "You may also like"}
              </h2>
              <Link
                href={collection ? `/shop?tag=${collection.slug}` : "/shop"}
                className="shrink-0 py-1 text-lg underline-offset-4 hover:underline"
              >
                Shop all
              </Link>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-12 md:gap-x-6 lg:grid-cols-4">
              {related.map((other) => (
                <ShopPieceCard
                  key={other._id}
                  piece={other}
                  sizes="(min-width: 1024px) 25vw, 50vw"
                  compact
                />
              ))}
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
