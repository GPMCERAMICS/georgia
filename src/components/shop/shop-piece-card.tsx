import Image from "next/image";
import Link from "next/link";
import type { PublicPiece } from "@convex/pieces";
import { PlaceholderVessel } from "@/components/site/placeholder-vessel";
import {
  availabilityLine,
  formatPrice,
  placeholderShape,
} from "@/lib/shop";
import { cn } from "@/lib/utils";

export function ShopPieceCard({ piece }: { piece: PublicPiece }) {
  const sold = piece.availability.state === "sold";
  const line = availabilityLine(piece);

  return (
    <Link
      href={`/shop/${piece.slug}`}
      className="group block focus-visible:outline-none"
    >
      <article
        className={cn(
          "flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_24px_48px_-24px_oklch(0.2_0.05_260/0.4)] group-focus-visible:ring-2 group-focus-visible:ring-ring",
          sold && "opacity-80",
        )}
      >
        <div className="relative aspect-square overflow-hidden">
          {piece.imageUrls[0] ? (
            <Image
              src={piece.imageUrls[0]}
              alt={piece.title}
              fill
              sizes="(min-width: 768px) 33vw, 100vw"
              className={cn(
                "object-cover transition-transform duration-500 group-hover:scale-[1.04]",
                sold && "grayscale-[0.4]",
              )}
            />
          ) : (
            <PlaceholderVessel
              shape={placeholderShape(piece.slug)}
              label={piece.title}
              className="h-full w-full transition-transform duration-500 group-hover:scale-[1.04]"
            />
          )}
          {sold && (
            <span className="absolute left-4 top-4 rounded-full bg-foreground/85 px-3 py-1 text-xs font-medium uppercase tracking-wider text-background">
              Sold
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col p-5">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="font-display text-xl leading-snug">{piece.title}</h3>
            <span
              className={cn(
                "shrink-0 font-display text-lg",
                sold ? "text-muted-foreground line-through" : "text-primary",
              )}
            >
              {formatPrice(piece.priceCents)}
            </span>
          </div>
          {piece.size && (
            <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
              {piece.size}
            </p>
          )}
          {!sold && line && (
            <p className="mt-3 text-sm text-muted-foreground">{line}</p>
          )}
        </div>
      </article>
    </Link>
  );
}
