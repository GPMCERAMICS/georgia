import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { site } from "@/lib/site";

export function About() {
  return (
    <section id="about" className="bg-secondary">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 md:grid-cols-2 md:py-28">
        <div className="order-2 md:order-1">
          <div className="mx-auto max-w-md overflow-hidden">
            <Image
              src="/gpm.webp"
              alt="Georgia Perkins-Miller, the maker behind GPM Ceramics"
              width={756}
              height={1008}
              sizes="(min-width: 768px) 28rem, 100vw"
              className="aspect-[3/4] w-full object-cover"
            />
          </div>
        </div>

        <div className="order-1 md:order-2">
          <h2 className="text-balance font-display text-4xl leading-tight md:text-5xl">
            {site.about.heading}
          </h2>
          <div className="mt-6 space-y-5 text-lg leading-relaxed">
            {site.about.body.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          <Button asChild size="lg" className="mt-8 px-9">
            <Link href="/contact">Learn More</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
