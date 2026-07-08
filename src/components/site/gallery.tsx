import { pieces } from "@/lib/site";
import { PieceCard } from "./piece-card";

export function Gallery() {
  return (
    <section id="work" className="scroll-mt-20">
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="max-w-2xl">
          <p className="mb-5 flex items-center gap-3 text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground">
            <span className="h-px w-8 rule-clay" />
            Available work
          </p>
          <h2 className="text-balance font-display text-4xl leading-tight md:text-5xl">
            One-of-a-kind pieces, ready for a home
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            A rotating selection of finished work. Something catch your eye, or
            want it in a different glaze? Every piece can be commissioned.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {pieces.map((piece) => (
            <PieceCard key={piece.id} piece={piece} />
          ))}
        </div>
      </div>
    </section>
  );
}
