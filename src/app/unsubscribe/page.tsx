import type { Metadata } from "next";
import { Unsubscribe } from "@/components/site/unsubscribe";
import { SiteHeader } from "@/components/site/site-header";

export const metadata: Metadata = {
  title: "Email preferences",
  robots: { index: false, follow: false },
};

export default async function UnsubscribePage(props: {
  searchParams: Promise<{ t?: string; k?: string }>;
}) {
  const { t, k } = await props.searchParams;
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-xl flex-1 px-6 py-16 md:py-24">
        <Unsubscribe token={t ?? ""} kind={k === "reminders" ? "reminders" : "newsletter"} />
      </main>
    </>
  );
}
