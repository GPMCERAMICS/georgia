import Link from "next/link";
import { site } from "@/lib/site";
import { NewsletterSignup } from "./newsletter-signup";

const SITE_MAP = [
  { href: "/shop", label: "Shop" },
  { href: "/commissions", label: "Commissions" },
  { href: "/contact", label: "About" },
  { href: "/returns", label: "Shipping & Returns" },
  { href: "/care", label: "Care guide" },
  { href: "/faq", label: "FAQ" },
];

// `overflow-wrap: anywhere` lets a long address wrap rather than widen the
// page, but only when it truly does not fit.
const linkClass = "inline-block py-1.5 underline-offset-4 [overflow-wrap:anywhere] hover:underline";

export function SiteFooter() {
  const year = 2026; // static to keep the page fully server-cacheable
  const domain = new URL(site.url).hostname.replace(/^www\./, "");
  const social = [
    { href: site.social.facebook, label: "Facebook" },
    { href: site.social.instagram, label: "Instagram" },
    { href: site.social.pinterest, label: "Pinterest" },
  ].filter((item) => item.href);

  return (
    <div className="mt-auto">
      <NewsletterSignup />
    <footer className="bg-secondary">
      <div className="mx-auto grid max-w-[1400px] gap-12 px-6 py-16 md:px-10 lg:grid-cols-[1fr_2.2fr]">
        <div>
          <p className="font-display text-4xl leading-none">{site.name}</p>
          <p className="mt-4 max-w-xs leading-relaxed">
            Handmade, hand painted ceramics and custom commissions from{" "}
            {site.location.city}, Georgia.
          </p>
        </div>

        <div className="grid gap-10 sm:grid-cols-[1fr_1fr_1.6fr] [&>div]:min-w-0">
          <div>
            <h2 className="text-lg font-medium">Site Map</h2>
            <ul className="mt-2.5">
              {SITE_MAP.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={linkClass}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {social.length > 0 && (
            <div>
              <h2 className="text-lg font-medium">Follow Us</h2>
              <ul className="mt-2.5">
                {social.map((item) => (
                  <li key={item.label}>
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={linkClass}
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <h2 className="text-lg font-medium">Contact Us</h2>
            <ul className="mt-2.5">
              <li>
                <a href={`mailto:${site.email}`} className={linkClass}>
                  {site.email}
                </a>
              </li>
              <li>
                <Link href="/commissions" className={linkClass}>
                  Commission a piece
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-6 pb-10 text-sm md:px-10">
        <span className="font-[system-ui]">&copy;</span> {year} {domain}. Each piece made by hand.
      </div>
    </footer>
    </div>
  );
}
