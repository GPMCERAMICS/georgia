"use client";

import { ConvexAuthNextjsProvider } from "@convex-dev/auth/nextjs";
import type { ReactNode } from "react";
import { convex } from "@/app/ConvexClientProvider";

/**
 * Auth-aware Convex provider, mounted only under /admin.
 *
 * Reuses the single site-wide ConvexReactClient so nesting this inside the
 * public ConvexProvider does not open a second websocket.
 */
export function AdminConvexProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexAuthNextjsProvider client={convex}>
      {children}
    </ConvexAuthNextjsProvider>
  );
}
