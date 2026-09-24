import type { Metadata } from "next";
import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { CommissionForm } from "@/components/site/commission-form";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
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
      <SiteHeader />
      <main className="mx-auto grid w-full max-w-6xl flex-1 gap-12 px-6 py-24 md:grid-cols-[0.85fr_1.15fr]">
        <div className="md:pt-2">
          <p className="mb-5 text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground">
            {commission.eyebrow}
          </p>
          <h1 className="text-balance font-display text-4xl leading-tight md:text-5xl">
            {commission.heading}
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            {commission.body}
          </p>
          <ul className="mt-6 space-y-2 text-lg text-muted-foreground">
            {commission.occasions.map((occasion) => (
              <li key={occasion} className="flex items-center gap-3">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-primary" />
                {occasion}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-muted-foreground">
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
