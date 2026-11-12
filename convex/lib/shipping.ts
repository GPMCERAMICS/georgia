export type ShippingMethod = "ship" | "pickup";

/**
 * Shipping is included in every piece's price, so an order never carries a
 * shipping charge — shipped or picked up. Kept as a function, shared by the
 * cart and the reserve mutation, so a future carrier-rate or surcharge has
 * one place to live.
 */
export function computeShippingCents(): number {
  return 0;
}
