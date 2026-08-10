"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";

/**
 * Site-wide Convex client for anonymous reads (the shop, in Plan 2).
 *
 * Deliberately NOT ConvexAuthNextjsProvider: that requires
 * ConvexAuthNextjsServerProvider above it, which reads cookies and would opt
 * the entire site — including the static marketing homepage — into dynamic
 * rendering. Admin routes get the auth-aware provider from
 * src/app/admin/layout.tsx instead.
 */
export const convex = new ConvexReactClient(
  process.env.NEXT_PUBLIC_CONVEX_URL!,
);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
