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
      className="scroll-mt-20"
    >
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 md:grid-cols-[1.1fr_0.9fr] md:py-28">
        <div>
          <h2 className="text-balance font-display text-4xl leading-tight md:text-5xl">
            {commission.heading}
          </h2>
          <p className="mt-5 text-lg leading-relaxed">
            {commission.body}
          </p>
          <ul className="mt-6 space-y-2 text-lg">
            {commission.occasions.map((occasion) => (
              <li key={occasion} className="flex items-center gap-3">
                <span aria-hidden className="h-1.5 w-1.5 bg-primary" />
                {occasion}
              </li>
            ))}
          </ul>
          <Button asChild size="lg" className="mt-8 px-9">
            <Link href="/commissions">Commission a piece</Link>
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {commission.gallery.map((image) => (
            <div
              key={image.src}
              className="aspect-square overflow-hidden"
            >
              <Image
                src={image.src}
                alt={image.alt}
                width={540}
                height={540}
                sizes="(min-width: 768px) 16rem, 45vw"
                className="h-full w-full object-cover"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
