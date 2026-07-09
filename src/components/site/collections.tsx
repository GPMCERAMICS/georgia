import { collections } from "@/lib/site";
import { CollectionSection } from "./collection-section";

export function Collections() {
  return (
    <section id="work" className="scroll-mt-20">
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="max-w-2xl">
          <p className="mb-5 flex items-center gap-3 text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground">
            <span className="h-px w-8 rule-clay" />
            The work
          </p>
          <h2 className="text-balance font-display text-4xl leading-tight md:text-5xl">
            Two collections, every piece made to commission
          </h2>
        </div>

        <div className="mt-14 space-y-20 md:space-y-28">
          {collections.map((collection) => (
            <CollectionSection key={collection.id} collection={collection} />
          ))}
        </div>
      </div>
    </section>
  );
}
