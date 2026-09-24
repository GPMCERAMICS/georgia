import type { Metadata } from "next";
import { CartCheckout } from "@/components/shop/cart-checkout";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";

export const metadata: Metadata = {
  title: "Cart",
  robots: { index: false, follow: false },
};

export default function CartPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-16 md:py-24">
        <p className="text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground">Cart</p>
        <h1 className="mt-5 font-display text-4xl leading-tight md:text-5xl">Your pieces</h1>
        <div className="mt-10">
          <CartCheckout />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
