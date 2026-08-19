"use client";

import { useEffect, useState } from "react";
import { nowForCatalog } from "@/lib/catalog-time";

/**
 * The client-side `now` for catalog queries: null during SSR/hydration (the
 * preloaded server value renders), then the current minute, ticking so
 * time-derived availability (drop releases, expired holds) stays fresh
 * without a refresh.
 */
export function useCatalogNow(): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(nowForCatalog());
    const tick = setInterval(() => setNow(nowForCatalog()), 60_000);
    return () => clearInterval(tick);
  }, []);
  return now;
}
