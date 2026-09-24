/**
 * Commercial state of a piece, derived — never stored.
 *
 * `status` on the piece is editorial (what Georgia controls). Whether a piece
 * is sold or held is computed from stock and live order items. Storing it in
 * both places guarantees they eventually disagree.
 */
export type Availability =
  | { state: "hidden" }
  | { state: "sold" }
  | { state: "available"; remaining: number | null };

export type AvailabilityInput = {
  status: "draft" | "published" | "archived";
  /** null means unlimited — made-to-order pieces. */
  stock: number | null;
  /** Items on orders that are paid, shipped, or delivered. */
  paidCount: number;
  /** Items on pending orders whose hold has not yet expired. */
  activeHoldCount: number;
};

export function computeAvailability(input: AvailabilityInput): Availability {
  if (input.status !== "published") {
    return { state: "hidden" };
  }

  if (input.stock === null) {
    return { state: "available", remaining: null };
  }

  const remaining = input.stock - input.paidCount - input.activeHoldCount;
  return remaining > 0 ? { state: "available", remaining } : { state: "sold" };
}
