/**
 * Commercial state of a piece, derived — never stored.
 *
 * `status` on the piece is editorial (what Georgia controls). Whether a piece
 * is sold, held, or not yet released is computed from stock, releaseAt, and
 * live orders. Storing it in both places guarantees they eventually disagree.
 */
export type Availability =
  | { state: "hidden" }
  | { state: "unreleased"; releaseAt: number }
  | { state: "sold" }
  | { state: "available"; remaining: number | null };

export type AvailabilityInput = {
  status: "draft" | "published" | "archived";
  /** null means unlimited — made-to-order pieces and commission deposits. */
  stock: number | null;
  releaseAt: number | null;
  /** Orders with status "paid" or "fulfilled". */
  paidCount: number;
  /** Orders with status "pending" whose expiresAt is still in the future. */
  activeHoldCount: number;
  now: number;
};

export function computeAvailability(input: AvailabilityInput): Availability {
  if (input.status !== "published") {
    return { state: "hidden" };
  }

  if (input.releaseAt !== null && input.now < input.releaseAt) {
    return { state: "unreleased", releaseAt: input.releaseAt };
  }

  if (input.stock === null) {
    return { state: "available", remaining: null };
  }

  const remaining = input.stock - input.paidCount - input.activeHoldCount;
  return remaining > 0 ? { state: "available", remaining } : { state: "sold" };
}
