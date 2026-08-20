import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { site } from "@/lib/site";

export function About() {
  return (
    <section id="about" className="border-t border-border/60 bg-secondary/40">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 md:grid-cols-2 md:py-28">
        <div className="order-2 md:order-1">
          <div className="mx-auto max-w-md overflow-hidden rounded-2xl border border-border shadow-sm">
            <Image
              src="/gpm.webp"
              alt="Georgia Perkins-Miller, the maker behind Georgia Perkins Pottery"
              width={756}
              height={1008}
              sizes="(min-width: 768px) 28rem, 100vw"
              className="aspect-[3/4] w-full object-cover"
            />
          </div>
        </div>

        <div className="order-1 md:order-2">
          <p className="mb-5 text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground">
            The maker
          </p>
          <h2 className="text-balance font-display text-4xl leading-tight md:text-5xl">
            {site.about.heading}
          </h2>
          <div className="mt-6 space-y-5 text-lg leading-relaxed text-muted-foreground">
            {site.about.body.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="mt-8 rounded-full border-primary/30 bg-transparent px-7"
          >
            <Link href="/contact">Learn more</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
