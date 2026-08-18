import Image from "next/image";
import type { Collection } from "@/lib/site";
import { PieceCard } from "./piece-card";

export function CollectionSection({ collection }: { collection: Collection }) {
  return (
    <section id={collection.id} className="scroll-mt-24">
      {/* Header row: framed image | title + description */}
      <div className="grid items-center gap-8 md:grid-cols-3 md:gap-10">
        {/* Framed image */}
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

        {/* Title + description across the next two columns */}
        <div className="md:col-span-2">
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
        </div>
      </div>

      {/* Grid of commission pieces (square) */}
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {collection.pieces.map((piece) => (
          <PieceCard key={piece.id} piece={piece} />
        ))}
      </div>
    </section>
  );
}
