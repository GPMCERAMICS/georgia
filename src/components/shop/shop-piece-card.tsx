import Image from "next/image";
import Link from "next/link";
import type { PublicPiece } from "@convex/pieces";
import { PlaceholderVessel } from "@/components/site/placeholder-vessel";
import { formatPrice, placeholderShape } from "@/lib/shop";
import { cn } from "@/lib/utils";

/** The square photo every product card and collection tile shares. */
export function PieceImage({
  piece,
  sizes,
  className,
}: {
  piece: PublicPiece;
  sizes: string;
  className?: string;
}) {
  return (
    <div className={cn("relative aspect-square overflow-hidden bg-muted", className)}>
      {piece.imageUrls[0] ? (
        <Image
          src={piece.imageUrls[0]}
          alt={piece.title}
          fill
          sizes={sizes}
          className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
        />
      ) : (
        <PlaceholderVessel
          shape={placeholderShape(piece.slug)}
          label={piece.title}
          className="h-full w-full"
        />
      )}
    </div>
  );
}

/** "Sold" / "On hold", or nothing when the piece can be bought. */
export function statusLabel(piece: PublicPiece): string | null {
  if (piece.availability.state === "sold") return "Sold";
  if (piece.availability.state === "held") return "On hold";
  return null;
}

export function ShopPieceCard({ piece }: { piece: PublicPiece }) {
  const status = statusLabel(piece);

  return (
    <Link href={`/shop/${piece.slug}`} className="group block focus-visible:outline-none">
      <article className="group-focus-visible:ring-2 group-focus-visible:ring-ring">
        <PieceImage piece={piece} sizes="(min-width: 640px) 50vw, 100vw" />
        <div className="mt-5 flex items-baseline justify-between gap-4">
          <h3 className="font-display text-xl leading-snug md:text-2xl">{piece.title}</h3>
          {status && <span className="shrink-0 text-sm text-clay">{status}</span>}
        </div>
        <p className={cn("mt-1.5", status === "Sold" && "text-muted-foreground line-through")}>
          {formatPrice(piece.priceCents)}
        </p>
      </article>
    </Link>
  );
}
