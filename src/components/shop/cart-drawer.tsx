"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlaceholderVessel } from "@/components/site/placeholder-vessel";
import { formatPrice, placeholderShape } from "@/lib/shop";
import { cn } from "@/lib/utils";
import { useCart } from "./cart-provider";
import { useCartLines } from "./use-cart-lines";

/**
 * Slide-over summary shown after "Add to cart". Checkout itself lives on
 * /cart, which has room for the shipping choice.
 */
export function CartDrawer() {
  const { isOpen, close, remove } = useCart();
  const lines = useCartLines();

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, close]);

  const subtotal = (lines ?? [])
    .filter((piece) => piece.availability.state === "available")
    .reduce((sum, piece) => sum + piece.priceCents, 0);

  return (
    <div
      aria-hidden={!isOpen}
      className={cn(
        "fixed inset-0 z-[60] transition-opacity",
        isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
      )}
    >
      <button
        type="button"
        aria-label="Close cart"
        onClick={close}
        className="absolute inset-0 bg-foreground/30 backdrop-blur-[2px]"
      />
      <aside
        role="dialog"
        aria-label="Your cart"
        className={cn(
          "absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-background shadow-2xl transition-transform duration-300",
          isOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        <header className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-display text-2xl">Your cart</h2>
          <Button variant="ghost" size="icon" onClick={close} aria-label="Close">
            <X />
          </Button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {lines === undefined ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : lines.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing here yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {lines.map((piece) => {
                const sold = piece.availability.state !== "available";
                const held = piece.availability.state === "held";
                return (
                  <li key={piece._id} className="flex gap-4 py-4">
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-border bg-card">
                      {piece.imageUrls[0] ? (
                        <Image src={piece.imageUrls[0]} alt="" fill sizes="80px" className="object-cover" />
                      ) : (
                        <PlaceholderVessel shape={placeholderShape(piece.slug)} label={piece.title} className="h-full w-full" />
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <Link href={`/shop/${piece.slug}`} onClick={close} className="font-display text-lg leading-snug hover:underline">
                        {piece.title}
                      </Link>
                      <span className={cn("text-sm", sold ? "text-destructive" : "text-muted-foreground")}>
                        {held
                          ? "On hold in another checkout"
                          : sold
                            ? "Just sold — remove to continue"
                            : formatPrice(piece.priceCents)}
                      </span>
                      <button
                        type="button"
                        onClick={() => remove(piece._id)}
                        className="mt-auto w-fit text-xs text-muted-foreground underline"
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <footer className="border-t border-border px-6 py-4">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">Subtotal</span>
            <span className="font-display text-xl">{formatPrice(subtotal)}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Shipping and tax are calculated at checkout.</p>
          <Button asChild className="mt-4 w-full rounded-full" disabled={!lines || lines.length === 0}>
            <Link href="/cart" onClick={close}>
              Review and check out
            </Link>
          </Button>
        </footer>
      </aside>
    </div>
  );
}
