import type { Metadata } from "next";
import Link from "next/link";
import { BannerStatement, PageBanner } from "@/components/site/page-banner";
import { SiteFooter } from "@/components/site/site-footer";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Care guide",
  description:
    "How to wash, use and look after hand painted ceramics from GPM Ceramics, indoors and out.",
};

// One guide for every piece, linked from the "delivered" email. General on
// purpose: anything specific to a single piece is on its own listing.
const sections = [
  {
    heading: "Washing",
    points: [
      "Hand washing with warm water and mild dish soap keeps hand painted details at their brightest for decades.",
      "Pieces marked dishwasher safe on their listing can go in the dishwasher; the top rack is gentlest.",
      "Skip abrasive scrubbers and scouring powders, which can dull a glaze over time.",
    ],
  },
  {
    heading: "Everyday use",
    points: [
      "Pieces marked food safe are glazed with lead-free, food-safe glazes and are made to be used.",
      "Avoid sudden changes in temperature. Do not take a piece straight from the fridge to a hot oven, or pour boiling water into a cold one.",
      "Unless a listing says otherwise, keep pieces out of the microwave and off direct heat such as a stovetop or broiler.",
      "Metal cutlery can leave grey marks on a glaze. They are surface marks and usually lift with a little baking soda paste.",
    ],
  },
  {
    heading: "Display and wall pieces",
    points: [
      "Use a plate hanger or stand rated for the weight of the piece, and check it now and then.",
      "Dust with a soft, dry cloth. A damp cloth is fine for anything more.",
      "Colors are fired into the glaze and will not fade in ordinary indoor light.",
    ],
  },
  {
    heading: "Garden pieces and totems",
    points: [
      "Ceramic is happy outdoors in rain and sun through most of the year.",
      "Bring pieces inside before a hard freeze. Water that gets in and freezes can crack them.",
      "Totems are built on a steel rod and base. Set them on firm, level ground and check they are steady after strong wind.",
      "Rinse with a garden hose or wipe with a damp cloth to clear pollen and dust.",
    ],
  },
  {
    heading: "Chips, cracks and accidents",
    points: [
      "A small chip on a decorative piece can often be touched up. A cracked piece should be retired from food use.",
      "If something arrives damaged, email a photo within 48 hours and it will be replaced or refunded.",
    ],
  },
];

export default function CarePage() {
  return (
    <>
      <PageBanner image="/banner-about.webp">
        <BannerStatement>A little care keeps handmade ceramics bright for decades.</BannerStatement>
      </PageBanner>
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16 md:py-24">
        <h1 className="font-display text-4xl leading-tight md:text-5xl">Care guide</h1>
        <p className="mt-5 text-lg leading-relaxed">
          Every piece is made and painted by hand, then fired to full temperature, so it is
          sturdier than it looks. These few habits will keep yours looking the way it did the
          day it arrived.
        </p>

        <div className="mt-12 space-y-12">
          {sections.map((section) => (
            <section key={section.heading}>
              <h2 className="font-display text-2xl md:text-3xl">{section.heading}</h2>
              <ul className="mt-4 space-y-3 text-lg leading-relaxed">
                {section.points.map((point) => (
                  <li key={point} className="flex gap-3">
                    <span aria-hidden className="mt-3 h-1.5 w-1.5 shrink-0 bg-primary" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <p className="mt-14 border-t border-border pt-8 text-lg leading-relaxed">
          A question about a particular piece?{" "}
          <a href={`mailto:${site.email}`} className="underline underline-offset-4 hover:no-underline">
            {site.email}
          </a>
          , or see the{" "}
          <Link href="/faq" className="underline underline-offset-4 hover:no-underline">
            FAQ
          </Link>
          .
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
