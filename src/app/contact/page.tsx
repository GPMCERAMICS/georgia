import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { BannerStatement, PageBanner } from "@/components/site/page-banner";
import { SiteFooter } from "@/components/site/site-footer";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "About & Contact",
  description:
    "Meet Georgia Perkins-Miller and get in touch with the studio.",
};

const MORE = [
  { href: "/shop", label: "Shop the collection" },
  { href: "/commissions", label: "Commission a piece" },
  { href: "/faq", label: "Questions & answers" },
];

export default function ContactPage() {
  return (
    <>
      <PageBanner image="/banner-about.webp">
        <BannerStatement>{site.tagline}</BannerStatement>
      </PageBanner>

      <main className="flex-1">
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 md:grid-cols-2 md:gap-20 md:py-28">
          <Image
            src="/gpm.webp"
            alt="Georgia Perkins-Miller, the maker behind Georgia Perkins Pottery"
            width={756}
            height={1008}
            sizes="(min-width: 768px) 28rem, 100vw"
            className="mx-auto aspect-[3/4] w-full max-w-md object-cover"
          />
          <div>
            <h1 className="text-balance font-display text-4xl leading-tight md:text-5xl">
              {site.about.heading}
            </h1>
            <div className="mt-6 space-y-5 text-lg leading-relaxed">
              {site.about.body.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-secondary">
          <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 text-center md:grid-cols-2 md:py-24">
            <div>
              <h2 className="font-display text-3xl md:text-4xl">Get in touch</h2>
              <p className="mx-auto mt-5 max-w-sm text-lg leading-relaxed">
                Questions about a piece, an order, or something made just for
                you — Georgia would love to hear from you.
              </p>
            </div>
            <div className="space-y-6 text-xl">
              <div>
                <h3 className="font-medium">Email</h3>
                <a
                  href={`mailto:${site.email}`}
                  className="underline underline-offset-4 hover:no-underline"
                >
                  {site.email}
                </a>
              </div>
              {site.social.facebook && (
                <div>
                  <h3 className="font-medium">Follow</h3>
                  <a
                    href={site.social.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-4 hover:no-underline"
                  >
                    Facebook
                  </a>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="px-6 py-20 text-center md:py-24">
          <h2 className="text-sm uppercase tracking-[0.2em]">More</h2>
          <ul className="mt-8 space-y-3">
            {MORE.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="border-b border-current pb-0.5 font-display text-3xl md:text-4xl"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
