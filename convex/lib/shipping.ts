import type { Settings } from "../settings";

export type ShippingMethod = "ship" | "pickup";

/**
 * Flat-rate shipping for a whole cart, in cents.
 *
 * One box, priced by the largest piece in it: any platter makes it a platter
 * shipment. A pure function shared by the cart UI (advisory) and the reserve
 * mutation (authoritative), so the two never quote different totals.
 *
 * When live carrier rates arrive this is the one function that changes.
 */
export function computeShippingCents(
  lines: { shippingTier: "plate" | "platter" }[],
  method: ShippingMethod,
  subtotalCents: number,
  rates: Settings["shipping"],
): number {
  if (method === "pickup") return 0;
  if (lines.length === 0) return 0;
  if (rates.freeOverCents !== null && subtotalCents >= rates.freeOverCents) {
    return 0;
  }
  const hasPlatter = lines.some((line) => line.shippingTier === "platter");
  return hasPlatter ? rates.platterCents : rates.plateCents;
}
