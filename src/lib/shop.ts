import type { PublicPiece } from "@convex/pieces";

export const formatPrice = (cents: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    // Whole-dollar prices read cleaner on cards; cents appear only when real.
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);

export const releaseDateLabel = (ms: number) =>
  new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(ms);

export const collectionLabel: Record<PublicPiece["collection"], string> = {
  wildlife: "Wildlife",
  heirloom: "Heirloom",
};

/**
 * The one line under a price that says whether — and how — a piece can be
 * bought. Shared by the shop card and the detail page so they can never
 * disagree.
 */
export function availabilityLine(piece: PublicPiece): string {
  switch (piece.availability.state) {
    case "sold":
      return "Sold";
    case "unreleased":
      return `Drops ${releaseDateLabel(piece.availability.releaseAt)}`;
    case "available":
      if (piece.mode === "madeToOrder") {
        return piece.leadTimeWeeks
          ? `Made to order — ships in ~${piece.leadTimeWeeks} week${piece.leadTimeWeeks === 1 ? "" : "s"}`
          : "Made to order";
      }
      if (piece.mode === "deposit") return "Commission deposit";
      if (piece.availability.remaining !== null && piece.availability.remaining <= 3) {
        return piece.availability.remaining === 1
          ? "Last one"
          : `Only ${piece.availability.remaining} left`;
      }
      return "Available";
    case "hidden":
      return "";
  }
}

/** Deterministic placeholder silhouette for pieces without photos yet. */
export function placeholderShape(slug: string): 0 | 1 | 2 | 3 {
  let hash = 0;
  for (const ch of slug) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return (Math.abs(hash) % 4) as 0 | 1 | 2 | 3;
}
