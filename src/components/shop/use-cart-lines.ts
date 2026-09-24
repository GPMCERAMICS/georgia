"use client";

import { useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { PublicPiece } from "@convex/pieces";
import { useCart } from "./cart-provider";
import { useCatalogNow } from "./use-catalog-now";

/**
 * The cart's ids hydrated into live pieces. Ids that no longer resolve to a
 * published piece are pruned from storage, so a cart heals itself.
 *
 * Returns `undefined` while loading.
 */
export function useCartLines(): PublicPiece[] | undefined {
  const { ids, ready, remove } = useCart();
  const now = useCatalogNow();
  const lines = useQuery(
    api.pieces.listByIds,
    !ready || now === null ? "skip" : { ids, now },
  );

  useEffect(() => {
    if (!lines) return;
    const live = new Set(lines.map((piece) => piece._id));
    for (const id of ids) if (!live.has(id)) remove(id);
  }, [lines, ids, remove]);

  if (!ready) return [];
  if (ready && ids.length === 0) return [];
  return lines;
}
