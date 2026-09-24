import type { Metadata } from "next";
import { OrderConfirmation } from "@/components/shop/order-confirmation";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";

export const metadata: Metadata = {
  title: "Thank you",
  robots: { index: false, follow: false },
};

export default async function CheckoutSuccessPage(props: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id: sessionId } = await props.searchParams;
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16 md:py-24">
        <OrderConfirmation sessionId={sessionId ?? null} />
      </main>
      <SiteFooter />
    </>
  );
}
