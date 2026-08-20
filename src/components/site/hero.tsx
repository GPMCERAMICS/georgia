import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HeroSwirls } from "./hero-swirls";

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-16 md:grid-cols-[1.1fr_0.9fr] md:pb-28 md:pt-24">
        {/* Copy */}
        <div className="animate-rise relative z-10">
          <p className="mb-5 text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground">
            Handmade ceramics
          </p>
          <h1 className="text-balance font-display text-5xl leading-[0.98] tracking-tight sm:text-6xl md:text-7xl">
            Whimsical Hand Painted{" "}
            <em className="text-primary not-italic">Ceramics</em>
          </h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-muted-foreground">
            Each piece is Unique and Handmade. Filling your home and life with
            color, fun and art with attitude
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="rounded-full px-7">
              <Link href="/shop">Shop now</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="rounded-full border-primary/30 bg-transparent px-7"
            >
              <Link href="#commission">Custom pieces</Link>
            </Button>
          </div>
        </div>

        {/* Art */}
        <div className="animate-rise [animation-delay:120ms]">
          <div className="mx-auto w-full max-w-md">
            <Image
              src="/crabbie.webp"
              alt="Watercolor crab plate — signature artwork of Georgia Perkins Pottery"
              width={1080}
              height={1080}
              priority
              sizes="(min-width: 768px) 28rem, 100vw"
              className="h-auto w-full -rotate-[33deg] md:scale-[2]"
            />
          </div>
        </div>
      </div>

      <HeroSwirls />
    </section>
  );
}
