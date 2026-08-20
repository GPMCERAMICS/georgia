import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { commission } from "@/lib/site";

/**
 * Homepage commissions block — marketing only. The inquiry form itself lives
 * on /commissions.
 */
export function Commission() {
  return (
    <section
      id="commission"
      className="scroll-mt-20 border-t border-border/60 bg-secondary/40"
    >
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 md:grid-cols-[1.1fr_0.9fr] md:py-28">
        <div>
          <p className="mb-5 text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground">
            {commission.eyebrow}
          </p>
          <h2 className="text-balance font-display text-4xl leading-tight md:text-5xl">
            {commission.heading}
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            {commission.body}
          </p>
          <ul className="mt-6 space-y-2 text-lg text-muted-foreground">
            {commission.occasions.map((occasion) => (
              <li key={occasion} className="flex items-center gap-3">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-primary" />
                {occasion}
              </li>
            ))}
          </ul>
          <Button asChild size="lg" className="mt-8 rounded-full px-7">
            <Link href="/commissions">Commission a piece</Link>
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {commission.gallery.map((image, i) => (
            <div
              key={image.src}
              className={`overflow-hidden rounded-2xl border border-border shadow-sm ${i % 2 === 0 ? "mt-8" : ""}`}
            >
              <Image
                src={image.src}
                alt={image.alt}
                width={540}
                height={540}
                sizes="(min-width: 768px) 16rem, 45vw"
                className="aspect-square w-full object-cover"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
