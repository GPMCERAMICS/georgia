import type { Metadata } from "next";
import Image from "next/image";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "About & Contact",
  description:
    "Meet Georgia Perkins-Miller and get in touch with the studio.",
};

/**
 * PLACEHOLDER page — a fuller bio and a contact form land here once the
 * client supplies the details.
 */
export default function ContactPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-12 px-6 py-24 md:grid-cols-2">
        <div>
          <p className="mb-5 text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground">
            The maker
          </p>
          <h1 className="text-balance font-display text-4xl leading-tight md:text-5xl">
            {site.about.heading}
          </h1>
          <div className="mt-6 space-y-5 text-lg leading-relaxed text-muted-foreground">
            {site.about.body.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          <p className="mt-8 text-lg">
            Get in touch:{" "}
            <a
              href={`mailto:${site.email}`}
              className="text-primary underline underline-offset-4"
            >
              {site.email}
            </a>
          </p>
        </div>

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
      </main>
      <SiteFooter />
    </>
  );
}
