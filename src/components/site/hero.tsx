import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { site } from "@/lib/site";

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-16 md:grid-cols-[1.1fr_0.9fr] md:pb-28 md:pt-24">
        {/* Copy */}
        <div className="animate-rise">
          <p className="mb-5 flex items-center gap-3 text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground">
            <span className="h-px w-8 rule-clay" />
            Handmade ceramics
          </p>
          <h1 className="text-balance font-display text-5xl leading-[0.98] tracking-tight sm:text-6xl md:text-7xl">
            Artisanal plates &amp; garden pieces,{" "}
            <em className="text-primary not-italic">thrown by hand.</em>
          </h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-muted-foreground">
            {site.description}
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="rounded-full px-7">
              <Link href="#commission">Commission a piece</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="rounded-full border-primary/30 bg-transparent px-7"
            >
              <Link href="#work">Shop the work</Link>
            </Button>
          </div>
        </div>

        {/* Art */}
        <div className="animate-rise [animation-delay:120ms]">
          <div className="relative mx-auto aspect-[4/5] w-full max-w-md">
            <div className="absolute -inset-3 -rotate-2 rounded-[2rem] bg-secondary" />
            <div className="absolute inset-0 overflow-hidden rounded-[2rem] border border-border bg-card shadow-[0_30px_60px_-30px_oklch(0.2_0.05_260/0.45)]">
              <Image
                src="/hero-owl.png"
                alt="Watercolor owl framed in a hand-drawn navy geometric ring — signature artwork of Georgia Perkins Pottery"
                fill
                priority
                sizes="(min-width: 768px) 28rem, 100vw"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
