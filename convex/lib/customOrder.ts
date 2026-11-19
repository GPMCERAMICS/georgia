/**
 * The sums behind a custom order's invoice. Pure, and shared by the
 * dashboard, the customer's invoice page, the emails and the Stripe
 * checkout, so every one of them shows the same numbers.
 */

export type CustomOrderMoney = {
  items: { description: string; amountCents: number }[];
  shippingCents: number | null;
  pickup: boolean;
  depositCents: number;
  depositPaidAt: number | null;
  balancePaidAt: number | null;
};

export function customOrderTotals(order: CustomOrderMoney) {
  const subtotalCents = order.items.reduce((sum, item) => sum + item.amountCents, 0);
  const shippingCents = order.pickup ? 0 : (order.shippingCents ?? 0);
  // Shipping still to be quoted: the total so far is not yet the final total.
  const shippingPending = !order.pickup && order.shippingCents === null;
  const totalCents = subtotalCents + shippingCents;
  const depositCents = Math.min(order.depositCents, subtotalCents);
  const depositPaid = order.depositPaidAt !== null;
  const balancePaid = order.balancePaidAt !== null;
  const paidCents = (depositPaid ? depositCents : 0) + (balancePaid ? totalCents - depositCents : 0);
  return {
    subtotalCents,
    shippingCents,
    shippingPending,
    totalCents,
    depositCents,
    /** What the final payment comes to: everything not covered by the deposit. */
    balanceCents: totalCents - depositCents,
    paidCents,
    dueCents: totalCents - paidCents,
  };
}

/** Which payment, if any, the customer can make right now. */
export function payableStage(
  status: string,
): "deposit" | "balance" | null {
  if (status === "depositDue") return "deposit";
  if (status === "balanceDue") return "balance";
  return null;
}

/** Stripe will not take a card payment smaller than this. */
export const MIN_CHARGE_CENTS = 50;
