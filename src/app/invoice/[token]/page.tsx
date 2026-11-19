import type { Metadata } from "next";
import { InvoiceView } from "@/components/shop/invoice-view";
import { SiteHeader } from "@/components/site/site-header";

export const metadata: Metadata = {
  title: "Your invoice",
  // A private link: it should never turn up in a search.
  robots: { index: false, follow: false },
};

export default async function InvoicePage(props: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ paid?: string }>;
}) {
  const { token } = await props.params;
  const { paid } = await props.searchParams;
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 pb-24 pt-8">
        <InvoiceView token={token} justPaid={paid === "deposit" || paid === "balance"} />
      </main>
    </>
  );
}
