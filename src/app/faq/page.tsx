import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Frequently asked questions about commissions, shipping, and caring for handmade ceramics from Georgia Perkins Pottery.",
};

// PLACEHOLDER answers — believable defaults for a handmade ceramics studio,
// to be replaced with Georgia's real numbers and policies.
const faqs = [
  {
    question: "How long does a custom commission take?",
    answer:
      "Every commissioned piece is thrown, sculpted, and hand painted to order, " +
      "so most commissions ship in 4–6 weeks. More detailed pieces — " +
      "commemorative platters with portraits, lettering, or custom scenes — can " +
      "take 6–8 weeks. You'll get a timeline estimate with your quote before " +
      "any payment is made.",
  },
  {
    question: "How much does shipping cost?",
    answer:
      "Shipping is a flat rate based on the size of the piece: smaller pieces " +
      "like plates ship for $12, and larger platters and sculptural pieces ship " +
      "for $18 within the US. Everything is packed by hand with generous " +
      "padding. Local pickup is always free — choose it at checkout and we'll " +
      "arrange a time.",
  },
  {
    question: "Are the pieces food safe?",
    answer:
      "Yes — dinnerware pieces are glazed with lead-free, food-safe glazes and " +
      "fired to full temperature. Decorative and commemorative platters are " +
      "made to be displayed as much as used; if a particular piece is best kept " +
      "ornamental, its listing will say so.",
  },
  {
    question: "How should I care for my piece?",
    answer:
      "Hand washing is recommended to keep hand-painted details vivid for " +
      "decades. Avoid sudden temperature changes — don't move a piece straight " +
      "from the fridge to a hot oven. Sculptural garden pieces should come " +
      "inside before a hard freeze.",
  },
  {
    question: "Can I return or exchange a piece?",
    answer:
      "If a piece arrives damaged, send a photo within 48 hours and it will be " +
      "replaced or refunded in full. Because commissions are made just for you, " +
      "they aren't returnable — but Georgia shares progress along the way so " +
      "the finished piece is never a surprise.",
  },
  {
    question: "Do you take wholesale or bulk orders?",
    answer:
      "Small-batch orders for weddings, events, and shops are considered on a " +
      "case-by-case basis depending on the studio schedule. Get in touch with " +
      "your date and quantities and we'll see what's possible.",
  },
];

export default function FaqPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-24">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <p className="text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground">
          FAQ
        </p>
        <h1 className="mt-5 text-balance font-display text-4xl leading-tight md:text-5xl">
          Frequently asked questions
        </h1>

        <div className="mt-12 divide-y divide-border border-y border-border">
          {faqs.map((faq) => (
            <details key={faq.question} className="group py-2">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-display text-xl leading-snug [&::-webkit-details-marker]:hidden">
                {faq.question}
                <span
                  aria-hidden
                  className="shrink-0 text-2xl leading-none text-primary transition-transform duration-200 group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="pb-6 leading-relaxed text-muted-foreground">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap items-center gap-4">
          <p className="text-muted-foreground">Still have a question?</p>
          <Button asChild variant="outline" className="rounded-full px-6">
            <Link href={`mailto:${site.email}`}>Email {site.email}</Link>
          </Button>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
