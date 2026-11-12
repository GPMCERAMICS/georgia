"use client";

import { ShoppingCart } from "lucide-react";
import { useCart } from "./cart-provider";

/** Cart icon with a count chip on its bottom-right corner. */
export function CartButton() {
  const { ids, ready, open } = useCart();
  const count = ready ? ids.length : 0;
  return (
    <button
      type="button"
      className="relative flex size-10 items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-current"
      aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`}
      onClick={open}
    >
      <ShoppingCart className="size-6" />
      {count > 0 && (
        <span
          aria-hidden
          className="chip absolute -bottom-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center bg-primary px-1 text-xs font-medium text-primary-foreground ring-2 ring-background"
        >
          {count}
        </span>
      )}
    </button>
  );
}
