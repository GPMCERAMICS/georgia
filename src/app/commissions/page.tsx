import type { Metadata } from "next";
import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { CommissionForm } from "@/components/site/commission-form";
import { SiteFooter } from "@/components/site/site-footer";
import { BannerStatement, PageBanner } from "@/components/site/page-banner";
import { nowForCatalog } from "@/lib/catalog-time";
import { commission, site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Commissions",
  description:
    "Commission a handmade, hand painted ceramic piece from Georgia Perkins — weddings, homes, anniversaries, and milestones.",
};

export default async function CommissionsPage(props: {
  searchParams: Promise<{ piece?: string }>;
}) {
  const { piece: slug } = await props.searchParams;
  const piece = slug
    ? await fetchQuery(api.pieces.getBySlug, { slug, now: nowForCatalog() })
    : null;

  return (
    <>
      <PageBanner image="/banner-commissions.webp">
        <BannerStatement>{commission.heading}</BannerStatement>
      </PageBanner>
      <main className="mx-auto grid w-full max-w-6xl flex-1 gap-12 px-6 py-20 md:grid-cols-[0.85fr_1.15fr] md:py-24">
        <div className="md:pt-2">
          <h1 className="font-display text-4xl leading-tight md:text-5xl">Commissions</h1>
          <p className="mt-5 text-lg leading-relaxed">
            {commission.body}
          </p>
          <ul className="mt-6 space-y-2 text-lg">
            {commission.occasions.map((occasion) => (
              <li key={occasion} className="flex items-center gap-3">
                <span aria-hidden className="h-1.5 w-1.5 bg-primary" />
                {occasion}
              </li>
            ))}
          </ul>
          <p className="mt-8">
            Prefer email?{" "}
            <a href={`mailto:${site.email}`} className="text-primary underline underline-offset-4">
              {site.email}
            </a>
          </p>
        </div>

        <CommissionForm piece={piece ? { id: piece._id, title: piece.title } : null} />
      </main>
      <SiteFooter />
    </>
  );
}
