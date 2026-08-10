/**
 * The timestamp to pass to the catalog queries.
 *
 * Convex forbids reading the wall clock inside a query, so callers supply it.
 * Quantising down to the minute means every visitor in the same minute shares
 * one cache entry instead of each minting their own, and a minute of drift is
 * irrelevant against a 30-minute hold.
 */
export function nowForCatalog(): number {
  const MINUTE = 60_000;
  return Math.floor(Date.now() / MINUTE) * MINUTE;
}
