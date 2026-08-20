import Image from "next/image";
import Link from "next/link";
import type { PublicPiece } from "@convex/pieces";
import { ShopPieceCard } from "@/components/shop/shop-piece-card";
import { Button } from "@/components/ui/button";
import type { Collection } from "@/lib/site";

export function CollectionSection({
  collection,
  pieces,
}: {
  collection: Collection;
  pieces: PublicPiece[];
}) {
  return (
    <section id={collection.id} className="scroll-mt-24">
      {/* Header row: framed image | title + description */}
      <div className="grid items-center gap-8 md:grid-cols-3 md:gap-10">
        {collection.image && (
          <div className="relative">
            <div className="relative overflow-hidden rounded-[2rem] border border-border bg-card shadow-xl">
              <Image
                src={collection.image}
                alt={`${collection.name} collection by Georgia Perkins Pottery`}
                width={1260}
                height={907}
                sizes="(min-width: 768px) 22rem, 100vw"
                className="h-auto w-full object-cover"
              />
            </div>
          </div>
        )}

        {/* Title + description across the remaining columns */}
        <div className={collection.image ? "md:col-span-2" : "md:col-span-3"}>
          <div className="flex items-end gap-4">
            <h2 className="font-display text-4xl leading-none md:text-6xl">
              {collection.name}
            </h2>
            {/* Plate-rim triangle rule: fills the line, clipped, aligned to text bottom */}
            <span
              aria-hidden
              className="h-[1.1rem] min-w-0 flex-1 overflow-hidden md:h-[1.9rem]"
              style={{
                backgroundImage: "url(/triangle-borders.svg)",
                backgroundRepeat: "repeat-x",
                backgroundPosition: "left bottom",
                backgroundSize: "auto 100%",
              }}
            />
          </div>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
            {collection.tagline}
          </p>
          <Button asChild className="mt-6 rounded-full px-6">
            <Link href={`/shop?collection=${collection.id}`}>
              Shop the collection
            </Link>
          </Button>
        </div>
      </div>

      {/* Grid of shop pieces (square), linking to their product pages */}
      {pieces.length > 0 ? (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {pieces.map((piece) => (
            <ShopPieceCard key={piece._id} piece={piece} />
          ))}
        </div>
      ) : (
        <p className="mt-10 text-muted-foreground">
          New pieces coming soon — commissions are open.
        </p>
      )}
    </section>
  );
}
