import Link from "next/link";
import { site } from "@/lib/site";
import { Logo } from "./logo";

export function SiteFooter() {
  const year = 2026; // static to keep the page fully server-cacheable

  return (
    <footer className="mt-auto border-t border-border/60">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-14 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Logo className="h-12 w-auto text-primary" />
            <div>
              <p className="font-display text-2xl leading-none">Georgia Perkins</p>
              <p className="mt-1 text-sm uppercase tracking-[0.28em] text-muted-foreground">
                Pottery
              </p>
            </div>
          </div>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
            Handmade artisanal ceramics &mdash; plates, garden pieces, and custom
            commissions from {site.location.city}, {site.location.region}.
          </p>
        </div>

        <div className="flex flex-col gap-3 text-sm">
          <a
            href={`mailto:${site.email}`}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            {site.email}
          </a>
          <div className="flex gap-5">
            {site.social.instagram && (
              <a
                href={site.social.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                Instagram
              </a>
            )}
            {site.social.pinterest && (
              <a
                href={site.social.pinterest}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                Pinterest
              </a>
            )}
          </div>
          <Link
            href="/#commission"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Commission a piece
          </Link>
          <Link
            href="/faq"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            FAQ
          </Link>
        </div>
      </div>

      <div className="border-t border-border/60">
        <div className="mx-auto max-w-6xl px-6 py-5 text-xs text-muted-foreground">
          &copy; {year} {site.name}. Each piece made by hand.
        </div>
      </div>
    </footer>
  );
}
