import type { Metadata } from "next";
import Link from "next/link";
import { BannerStatement, PageBanner } from "@/components/site/page-banner";
import { SiteFooter } from "@/components/site/site-footer";
import { returnsPolicy, site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Shipping & Returns",
  description:
    "How GPM Ceramics ships, what to do if a piece arrives damaged, and how returns and refunds work.",
};

const { windowDays, damageWindowDays, restockingPercent, restockingMinimum } = returnsPolicy;

/**
 * The one place the shipping, damage and returns policy is written down.
 * Everything else on the site (the FAQ, the cart, the piece pages, the
 * emails) gives a line of summary and links here, so there is only ever one
 * version to keep right. The numbers come from `returnsPolicy` in site.ts.
 */
export default function ReturnsPage() {
  const email = (
    <a href={`mailto:${site.email}`} className="underline underline-offset-4 hover:no-underline">
      {site.email}
    </a>
  );

  return (
    <>
      <PageBanner image="/banner-shop.webp">
        <BannerStatement>
          Every piece is packed by hand, insured, and shipped free.
        </BannerStatement>
      </PageBanner>
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16 md:py-24">
        <h1 className="font-display text-4xl leading-tight md:text-5xl">Shipping &amp; Returns</h1>

        <nav aria-label="On this page" className="mt-6 flex flex-wrap gap-x-6 gap-y-1 text-lg">
          <a href="#shipping" className="underline-offset-4 hover:underline">Shipping</a>
          <a href="#damage" className="underline-offset-4 hover:underline">Damaged in transit</a>
          <a href="#returns" className="underline-offset-4 hover:underline">Returns</a>
          <a href="#not-returnable" className="underline-offset-4 hover:underline">What can&apos;t be returned</a>
        </nav>

        <div className="mt-12 space-y-14 text-lg leading-relaxed">
          <section id="shipping" className="scroll-mt-28">
            <h2 className="font-display text-2xl md:text-3xl">Shipping</h2>
            <ul className="mt-4 space-y-3">
              <Point>Shipping is free. The price you see is the price you pay.</Point>
              <Point>
                I ship within the continental US only: the lower 48 states and Washington, DC.
              </Point>
              <Point>
                Every piece is wrapped by hand and double boxed, and every package is insured.
              </Point>
              <Point>
                You will get an email with tracking details as soon as your order ships. Made-to-order
                pieces ship once they are finished; the listing gives the lead time.
              </Point>
              <Point>
                Local pickup in St. Marys, Georgia is free. Choose it in the cart and I will email
                you when your order is ready.
              </Point>
            </ul>
          </section>

          <section id="damage" className="scroll-mt-28">
            <h2 className="font-display text-2xl md:text-3xl">If your piece arrives damaged</h2>
            <p className="mt-4">
              Double boxing prevents most damage, but shipping is not always gentle. If your order
              arrives damaged, email me at {email} within {damageWindowDays} days of delivery and I
              will replace it or refund you in full.
            </p>
            <p className="mt-4">Please send four photos:</p>
            <ol className="mt-3 list-decimal space-y-2 pl-6 marker:text-muted-foreground">
              <li>the outside of the shipping box,</li>
              <li>the inner box,</li>
              <li>the broken piece as it was wrapped, and</li>
              <li>the piece out of its wrapping.</li>
            </ol>
            <p className="mt-4">
              Please keep the boxes, the packing material and the damaged piece until the claim is
              settled. I file the insurance claim myself, and the insurer sometimes asks to see
              them. If I need the piece back, I will send you a prepaid return label.
            </p>
          </section>

          <section id="returns" className="scroll-mt-28">
            <h2 className="font-display text-2xl md:text-3xl">Returns</h2>
            <p className="mt-4">
              I want you to love what you bought. If a piece is not right for you, you can return
              it within {windowDays} days of delivery.
            </p>
            <ul className="mt-4 space-y-3">
              <Point>
                Email {email} before sending anything back, so I know to expect it and can tell you
                where to send it.
              </Point>
              <Point>
                The piece must come back unused and in the condition it arrived, packed as carefully
                as it was sent. The original packaging is the safest way.
              </Point>
              <Point>
                Return shipping is at your cost. If you would like me to arrange the return label, I
                will, and its cost is taken off your refund.
              </Point>
              <Point>
                A restocking fee of {restockingPercent}% of the price of the piece, with a minimum
                of {restockingMinimum}, is taken off your refund. Shipping to you was free; the fee
                goes toward what it cost to pack, insure and send your order.
              </Point>
              <Point>
                Once the piece has arrived and I have checked it, I refund the rest to your original
                payment method and email you a breakdown. Refunds usually appear within 5 to 10
                business days, depending on your bank.
              </Point>
            </ul>
          </section>

          <section id="not-returnable" className="scroll-mt-28">
            <h2 className="font-display text-2xl md:text-3xl">What can&apos;t be returned</h2>
            <ul className="mt-4 space-y-3">
              <Point>
                Commissions and custom pieces. They are made for you alone, and I share progress
                along the way so the finished piece is never a surprise.
              </Point>
              <Point>Made-to-order pieces, which are made after you order.</Point>
              <Point>Pieces that come back used, damaged in return shipping, or after {windowDays} days.</Point>
            </ul>
            <p className="mt-4">
              A piece that arrives damaged is always covered, whatever it is. See{" "}
              <a href="#damage" className="underline underline-offset-4 hover:no-underline">
                damaged in transit
              </a>
              .
            </p>
          </section>
        </div>

        <p className="mt-14 border-t border-border pt-8 text-lg leading-relaxed">
          A question this page does not answer? Write to {email}, or see the{" "}
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

function Point({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span aria-hidden className="mt-3 h-1.5 w-1.5 shrink-0 bg-primary" />
      <span>{children}</span>
    </li>
  );
}
