import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { returnsPolicy, site } from "@/lib/site";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Frequently asked questions about commissions, shipping, and caring for handmade ceramics from GPM Ceramics.",
};

// PLACEHOLDER answers — believable defaults for a handmade ceramics studio,
// to be replaced with Georgia's real numbers and policies.
const faqs: { question: string; answer: string; more?: { href: string; label: string } }[] = [
  {
    question: "How long does a custom commission take?",
    answer:
      "I throw, sculpt, and hand paint every commissioned piece to order, " +
      "so most commissions ship in 4–6 weeks. More detailed pieces — " +
      "commemorative platters with portraits, lettering, or custom scenes — can " +
      "take 6–8 weeks. You'll get a timeline estimate with your quote before " +
      "any payment is made.",
  },
  {
    question: "How much does shipping cost?",
    answer:
      "Shipping is free on every piece — the price you see is the price " +
      "you pay. I ship within the continental US only (the " +
      "lower 48 states and DC). I pack everything by hand with generous " +
      "padding. Local pickup is also available — choose it at checkout and " +
      "I'll email you to arrange a time.",
    more: { href: "/returns", label: "More about shipping" },
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
      `Yes. Pieces can be returned within ${returnsPolicy.windowDays} days of delivery; ` +
      `return shipping is at your cost and a ${returnsPolicy.restockingPercent}% restocking fee ` +
      `(minimum ${returnsPolicy.restockingMinimum}) is taken off the refund. Commissions and ` +
      "made-to-order pieces can't be returned. If a piece arrives damaged, tell me within " +
      `${returnsPolicy.damageWindowDays} days and I will replace it or refund you in full.`,
    more: { href: "/returns", label: "Read the full Shipping & Returns policy" },
  },
  {
    question: "Do you take wholesale or bulk orders?",
    answer:
      "I consider small-batch orders for weddings, events, and shops on a " +
      "case-by-case basis depending on my studio schedule. Get in touch with " +
      "your date and quantities and I'll see what's possible.",
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
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 pb-24 pt-10">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <h1 className="text-balance text-center font-display text-4xl leading-tight md:text-5xl">
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
              <p className="pb-6 text-lg leading-relaxed">
                {faq.answer}
                {faq.more && (
                  <>
                    {" "}
                    <Link href={faq.more.href} className="underline underline-offset-4 hover:no-underline">
                      {faq.more.label}
                    </Link>
                    .
                  </>
                )}
              </p>
            </details>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
          <p className="text-muted-foreground">Still have a question?</p>
          <Button asChild variant="outline" size="lg" className="px-6">
            <Link href={`mailto:${site.email}`}>Email {site.email}</Link>
          </Button>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
