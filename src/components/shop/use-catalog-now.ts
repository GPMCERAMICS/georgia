"use client";

import { useSyncExternalStore } from "react";
import { nowForCatalog } from "@/lib/catalog-time";

/**
 * A shared minute clock. One interval for the whole page, and every
 * subscriber re-renders together when the minute rolls over.
 */
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (timer === null) {
    timer = setInterval(() => listeners.forEach((fn) => fn()), 60_000);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };
}

/**
 * The client-side `now` for catalog queries: null during SSR/hydration (the
 * preloaded server value renders), then the current minute, ticking so
 * time-derived availability (expired holds) stays fresh without a refresh.
 */
export function useCatalogNow(): number | null {
  return useSyncExternalStore(subscribe, nowForCatalog, () => null);
}
