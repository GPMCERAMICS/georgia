import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";

export const metadata: Metadata = {
  title: "Shop",
  description: "Handmade pottery available to buy from Georgia Perkins.",
  // Nothing to index until the catalog is live.
  robots: { index: false, follow: true },
};

/**
 * Placeholder so the header's Shop button is not a 404.
 *
 * The real grid reads the Convex catalog and lands with checkout in plan 2.
 */
export default function ShopPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-start px-6 py-24">
        <p className="text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground">
          Shop
        </p>
        <h1 className="mt-5 text-balance font-display text-4xl leading-tight md:text-5xl">
          Pieces are on their way
        </h1>
        <p className="mt-4 max-w-prose text-muted-foreground">
          Georgia is photographing and listing her available work now. In the
          meantime, commissions are open.
        </p>
        <Button asChild className="mt-8 rounded-full px-5">
          <Link href="/#commission">Commission a piece</Link>
        </Button>
      </main>
      <SiteFooter />
    </>
  );
}
