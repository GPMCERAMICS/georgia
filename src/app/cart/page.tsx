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
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 pb-24 pt-10">
        <h1 className="text-center font-display text-4xl leading-tight md:text-5xl">Your Cart</h1>
        <div className="mt-10">
          <CartCheckout />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
