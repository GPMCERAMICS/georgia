import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { SETTLED_STATUSES } from "./pieceShape";

/**
 * Convex forbids unbounded `.collect()`. A single piece can never legitimately
 * accumulate more claims than a generous batch, so we bound the read and treat
 * exceeding it as sold out rather than silently undercounting.
 */
const MAX_CLAIMS_PER_PIECE = 256;

/**
 * Counts the order items that consume a piece's stock: settled sales, plus
 * checkouts that are still live. An expired pending hold counts for nothing.
 *
 * Shared by the public catalog (advisory display) and the reserve mutation
 * (authoritative check), so the two can never disagree about the rule.
 */
export async function countClaims(
  ctx: QueryCtx | MutationCtx,
  pieceId: Id<"pieces">,
  now: number,
) {
  const items = await ctx.db
    .query("orderItems")
    .withIndex("by_pieceId", (q) => q.eq("pieceId", pieceId))
    .take(MAX_CLAIMS_PER_PIECE);

  let paidCount = 0;
  let activeHoldCount = 0;
  for (const item of items) {
    if (SETTLED_STATUSES.has(item.orderStatus)) {
      paidCount += 1;
    } else if (item.orderStatus === "pending" && item.expiresAt > now) {
      activeHoldCount += 1;
    }
  }
  return { paidCount, activeHoldCount };
}
