import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "./logo";

// Root-relative, not bare fragments: the header now renders on /shop too,
// where "#work" would point at an anchor that isn't on the page.
const NAV = [
  { href: "/#work", label: "Work" },
  { href: "/#about", label: "About" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/#top" className="flex items-center gap-2.5">
          <Logo className="h-9 w-auto text-primary" />
          <span className="font-display text-lg leading-none tracking-tight">
            Georgia Perkins
            <span className="block text-[0.65rem] font-sans uppercase tracking-[0.28em] text-muted-foreground">
              Pottery
            </span>
          </span>
        </Link>

        {/* Nav and CTA share one right-hand group, so the links sit beside the
            button rather than floating in the middle of the bar. */}
        <div className="flex items-center gap-8">
          <nav className="hidden items-center gap-8 md:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <Button asChild size="sm" className="rounded-full px-5">
            <Link href="/shop">Shop</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
