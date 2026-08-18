import { collections } from "@/lib/site";
import { CollectionSection } from "./collection-section";

export function Collections() {
  return (
    <section id="work" className="scroll-mt-20">
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <p className="text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground">
          Commission collection
        </p>

        <div className="mt-12 space-y-20 md:space-y-28">
          {collections.map((collection) => (
            <CollectionSection key={collection.id} collection={collection} />
          ))}
        </div>
      </div>
    </section>
  );
}
