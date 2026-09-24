"use client";

import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "./cart-provider";

export function CartButton() {
  const { ids, ready, open } = useCart();
  const count = ready ? ids.length : 0;
  return (
    <Button
      variant="ghost"
      size="sm"
      className="relative rounded-full px-3"
      aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`}
      onClick={open}
    >
      <ShoppingBag />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
          {count}
        </span>
      )}
    </Button>
  );
}
