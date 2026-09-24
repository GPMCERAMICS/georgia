import Link from "next/link";
import type { PublicPiece } from "@convex/pieces";
import type { PublicTag } from "@convex/tags";
import { ShopPieceCard } from "@/components/shop/shop-piece-card";
import { Button } from "@/components/ui/button";

export function CollectionSection({
  tag,
  pieces,
}: {
  tag: PublicTag;
  pieces: PublicPiece[];
}) {
  return (
    <section id={tag.slug} className="scroll-mt-24">
      <div>
        <h2 className="font-display text-4xl leading-none md:text-6xl">{tag.name}</h2>
        {tag.description && (
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
            {tag.description}
          </p>
        )}
        <Button asChild className="mt-6 rounded-full px-6">
          <Link href={`/shop?tag=${tag.slug}`}>Shop {tag.name}</Link>
        </Button>
      </div>

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
