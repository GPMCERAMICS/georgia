import Link from "next/link";
import { Button } from "@/components/ui/button";

const NAV = [
  { href: "#work", label: "Work" },
  { href: "#about", label: "About" },
  { href: "#commission", label: "Commission" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link
          href="#top"
          className="font-display text-lg leading-none tracking-tight"
        >
          Georgia Perkins
          <span className="block text-[0.65rem] font-sans uppercase tracking-[0.28em] text-muted-foreground">
            Pottery
          </span>
        </Link>

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
          <Link href="#commission">Commission a piece</Link>
        </Button>
      </div>
    </header>
  );
}
