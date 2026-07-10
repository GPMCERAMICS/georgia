import Image from "next/image";
import { site } from "@/lib/site";

export function About() {
  return (
    <section id="about" className="border-t border-border/60 bg-secondary/40">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 md:grid-cols-2 md:py-28">
        <div className="order-2 md:order-1">
          <div className="grid grid-cols-2 gap-4">
            <div className="mt-8 overflow-hidden rounded-2xl border border-border shadow-sm">
              <Image
                src="/bio-1.png"
                alt="The hand-painted maker's mark on the back of a Georgia Perkins plate"
                width={540}
                height={675}
                sizes="(min-width: 768px) 16rem, 45vw"
                className="aspect-[3/4] w-full object-cover"
              />
            </div>
            <div className="overflow-hidden rounded-2xl border border-border shadow-sm">
              <Image
                src="/bio-2.png"
                alt="A hand-painted plate signed on the reverse, resting on a spiral-decorated dish"
                width={540}
                height={675}
                sizes="(min-width: 768px) 16rem, 45vw"
                className="aspect-[3/4] w-full object-cover"
              />
            </div>
          </div>
        </div>

        <div className="order-1 md:order-2">
          <p className="mb-5 flex items-center gap-3 text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground">
            <span className="h-px w-8 rule-clay" />
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
        </div>
      </div>
    </section>
  );
}
