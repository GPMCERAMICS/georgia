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
      <div>
        <h2 className="font-display text-4xl leading-none md:text-6xl">
          {collection.name}
        </h2>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
          {collection.tagline}
        </p>
        <Button asChild className="mt-6 rounded-full px-6">
          <Link href={`/shop?collection=${collection.id}`}>
            Shop the collection
          </Link>
        </Button>
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
