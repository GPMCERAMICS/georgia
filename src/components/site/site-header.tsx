"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { CartButton } from "@/components/shop/cart-button";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";

const NAV = [
  { href: "/shop", label: "Shop" },
  { href: "/commissions", label: "Commissions" },
  { href: "/contact", label: "About" },
];

/**
 * Logo left; links and the cart together on the right. Always pinned to the
 * top of the window.
 *
 * `overlay` is for pages that open with a full-width photo: the header
 * starts transparent with white text on top of the image, then turns white
 * with dark text once the page is scrolled. Everywhere else it is white
 * with dark text from the start.
 */
export function SiteHeader({ overlay = false }: { overlay?: boolean }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 8);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  const transparent = overlay && !scrolled;

  return (
    <header
      className={cn(
        "top-0 z-40 w-full border-b transition-colors duration-300",
        // Over a photo the header floats on the image; otherwise it keeps
        // its own strip of the page.
        overlay ? "fixed inset-x-0" : "sticky",
        transparent
          ? "border-transparent bg-transparent text-white"
          : "bg-background text-foreground",
        !transparent && (scrolled ? "border-border" : "border-transparent"),
      )}
    >
      <div className="mx-auto flex h-20 max-w-[1400px] items-center justify-between gap-6 px-6 md:h-24 md:px-10">
        <Link href="/" className="flex items-center gap-2.5" aria-label={`${site.name}, home`}>
          <Logo className={cn("h-8 w-auto transition-colors duration-300 md:h-9", !transparent && "text-primary")} />
          <span className="font-display text-xl leading-none md:text-2xl">
            {site.name}
          </span>
        </Link>

        <div className="flex items-center gap-5 md:gap-7">
          <nav className="hidden items-center gap-7 md:flex" aria-label="Main">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="border-b border-transparent pb-0.5 text-lg transition-colors hover:border-current"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <CartButton />

          {/* Mobile: a native disclosure does the opening and closing. */}
          <details className="group relative md:hidden">
            <summary
              className="flex size-10 cursor-pointer list-none items-center justify-center [&::-webkit-details-marker]:hidden"
              aria-label="Menu"
            >
              <Menu className="size-6" />
            </summary>
            <nav
              className="absolute right-0 top-full z-50 mt-3 flex w-56 flex-col border border-border bg-background py-2 text-foreground shadow-lg"
              aria-label="Main"
            >
              {NAV.map((item) => (
                <Link key={item.href} href={item.href} className="px-5 py-3 text-lg">
                  {item.label}
                </Link>
              ))}
              <Link href="/faq" className="px-5 py-3 text-lg">
                FAQ
              </Link>
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
