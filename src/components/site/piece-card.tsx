import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { Piece } from "@/lib/site";
import { PlaceholderVessel } from "./placeholder-vessel";

export function PieceCard({ piece }: { piece: Piece }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_48px_-24px_oklch(0.4_0.08_40/0.45)]">
      <div className="relative aspect-[4/5] overflow-hidden">
        {piece.image ? (
          <Image
            src={piece.image}
            alt={`${piece.title} — ${piece.description}`}
            fill
            sizes="(min-width: 768px) 33vw, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <PlaceholderVessel
            shape={piece.shape}
            label={`${piece.title} — ${piece.description}`}
            className="h-full w-full transition-transform duration-500 group-hover:scale-[1.04]"
          />
        )}
        <span className="absolute left-3 top-3 rounded-full bg-background/85 px-3 py-1 text-[0.7rem] font-medium uppercase tracking-wider text-muted-foreground backdrop-blur-sm">
          {piece.category}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-display text-xl leading-snug">{piece.title}</h3>
          <span className="shrink-0 font-display text-lg text-primary">
            {piece.price}
          </span>
        </div>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
          {piece.description}
        </p>

        {piece.stripeLink ? (
          <Button asChild className="mt-4 w-full rounded-full">
            <a href={piece.stripeLink} target="_blank" rel="noopener noreferrer">
              Buy — {piece.price}
            </a>
          </Button>
        ) : (
          <Button
            asChild
            variant="outline"
            className="mt-4 w-full rounded-full border-primary/30 bg-transparent"
          >
            <Link href="#commission">Inquire to buy</Link>
          </Button>
        )}
      </div>
    </article>
  );
}
