import Link from "next/link";
import { Menu } from "lucide-react";
import { CartButton } from "@/components/shop/cart-button";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";

const NAV = [
  { href: "/shop", label: "Shop" },
  { href: "/commissions", label: "Commissions" },
  { href: "/contact", label: "About" },
];

/**
 * Links left, wordmark centred, cart right.
 *
 * `overlay` is for pages that open with a photo banner: the header sits on
 * top of the image in white instead of taking its own white strip.
 */
export function SiteHeader({ overlay = false }: { overlay?: boolean }) {
  return (
    <header
      className={cn(
        "relative z-40 w-full",
        overlay ? "text-white" : "bg-background text-foreground",
      )}
    >
      <div className="mx-auto grid h-20 max-w-[1400px] grid-cols-[1fr_auto_1fr] items-center gap-4 px-6 md:h-24 md:px-10">
        <div className="flex items-center">
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

          {/* Mobile: a native disclosure, so the menu needs no client code. */}
          <details className="group relative md:hidden">
            <summary
              className="flex cursor-pointer list-none items-center [&::-webkit-details-marker]:hidden"
              aria-label="Menu"
            >
              <Menu className="size-6" />
            </summary>
            <nav
              className="absolute left-0 top-full z-50 mt-3 flex w-56 flex-col border border-border bg-background py-2 text-foreground shadow-lg"
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

        <Link href="/" className="flex items-center gap-2.5" aria-label="Georgia Perkins Pottery, home">
          <Logo className={cn("h-8 w-auto md:h-9", !overlay && "text-primary")} />
          <span className="font-display text-xl leading-none md:text-2xl">
            Georgia Perkins
          </span>
        </Link>

        <div className="flex justify-end">
          <CartButton />
        </div>
      </div>
    </header>
  );
}
