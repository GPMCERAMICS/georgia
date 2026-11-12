"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAction, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "@convex/_generated/api";
import { HOLD_MINUTES } from "@convex/lib/hold";
import {
  CONTIGUOUS_STATES,
  SHIPPING_AREA_MESSAGE,
  checkShipTo,
  type ShipTo,
} from "@convex/lib/destination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { PlaceholderVessel } from "@/components/site/placeholder-vessel";
import { availabilityLine, formatPrice, placeholderShape } from "@/lib/shop";
import { cn } from "@/lib/utils";
import { useCart } from "./cart-provider";
import { useCartLines } from "./use-cart-lines";

type Method = "ship" | "pickup";
type ShipToForm = { name: string; line1: string; line2: string; city: string; state: string; postalCode: string };

const EMPTY_SHIP_TO: ShipToForm = { name: "", line1: "", line2: "", city: "", state: "", postalCode: "" };
const SHIP_TO_KEY = "gpm-ship-to";

/**
 * The /cart page body: lines, delivery choice, shipping address, and the
 * hand-off to Stripe. The address is checked here for a quick answer and
 * again by the reserve mutation, which is the check that counts.
 */
export function CartCheckout() {
  const { remove, clear } = useCart();
  const lines = useCartLines();
  const options = useQuery(api.settings.shippingOptions);
  const start = useAction(api.checkout.start);
  const cancel = useAction(api.checkout.cancel);
  const [method, setMethod] = useState<Method>("ship");
  const [starting, setStarting] = useState(false);
  // Coming back from Stripe's cancel link should not mean retyping the
  // address. Safe to read during render: the form only appears once the cart
  // has loaded in the browser, never in the server-rendered HTML.
  const [shipTo, setShipTo] = useState<ShipToForm>(() => {
    if (typeof window === "undefined") return EMPTY_SHIP_TO;
    try {
      const saved = window.sessionStorage.getItem(SHIP_TO_KEY);
      return saved
        ? { ...EMPTY_SHIP_TO, ...(JSON.parse(saved) as Partial<ShipToForm>) }
        : EMPTY_SHIP_TO;
    } catch {
      return EMPTY_SHIP_TO;
    }
  });
  const [addressError, setAddressError] = useState<string | null>(null);

  // Stripe's back link lands here with the abandoned order; free its pieces
  // now rather than at the end of the hold. Read from `window` rather than
  // useSearchParams so the page can stay static.
  useEffect(() => {
    const url = new URL(window.location.href);
    const orderId = url.searchParams.get("cancelled");
    if (!orderId) return;
    url.searchParams.delete("cancelled");
    window.history.replaceState(null, "", url);
    void cancel({ orderId }).catch(() => {
      // The scheduled release still frees the pieces at the hold deadline.
    });
  }, [cancel]);

  if (lines === undefined || options === undefined) {
    return <p className="text-muted-foreground">Loading your cart…</p>;
  }

  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-start">
        <p className="text-muted-foreground">Your cart is empty.</p>
        <Button asChild size="lg" className="mt-6 px-6">
          <Link href="/shop">Browse available work</Link>
        </Button>
      </div>
    );
  }

  const available = lines.filter((piece) => piece.availability.state === "available");
  const blocked = lines.length - available.length;
  const subtotal = available.reduce((sum, piece) => sum + piece.priceCents, 0);
  const pickupAllowed = options.pickup.enabled;
  const effectiveMethod: Method = pickupAllowed ? method : "ship";

  const field =
    (key: keyof ShipToForm) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setAddressError(null);
      setShipTo((current) => ({ ...current, [key]: event.target.value }));
    };

  async function handleCheckout() {
    let destination: ShipTo | undefined;
    if (effectiveMethod === "ship") {
      const checked = checkShipTo({ ...shipTo, line2: shipTo.line2 || null });
      if (!checked.ok) {
        setAddressError(checked.error);
        return;
      }
      destination = checked.shipTo;
      try {
        window.sessionStorage.setItem(SHIP_TO_KEY, JSON.stringify(shipTo));
      } catch {
        // Remembering the address is a convenience only.
      }
    }
    setStarting(true);
    try {
      const { url } = await start({
        pieceIds: available.map((piece) => piece._id),
        shippingMethod: effectiveMethod,
        shipTo: destination,
      });
      window.location.assign(url);
    } catch (error) {
      setStarting(false);
      toast.error(
        error instanceof Error && error.message
          ? error.message.replace(/^.*Uncaught Error: /, "").split("\n")[0]
          : "Could not start checkout. Please try again.",
      );
    }
  }

  return (
    <div className="grid gap-10 md:grid-cols-[1fr_360px]">
      <ul className="divide-y divide-border">
        {lines.map((piece) => {
          const sold = piece.availability.state !== "available";
          const held = piece.availability.state === "held";
          return (
            <li key={piece._id} className="flex gap-5 py-5">
              <div className="relative h-28 w-28 shrink-0 overflow-hidden border border-border bg-card">
                {piece.imageUrls[0] ? (
                  <Image src={piece.imageUrls[0]} alt="" fill sizes="112px" className="object-cover" />
                ) : (
                  <PlaceholderVessel shape={placeholderShape(piece.slug)} label={piece.title} className="h-full w-full" />
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-baseline justify-between gap-4">
                  <Link href={`/shop/${piece.slug}`} className="font-display text-xl leading-snug hover:underline">
                    {piece.title}
                  </Link>
                  <span className={cn("font-display text-lg", sold && "text-muted-foreground line-through")}>
                    {formatPrice(piece.priceCents)}
                  </span>
                </div>
                {piece.size && (
                  <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{piece.size}</p>
                )}
                <p className={cn("mt-2 text-sm", sold ? "text-destructive" : "text-muted-foreground")}>
                  {held
                    ? `Someone else is checking out with this piece. It comes back within ${HOLD_MINUTES} minutes if they don't buy it.`
                    : sold
                      ? "This piece just sold. Remove it to continue."
                      : availabilityLine(piece)}
                </p>
                <button
                  type="button"
                  onClick={() => remove(piece._id)}
                  className="mt-auto w-fit text-sm text-muted-foreground underline"
                >
                  Remove
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <aside className="h-fit border border-border bg-card p-6">
        <h2 className="font-display text-2xl">Delivery</h2>
        <div className="mt-4 flex flex-col gap-2">
          <label
            className={cn(
              "flex cursor-pointer items-start gap-3 border p-3 transition-colors",
              effectiveMethod === "ship" ? "border-primary bg-primary/5" : "border-border",
            )}
          >
            <input
              type="radio"
              name="method"
              className="mt-1"
              checked={effectiveMethod === "ship"}
              onChange={() => setMethod("ship")}
            />
            <span className="flex flex-1 flex-col">
              <span className="text-sm font-medium">Ship it</span>
              <span className="text-xs text-muted-foreground">
                Packed by hand and insured. Continental US only.
              </span>
            </span>
            <span className="text-sm">Included</span>
          </label>
          {pickupAllowed && (
            <label
              className={cn(
                "flex cursor-pointer items-start gap-3 border p-3 transition-colors",
                effectiveMethod === "pickup" ? "border-primary bg-primary/5" : "border-border",
              )}
            >
              <input
                type="radio"
                name="method"
                className="mt-1"
                checked={effectiveMethod === "pickup"}
                onChange={() => setMethod("pickup")}
              />
              <span className="flex flex-1 flex-col">
                <span className="text-sm font-medium">{options.pickup.label}</span>
                <span className="text-xs text-muted-foreground">{options.pickup.instructions}</span>
              </span>
              <span className="text-sm">Free</span>
            </label>
          )}
        </div>

        {effectiveMethod === "ship" && (
          <fieldset className="mt-6 grid gap-3">
            <legend className="font-display text-lg">Ship to</legend>
            <p className="-mt-1 text-xs text-muted-foreground">{SHIPPING_AREA_MESSAGE}</p>
            <div className="grid gap-1.5">
              <Label htmlFor="ship-name">Full name</Label>
              <Input id="ship-name" autoComplete="name" value={shipTo.name} onChange={field("name")} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ship-line1">Street address</Label>
              <Input id="ship-line1" autoComplete="address-line1" value={shipTo.line1} onChange={field("line1")} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ship-line2">Apartment, suite (optional)</Label>
              <Input id="ship-line2" autoComplete="address-line2" value={shipTo.line2} onChange={field("line2")} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ship-city">City</Label>
              <Input id="ship-city" autoComplete="address-level2" value={shipTo.city} onChange={field("city")} />
            </div>
            <div className="grid grid-cols-[1fr_7rem] gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="ship-state">State</Label>
                <NativeSelect id="ship-state" autoComplete="address-level1" value={shipTo.state} onChange={field("state")}>
                  <option value="">Choose…</option>
                  {CONTIGUOUS_STATES.map(([code, name]) => (
                    <option key={code} value={code}>
                      {name}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="ship-zip">ZIP</Label>
                <Input id="ship-zip" inputMode="numeric" autoComplete="postal-code" value={shipTo.postalCode} onChange={field("postalCode")} />
              </div>
            </div>
            {addressError && (
              <p role="alert" className="text-sm text-destructive">
                {addressError}
              </p>
            )}
          </fieldset>
        )}

        <dl className="mt-6 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd>{formatPrice(subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Shipping</dt>
            <dd>{effectiveMethod === "pickup" ? "Free pickup" : "Included"}</dd>
          </div>
          <div className="flex justify-between border-t border-border pt-2 font-display text-lg">
            <dt>Total</dt>
            <dd>{formatPrice(subtotal)}</dd>
          </div>
        </dl>
        <p className="mt-2 text-xs text-muted-foreground">Any sales tax is added at checkout.</p>

        <Button
          size="lg"
          className="mt-6 w-full"
          disabled={starting || available.length === 0 || blocked > 0}
          onClick={() => void handleCheckout()}
        >
          {starting ? "Taking you to checkout…" : "Check out"}
        </Button>
        {blocked > 0 && (
          <p className="mt-2 text-xs text-destructive">
            Remove the unavailable piece{blocked === 1 ? "" : "s"} to continue.
          </p>
        )}
        <button
          type="button"
          onClick={clear}
          className="mt-4 w-full text-center text-xs text-muted-foreground underline"
        >
          Empty cart
        </button>
        <p className="mt-4 text-xs text-muted-foreground">
          Your pieces are held for {HOLD_MINUTES} minutes once you start checkout. Payment is handled securely by Stripe.
        </p>
      </aside>
    </div>
  );
}
