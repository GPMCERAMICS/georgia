"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { Id } from "@convex/_generated/dataModel";

/**
 * The cart is a list of piece ids in the browser. Nothing else: prices,
 * titles, and availability are always read live from Convex so a cart can
 * never quote a stale price or hold a piece that has since sold.
 *
 * Storage is exposed as an external store so React reads it only after
 * hydration (the server snapshot is always empty) and so two tabs stay in
 * sync through the `storage` event.
 */
const STORAGE_KEY = "gpm-cart";
const MAX_LINES = 20;
const EMPTY: Id<"pieces">[] = [];

let cached: Id<"pieces">[] | null = null;
const listeners = new Set<() => void>();

function readStored(): Id<"pieces">[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY;
    return parsed.filter((x): x is Id<"pieces"> => typeof x === "string").slice(0, MAX_LINES);
  } catch {
    return EMPTY;
  }
}

function getSnapshot(): Id<"pieces">[] {
  if (cached === null) cached = readStored();
  return cached;
}

function emit() {
  listeners.forEach((fn) => fn());
}

function write(ids: Id<"pieces">[]) {
  cached = ids;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Private mode or quota: the in-memory cart still works for this visit.
  }
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      cached = null;
      emit();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

type CartContextValue = {
  ids: Id<"pieces">[];
  /** False during SSR and hydration, when the cart necessarily renders empty. */
  ready: boolean;
  has: (id: Id<"pieces">) => boolean;
  add: (id: Id<"pieces">) => void;
  remove: (id: Id<"pieces">) => void;
  clear: () => void;
  isOpen: boolean;
  open: () => void;
  close: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const ids = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
  const ready = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [isOpen, setOpen] = useState(false);

  const remove = useCallback((id: Id<"pieces">) => {
    write(getSnapshot().filter((x) => x !== id));
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      ids,
      ready,
      has: (id) => ids.includes(id),
      add: (id) => {
        const current = getSnapshot();
        if (current.includes(id) || current.length >= MAX_LINES) return;
        write([...current, id]);
      },
      remove,
      clear: () => write(EMPTY),
      isOpen,
      open: () => setOpen(true),
      close: () => setOpen(false),
    }),
    [ids, ready, isOpen, remove],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
