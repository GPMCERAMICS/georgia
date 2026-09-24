import { query } from "../_generated/server";
import { requireAdmin } from "../lib/adminGuard";
import { SETTLED_STATUSES } from "../lib/pieceShape";
import { MAX_ORDERS } from "./orders";

export type Customer = {
  email: string;
  name: string | null;
  orderCount: number;
  totalCents: number;
  lastOrderAt: number;
  city: string | null;
};

/**
 * There is no customers table: a customer is whoever has paid at least once,
 * derived from orders. When accounts or marketing lists arrive, that is the
 * moment to give them a table of their own.
 */
export const list = query({
  args: {},
  handler: async (ctx): Promise<Customer[]> => {
    await requireAdmin(ctx);
    const orders = await ctx.db.query("orders").order("desc").take(MAX_ORDERS);
    const byEmail = new Map<string, Customer>();
    for (const order of orders) {
      if (!order.email || !SETTLED_STATUSES.has(order.status)) continue;
      const key = order.email.toLowerCase();
      const existing = byEmail.get(key);
      if (existing) {
        existing.orderCount += 1;
        existing.totalCents += order.totalCents;
        existing.name ??= order.name;
      } else {
        byEmail.set(key, {
          email: key,
          name: order.name,
          orderCount: 1,
          totalCents: order.totalCents,
          lastOrderAt: order.paidAt ?? order._creationTime,
          city: order.shippingAddress?.city ?? null,
        });
      }
    }
    return [...byEmail.values()].sort((a, b) => b.lastOrderAt - a.lastOrderAt);
  },
});
