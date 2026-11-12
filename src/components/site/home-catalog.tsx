"use client";

import Link from "next/link";
import { useQuery, usePreloadedQuery, type Preloaded } from "convex/react";
import { api } from "@convex/_generated/api";
import type { PublicPiece } from "@convex/pieces";
import type { PublicTag } from "@convex/tags";
import { useCart } from "@/components/shop/cart-provider";
import { PieceImage, statusLabel } from "@/components/shop/shop-piece-card";
import { useCatalogNow } from "@/components/shop/use-catalog-now";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/shop";

/** Pieces carrying this tag fill the Best Sellers row. */
export const BEST_SELLER_TAG = "best-sellers";

const isAvailable = (piece: PublicPiece) => piece.availability.state === "available";

/**
 * The homepage's two shopping sections, read live from the catalog:
 * collection tiles (one per tag) and a Best Sellers row.
 */
export function HomeCatalog({
  preloaded,
  tags,
}: {
  preloaded: Preloaded<typeof api.pieces.listPublished>;
  tags: PublicTag[];
}) {
  const initial = usePreloadedQuery(preloaded);
  const now = useCatalogNow();
  const live = useQuery(api.pieces.listPublished, now === null ? "skip" : { now });
  const pieces = live ?? initial;

  // A tile needs a photo, so only tags with a photographed piece qualify.
  // Featured tags lead; other tags top the row up to two.
  const cover = (tag: PublicTag) => {
    const tagged = pieces.filter(
      (piece) => piece.tags.includes(tag.slug) && piece.imageUrls.length > 0,
    );
    return tagged.find(isAvailable) ?? tagged[0];
  };
  const shoppable = tags.filter((tag) => tag.slug !== BEST_SELLER_TAG && cover(tag));
  const featured = shoppable.filter((tag) => tag.featured);
  const tiles = [
    ...featured,
    ...shoppable.filter((tag) => !tag.featured).slice(0, Math.max(0, 2 - featured.length)),
  ];

  // Georgia's picks if she has tagged any; otherwise the first pieces on sale.
  const tagged = pieces.filter((piece) => piece.tags.includes(BEST_SELLER_TAG));
  const bestSellers = (tagged.length > 0 ? tagged : pieces.filter(isAvailable)).slice(0, 3);

  return (
    <>
      {tiles.length > 0 && (
        <section className="mx-auto w-full max-w-[1400px] px-6 py-20 md:px-10 md:py-28">
          <h2 className="sr-only">Collections</h2>
          <div
            className={
              tiles.length >= 3
                ? "grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3"
                : "grid gap-x-8 gap-y-14 sm:grid-cols-2"
            }
          >
            {tiles.map((tag) => {
              const piece = cover(tag)!;
              return (
                <Link key={tag.slug} href={`/shop?tag=${tag.slug}`} className="group block">
                  <PieceImage
                    piece={piece}
                    sizes="(min-width: 640px) 50vw, 100vw"
                    className="aspect-[5/4]"
                  />
                  <span className="mt-7 inline-block border-b border-current pb-1 font-display text-3xl leading-none md:text-4xl">
                    {tag.name}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {bestSellers.length > 0 && (
        <section className="mx-auto w-full max-w-[1400px] px-6 pb-20 md:px-10 md:pb-28">
          <div className="flex items-baseline justify-between gap-6">
            <h2 className="font-display text-3xl md:text-4xl">Best Sellers</h2>
            <Link href="/shop" className="border-b border-current pb-0.5 text-lg">
              Shop all
            </Link>
          </div>
          <div className="mt-8 grid gap-x-3 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {bestSellers.map((piece) => (
              <BestSellerCard key={piece._id} piece={piece} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function BestSellerCard({ piece }: { piece: PublicPiece }) {
  const cart = useCart();
  const status = statusLabel(piece);
  const inCart = cart.has(piece._id);

  return (
    <article className="flex flex-col">
      <Link href={`/shop/${piece.slug}`} className="group relative block">
        <PieceImage piece={piece} sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" />
        {status && (
          <span className="absolute right-0 top-0 bg-foreground px-3 py-1.5 text-sm uppercase tracking-wider text-background">
            {status}
          </span>
        )}
      </Link>
      <h3 className="mt-6 font-display text-2xl leading-snug">
        <Link href={`/shop/${piece.slug}`}>{piece.title}</Link>
      </h3>
      <p className="mt-2">{formatPrice(piece.priceCents)}</p>
      <p className="mt-4 line-clamp-4 leading-relaxed">{piece.description}</p>
      <div className="mt-7">
        {status ? (
          <Button asChild variant="outline" size="lg" className="px-8">
            <Link href={`/shop/${piece.slug}`}>View piece</Link>
          </Button>
        ) : inCart ? (
          <Button variant="outline" size="lg" className="px-8" onClick={cart.open}>
            In your cart
          </Button>
        ) : (
          <Button
            size="lg"
            className="px-8"
            onClick={() => {
              cart.add(piece._id);
              cart.open();
            }}
          >
            Add to cart
          </Button>
        )}
      </div>
    </article>
  );
}
