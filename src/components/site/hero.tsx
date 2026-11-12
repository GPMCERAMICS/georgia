import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageBanner } from "./page-banner";

export function Hero() {
  return (
    <PageBanner image="/banner-home.webp" tall>
      <div className="animate-rise mx-auto w-full max-w-[1400px] px-6 pb-16 md:px-10">
        <h1 className="max-w-2xl text-balance font-display text-5xl leading-[1.05] sm:text-6xl md:text-7xl">
          Whimsical Hand Painted Ceramics
        </h1>
        <div className="mt-9 flex flex-wrap items-center gap-3">
          <Button asChild size="lg" className="bg-white px-9 text-foreground hover:bg-white/90">
            <Link href="/shop">Shop Now</Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="border-white bg-transparent px-9 text-white hover:bg-white/15 hover:text-white"
          >
            <Link href="/commissions">Custom Pieces</Link>
          </Button>
        </div>
      </div>
    </PageBanner>
  );
}

/** The one-line statement in a grey band under the hero. */
export function Intro() {
  return (
    <section className="bg-secondary">
      <p className="mx-auto max-w-3xl text-balance px-6 py-20 text-center font-display text-2xl leading-snug md:py-24 md:text-4xl md:leading-snug">
        Each piece is unique and handmade, filling your home and life with
        color, fun and art with attitude.
      </p>
    </section>
  );
}
