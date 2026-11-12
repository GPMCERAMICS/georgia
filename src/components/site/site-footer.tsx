import Link from "next/link";
import { site } from "@/lib/site";

const SITE_MAP = [
  { href: "/shop", label: "Shop" },
  { href: "/commissions", label: "Commissions" },
  { href: "/contact", label: "About" },
  { href: "/faq", label: "FAQ" },
];

const linkClass = "underline underline-offset-4 hover:no-underline";

export function SiteFooter() {
  const year = 2026; // static to keep the page fully server-cacheable
  const domain = new URL(site.url).hostname.replace(/^www\./, "");
  const social = [
    { href: site.social.facebook, label: "Facebook" },
    { href: site.social.instagram, label: "Instagram" },
    { href: site.social.pinterest, label: "Pinterest" },
  ].filter((item) => item.href);

  return (
    <footer className="mt-auto bg-secondary">
      <div className="mx-auto grid max-w-[1400px] gap-12 px-6 py-16 md:grid-cols-[1.2fr_2fr] md:px-10">
        <div>
          <p className="font-display text-4xl leading-none">{site.name}</p>
          <p className="mt-4 max-w-xs leading-relaxed">
            Handmade, hand painted ceramics and custom commissions from{" "}
            {site.location.city}, Georgia.
          </p>
        </div>

        <div className="grid gap-10 sm:grid-cols-3">
          <div>
            <h2 className="text-lg font-medium">Site Map</h2>
            <ul className="mt-4 space-y-1.5">
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
              <ul className="mt-4 space-y-1.5">
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
            <ul className="mt-4 space-y-1.5">
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
  );
}
