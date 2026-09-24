import type { Doc } from "../_generated/dataModel";

/** The two live sale modes. Legacy `deposit`/`drop` normalise onto these. */
export type SaleMode = "oneoff" | "madeToOrder";

export function normalizeMode(mode: Doc<"pieces">["mode"]): SaleMode {
  switch (mode) {
    case "oneoff":
    case "drop":
      return "oneoff";
    case "madeToOrder":
    case "deposit":
      return "madeToOrder";
  }
}

/** Tag slugs for a piece, falling back to the legacy `collection` field. */
export function pieceTags(
  piece: Pick<Doc<"pieces">, "tags" | "collection">,
): string[] {
  if (piece.tags !== undefined) return piece.tags;
  return piece.collection ? [piece.collection] : [];
}

/** Order statuses whose items permanently consume stock. */
export const SETTLED_STATUSES = new Set<Doc<"orders">["status"]>([
  "paid",
  "shipped",
  "delivered",
]);
