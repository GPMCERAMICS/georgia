import { v } from "convex/values";
import { query } from "../_generated/server";
import { requireAdmin } from "../lib/adminGuard";
import { computeAvailability } from "../lib/availability";
import { countClaims } from "../lib/claims";
import { SETTLED_STATUSES } from "../lib/pieceShape";
import { MAX_ORDERS } from "./orders";
import { MAX_PIECES } from "./pieces";

const RECENT = 8;

/**
 * The overview numbers. `now` and `monthStart` come from the client so the
 * query stays cacheable and free of wall-clock reads.
 */
export const stats = query({
  args: { now: v.number(), monthStart: v.number() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const [orders, pieces, inquiries] = await Promise.all([
      ctx.db.query("orders").order("desc").take(MAX_ORDERS),
      ctx.db.query("pieces").take(MAX_PIECES),
      ctx.db
        .query("inquiries")
        .withIndex("by_status", (q) => q.eq("status", "new"))
        .take(100),
    ]);

    let revenueMonthCents = 0;
    let ordersMonth = 0;
    let toShip = 0;
    const recent: typeof orders = [];
    for (const order of orders) {
      const settled = SETTLED_STATUSES.has(order.status);
      if (settled && (order.paidAt ?? 0) >= args.monthStart) {
        revenueMonthCents += order.totalCents;
        ordersMonth += 1;
      }
      if (order.status === "paid") toShip += 1;
      if (settled || order.status === "refunded") {
        if (recent.length < RECENT) recent.push(order);
      }
    }

    let published = 0;
    let available = 0;
    let drafts = 0;
    for (const piece of pieces) {
      if (piece.status === "draft") drafts += 1;
      if (piece.status !== "published") continue;
      published += 1;
      const { paidCount, activeHoldCount } = await countClaims(ctx, piece._id, args.now);
      const availability = computeAvailability({
        status: piece.status,
        stock: piece.stock,
        paidCount,
        activeHoldCount,
      });
      if (availability.state === "available") available += 1;
    }

    return {
      revenueMonthCents,
      ordersMonth,
      toShip,
      published,
      available,
      drafts,
      newInquiries: inquiries.length,
      recentOrders: recent.map((order) => ({
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        name: order.name,
        email: order.email,
        totalCents: order.totalCents,
        paidAt: order.paidAt,
      })),
    };
  },
});
